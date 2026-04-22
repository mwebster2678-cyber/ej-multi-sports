-- Add extended stat columns to league_members
alter table league_members add column if not exists sets_won int default 0;
alter table league_members add column if not exists sets_lost int default 0;
alter table league_members add column if not exists games_won int default 0;
alter table league_members add column if not exists games_lost int default 0;

-- Update insert trigger to parse score and update extended stats
create or replace function public.update_stats_on_insert()
returns trigger as $$
declare
  set_scores text[];
  set_score text;
  w_games int;
  l_games int;
  w_rank int;
  l_rank int;
  total_w_sets int := 0;
  total_l_sets int := 0;
  total_w_games int := 0;
  total_l_games int := 0;
begin
  -- Parse score string e.g. "6-3, 4-6, 7-5"
  if new.score is not null and new.score != '' then
    set_scores := string_to_array(new.score, ', ');
    foreach set_score in array set_scores loop
      begin
        w_games := split_part(set_score, '-', 1)::int;
        l_games := split_part(set_score, '-', 2)::int;
        if w_games > l_games then total_w_sets := total_w_sets + 1;
        elsif l_games > w_games then total_l_sets := total_l_sets + 1;
        end if;
        total_w_games := total_w_games + w_games;
        total_l_games := total_l_games + l_games;
      exception when others then
        -- skip malformed set scores
      end;
    end loop;
  end if;

  -- Update winner stats
  update league_members
    set wins = wins + 1,
        sets_won = sets_won + total_w_sets,
        sets_lost = sets_lost + total_l_sets,
        games_won = games_won + total_w_games,
        games_lost = games_lost + total_l_games
    where user_id = new.winner_id and league_id = new.league_id;

  -- Update loser stats
  update league_members
    set losses = losses + 1,
        sets_won = sets_won + total_l_sets,
        sets_lost = sets_lost + total_w_sets,
        games_won = games_won + total_l_games,
        games_lost = games_lost + total_w_games
    where user_id = new.loser_id and league_id = new.league_id;

  -- Swap ranks if winner was ranked below loser
  select rank into w_rank from league_members where user_id = new.winner_id and league_id = new.league_id;
  select rank into l_rank from league_members where user_id = new.loser_id and league_id = new.league_id;
  if w_rank > l_rank then
    update league_members set rank = l_rank where user_id = new.winner_id and league_id = new.league_id;
    update league_members set rank = w_rank where user_id = new.loser_id and league_id = new.league_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Update dispute reversal trigger to also reverse extended stats
create or replace function public.reverse_stats_on_dispute()
returns trigger as $$
declare
  set_scores text[];
  set_score text;
  w_games int;
  l_games int;
  w_rank int;
  l_rank int;
  total_w_sets int := 0;
  total_l_sets int := 0;
  total_w_games int := 0;
  total_l_games int := 0;
begin
  if new.status = 'disputed' and old.status = 'confirmed' then
    if new.score is not null and new.score != '' then
      set_scores := string_to_array(new.score, ', ');
      foreach set_score in array set_scores loop
        begin
          w_games := split_part(set_score, '-', 1)::int;
          l_games := split_part(set_score, '-', 2)::int;
          if w_games > l_games then total_w_sets := total_w_sets + 1;
          elsif l_games > w_games then total_l_sets := total_l_sets + 1;
          end if;
          total_w_games := total_w_games + w_games;
          total_l_games := total_l_games + l_games;
        exception when others then end;
      end loop;
    end if;

    update league_members
      set wins = greatest(wins - 1, 0),
          sets_won = greatest(sets_won - total_w_sets, 0),
          sets_lost = greatest(sets_lost - total_l_sets, 0),
          games_won = greatest(games_won - total_w_games, 0),
          games_lost = greatest(games_lost - total_l_games, 0)
      where user_id = new.winner_id and league_id = new.league_id;

    update league_members
      set losses = greatest(losses - 1, 0),
          sets_won = greatest(sets_won - total_l_sets, 0),
          sets_lost = greatest(sets_lost - total_w_sets, 0),
          games_won = greatest(games_won - total_l_games, 0),
          games_lost = greatest(games_lost - total_w_games, 0)
      where user_id = new.loser_id and league_id = new.league_id;

    -- Swap ranks back if winner is now ranked above loser
    select rank into w_rank from league_members where user_id = new.winner_id and league_id = new.league_id;
    select rank into l_rank from league_members where user_id = new.loser_id and league_id = new.league_id;
    if w_rank < l_rank then
      update league_members set rank = l_rank where user_id = new.winner_id and league_id = new.league_id;
      update league_members set rank = w_rank where user_id = new.loser_id and league_id = new.league_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Backfill sets_won and sets_lost from existing confirmed matches
-- Score string is always winner-first (enforced by ScoreCard component)
do $$
declare
  m record;
  set_scores text[];
  set_score text;
  first_num int;
  second_num int;
  winner_games int;
  loser_games int;
  total_w_sets int;
  total_l_sets int;
begin
  update league_members set sets_won = 0, sets_lost = 0;

  for m in select * from matches where status = 'confirmed' loop
    total_w_sets := 0;
    total_l_sets := 0;

    if m.score is not null and m.score != '' then
      set_scores := string_to_array(m.score, ', ');
      foreach set_score in array set_scores loop
        begin
          first_num  := split_part(set_score, '-', 1)::int;
          second_num := split_part(set_score, '-', 2)::int;

          -- If reporter is the winner score is winner-loser, else swap
          if m.reported_by = m.winner_id then
            winner_games := first_num; loser_games := second_num;
          else
            winner_games := second_num; loser_games := first_num;
          end if;

          if winner_games > loser_games then total_w_sets := total_w_sets + 1;
          elsif loser_games > winner_games then total_l_sets := total_l_sets + 1;
          end if;
        exception when others then end;
      end loop;
    end if;

    update league_members
      set sets_won = sets_won + total_w_sets, sets_lost = sets_lost + total_l_sets
      where user_id = m.winner_id and league_id = m.league_id;

    update league_members
      set sets_won = sets_won + total_l_sets, sets_lost = sets_lost + total_w_sets
      where user_id = m.loser_id and league_id = m.league_id;
  end loop;
end $$;
