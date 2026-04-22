-- Reset games stats
update league_members set games_won = 0, games_lost = 0;

-- Backfill from existing confirmed matches
do $$
declare
  m record;
  set_scores text[];
  set_score text;
  first_num int;
  second_num int;
  winner_games int;
  loser_games int;
  total_w_games int;
  total_l_games int;
begin
  for m in select * from matches where status = 'confirmed' loop
    total_w_games := 0;
    total_l_games := 0;

    if m.score is not null and m.score != '' then
      set_scores := string_to_array(m.score, ', ');
      foreach set_score in array set_scores loop
        begin
          first_num  := split_part(set_score, '-', 1)::int;
          second_num := split_part(set_score, '-', 2)::int;

          if m.reported_by = m.winner_id then
            winner_games := first_num; loser_games := second_num;
          else
            winner_games := second_num; loser_games := first_num;
          end if;

          total_w_games := total_w_games + winner_games;
          total_l_games := total_l_games + loser_games;
        exception when others then end;
      end loop;
    end if;

    update league_members
      set games_won = games_won + total_w_games, games_lost = games_lost + total_l_games
      where user_id = m.winner_id and league_id = m.league_id;

    update league_members
      set games_won = games_won + total_l_games, games_lost = games_lost + total_w_games
      where user_id = m.loser_id and league_id = m.league_id;
  end loop;
end $$;
