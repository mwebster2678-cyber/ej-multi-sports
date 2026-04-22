-- Reset everyone
update league_members set sets_won = 0, sets_lost = 0;

-- Your correct stats (2 sets won in match 1, lost set 2 of match 1 + both in match 2)
update league_members set sets_won = 2, sets_lost = 3
where user_id = '6994403b-3087-457f-88e5-39a103bebdb6' and league_id = 1;

-- Sarah's correct stats (won both sets in match 2)
update league_members set sets_won = 2, sets_lost = 0
where user_id = '00000001-0000-0000-0000-000000000002' and league_id = 1;

-- Tom's correct stats (won set 2 in match 1)
update league_members set sets_won = 1, sets_lost = 2
where user_id = '00000001-0000-0000-0000-000000000003' and league_id = 1;
