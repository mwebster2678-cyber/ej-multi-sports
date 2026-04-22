-- Reverse ALL stats (including games) and rank swaps when a confirmed match is deleted.
-- Scores are stored winner-first, so first number = winner's games.

CREATE OR REPLACE FUNCTION public.reverse_stats_on_delete()
RETURNS trigger AS $$
DECLARE
  set_scores    text[];
  set_score     text;
  clean_score   text;
  is_tiebreak   boolean;
  first_num     int;
  second_num    int;
  total_w_sets  int := 0;
  total_l_sets  int := 0;
  total_w_games int := 0;
  total_l_games int := 0;
  w_rank        int;
  l_rank        int;
BEGIN
  IF old.status != 'confirmed' THEN
    RETURN old;
  END IF;

  -- Parse score
  IF old.score IS NOT NULL AND old.score != '' THEN
    set_scores := string_to_array(old.score, ', ');
    FOREACH set_score IN ARRAY set_scores LOOP
      BEGIN
        is_tiebreak := set_score LIKE '[%]';
        clean_score := trim(both '[]' from set_score);
        first_num   := split_part(clean_score, '-', 1)::int;
        second_num  := split_part(clean_score, '-', 2)::int;

        IF first_num > second_num THEN total_w_sets := total_w_sets + 1;
        ELSIF second_num > first_num THEN total_l_sets := total_l_sets + 1;
        END IF;

        IF NOT is_tiebreak THEN
          total_w_games := total_w_games + first_num;
          total_l_games := total_l_games + second_num;
        END IF;
      EXCEPTION WHEN others THEN END;
    END LOOP;
  END IF;

  -- Reverse winner's stats
  UPDATE league_members
    SET wins       = GREATEST(0, wins       - 1),
        sets_won   = GREATEST(0, sets_won   - total_w_sets),
        sets_lost  = GREATEST(0, sets_lost  - total_l_sets),
        games_won  = GREATEST(0, games_won  - total_w_games),
        games_lost = GREATEST(0, games_lost - total_l_games)
    WHERE user_id = old.winner_id AND league_id = old.league_id;

  -- Reverse loser's stats
  UPDATE league_members
    SET losses     = GREATEST(0, losses     - 1),
        sets_won   = GREATEST(0, sets_won   - total_l_sets),
        sets_lost  = GREATEST(0, sets_lost  - total_w_sets),
        games_won  = GREATEST(0, games_won  - total_l_games),
        games_lost = GREATEST(0, games_lost - total_w_games)
    WHERE user_id = old.loser_id AND league_id = old.league_id;

  -- Reverse rank swap: if winner is currently ranked above loser, swap back
  SELECT rank INTO w_rank FROM league_members WHERE user_id = old.winner_id AND league_id = old.league_id;
  SELECT rank INTO l_rank FROM league_members WHERE user_id = old.loser_id  AND league_id = old.league_id;

  IF w_rank < l_rank THEN
    UPDATE league_members SET rank = l_rank WHERE user_id = old.winner_id AND league_id = old.league_id;
    UPDATE league_members SET rank = w_rank WHERE user_id = old.loser_id  AND league_id = old.league_id;
  END IF;

  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_deleted ON matches;

CREATE TRIGGER on_match_deleted
  BEFORE DELETE ON matches
  FOR EACH ROW EXECUTE PROCEDURE public.reverse_stats_on_delete();
