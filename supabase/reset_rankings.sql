-- Reassign clean sequential ranks for all leagues
-- Order: wins DESC, sets_won DESC, games_won DESC, joined_at ASC (earliest joiner wins tiebreak)

WITH ranked AS (
  SELECT user_id, league_id,
    ROW_NUMBER() OVER (
      PARTITION BY league_id
      ORDER BY wins DESC, sets_won DESC, games_won DESC, joined_at ASC
    ) AS new_rank
  FROM league_members
  WHERE status = 'active'
)
UPDATE league_members lm
SET rank = r.new_rank
FROM ranked r
WHERE lm.user_id = r.user_id AND lm.league_id = r.league_id;
