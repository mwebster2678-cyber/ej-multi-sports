-- Fix dispute stats flow:
-- Stats should remain applied when a match is disputed (result stands until admin decides).
-- Overturning (deleting) a disputed match correctly reverses all stats.

-- 0. Allow admins to delete matches (required for overturn to work)
CREATE POLICY "Admin can delete any match" ON matches FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 1. Remove the trigger that reverses stats on dispute
DROP TRIGGER IF EXISTS on_match_disputed ON matches;

-- 2. Only apply stats when confirming from pending_confirmation
--    (not from disputed → confirmed, since stats are already applied)
CREATE OR REPLACE FUNCTION public.update_stats_on_confirm()
RETURNS trigger AS $$
DECLARE
  w_rank int;
  l_rank int;
BEGIN
  IF new.status = 'confirmed' AND old.status = 'pending_confirmation' THEN
    UPDATE league_members SET wins = wins + 1
      WHERE user_id = new.winner_id AND league_id = new.league_id;
    UPDATE league_members SET losses = losses + 1
      WHERE user_id = new.loser_id AND league_id = new.league_id;

    SELECT rank INTO w_rank FROM league_members WHERE user_id = new.winner_id AND league_id = new.league_id;
    SELECT rank INTO l_rank FROM league_members WHERE user_id = new.loser_id AND league_id = new.league_id;

    IF w_rank > l_rank THEN
      UPDATE league_members SET rank = l_rank WHERE user_id = new.winner_id AND league_id = new.league_id;
      UPDATE league_members SET rank = w_rank WHERE user_id = new.loser_id AND league_id = new.league_id;
    END IF;
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reverse stats on delete for both confirmed AND disputed matches
--    (disputed = stats still applied, so deletion must reverse them)
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
  IF old.status NOT IN ('confirmed', 'disputed') THEN
    RETURN old;
  END IF;

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

  UPDATE league_members
    SET wins       = GREATEST(0, wins       - 1),
        sets_won   = GREATEST(0, sets_won   - total_w_sets),
        sets_lost  = GREATEST(0, sets_lost  - total_l_sets),
        games_won  = GREATEST(0, games_won  - total_w_games),
        games_lost = GREATEST(0, games_lost - total_l_games)
    WHERE user_id = old.winner_id AND league_id = old.league_id;

  UPDATE league_members
    SET losses     = GREATEST(0, losses     - 1),
        sets_won   = GREATEST(0, sets_won   - total_l_sets),
        sets_lost  = GREATEST(0, sets_lost  - total_w_sets),
        games_won  = GREATEST(0, games_won  - total_l_games),
        games_lost = GREATEST(0, games_lost - total_w_games)
    WHERE user_id = old.loser_id AND league_id = old.league_id;

  SELECT rank INTO w_rank FROM league_members WHERE user_id = old.winner_id AND league_id = old.league_id;
  SELECT rank INTO l_rank FROM league_members WHERE user_id = old.loser_id  AND league_id = old.league_id;

  IF w_rank < l_rank THEN
    UPDATE league_members SET rank = l_rank WHERE user_id = old.winner_id AND league_id = old.league_id;
    UPDATE league_members SET rank = w_rank WHERE user_id = old.loser_id  AND league_id = old.league_id;
  END IF;

  RETURN old;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
