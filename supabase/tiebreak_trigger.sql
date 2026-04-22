-- Update trigger to skip match tiebreak sets (stored as [10-1]) for games stats
create or replace function public.update_stats_on_insert()
returns trigger as $$
declare
  set_scores text[];
  set_score text;
  clean_score text;
  is_tiebreak boolean;
  first_num int;
  second_num int;
  winner_games int;
  loser_games int;
  w_rank int;
  l_rank int;
  total_w_sets int := 0;
  total_l_sets int := 0;
  total_w_games int := 0;
  total_l_games int := 0;
begin
  if new.score is not null and new.score != '' then
    set_scores := string_to_array(new.score, ', ');
    foreach set_score in array set_scores loop
      begin
        -- Tiebreak sets are wrapped in brackets e.g. [10-1]
        is_tiebreak := set_score like '[%]';
        clean_score := trim(both '[]' from set_score);

        first_num  := split_part(clean_score, '-', 1)::int;
        second_num := split_part(clean_score, '-', 2)::int;

        -- Score is always winner-first
        winner_games := first_num;
        loser_games  := second_num;

        if winner_games > loser_games then total_w_sets := total_w_sets + 1;
        elsif loser_games > winner_games then total_l_sets := total_l_sets + 1;
        end if;

        -- Only count games for non-tiebreak sets
        if not is_tiebreak then
          total_w_games := total_w_games + winner_games;
          total_l_games := total_l_games + loser_games;
        end if;
      exception when others then end;
    end loop;
  end if;

  update league_members
    set wins = wins + 1,
        sets_won   = sets_won   + total_w_sets,
        sets_lost  = sets_lost  + total_l_sets,
        games_won  = games_won  + total_w_games,
        games_lost = games_lost + total_l_games
    where user_id = new.winner_id and league_id = new.league_id;

  update league_members
    set losses = losses + 1,
        sets_won   = sets_won   + total_l_sets,
        sets_lost  = sets_lost  + total_w_sets,
        games_won  = games_won  + total_l_games,
        games_lost = games_lost + total_w_games
    where user_id = new.loser_id and league_id = new.league_id;

  select rank into w_rank from league_members where user_id = new.winner_id and league_id = new.league_id;
  select rank into l_rank from league_members where user_id = new.loser_id and league_id = new.league_id;
  if w_rank > l_rank then
    update league_members set rank = l_rank where user_id = new.winner_id and league_id = new.league_id;
    update league_members set rank = w_rank where user_id = new.loser_id and league_id = new.league_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;
