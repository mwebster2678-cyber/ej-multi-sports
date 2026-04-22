-- Fake players for all 3 leagues
-- The handle_new_user trigger auto-creates profiles from raw_user_meta_data

-- ─── Insert fake auth users ───────────────────────────────────────────────────
INSERT INTO auth.users (
  id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001','authenticated','authenticated','james.harrison@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"jharrison","full_name":"James Harrison"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000002','authenticated','authenticated','sophie.turner@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"sturner","full_name":"Sophie Turner"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000003','authenticated','authenticated','tom.bradley@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"tbradley","full_name":"Tom Bradley"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000004','authenticated','authenticated','emma.clarke@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"eclarke","full_name":"Emma Clarke"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000005','authenticated','authenticated','ryan.foster@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"rfoster","full_name":"Ryan Foster"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000006','authenticated','authenticated','laura.simmons@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"lsimmons","full_name":"Laura Simmons"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000007','authenticated','authenticated','marcus.webb@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"mwebb","full_name":"Marcus Webb"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000008','authenticated','authenticated','priya.sharma@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"psharma","full_name":"Priya Sharma"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000009','authenticated','authenticated','daniel.hayes@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"dhayes","full_name":"Daniel Hayes"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000010','authenticated','authenticated','chloe.martin@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"cmartin","full_name":"Chloe Martin"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000011','authenticated','authenticated','ben.ashworth@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"bashworth","full_name":"Ben Ashworth"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000012','authenticated','authenticated','olivia.grant@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"ogrant","full_name":"Olivia Grant"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000013','authenticated','authenticated','jack.brennan@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"jbrennan","full_name":"Jack Brennan"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000014','authenticated','authenticated','natalie.cox@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"ncox","full_name":"Natalie Cox"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000015','authenticated','authenticated','sam.okafor@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"sokafor","full_name":"Sam Okafor"}',false,'','','',''),
  ('aaaaaaaa-0001-0001-0001-000000000016','authenticated','authenticated','zoe.fletcher@fakeplayer.ej',crypt('FakePass123!',gen_salt('bf')),now(),now(),now(),'{"provider":"email","providers":["email"]}','{"username":"zfletcher","full_name":"Zoe Fletcher"}',false,'','','','')
ON CONFLICT (id) DO NOTHING;

-- ─── League 1: South East England ─────────────────────────────────────────────
-- (The trigger created the profiles above. Now add league memberships.)
INSERT INTO league_members (user_id, league_id, rank, wins, losses, sets_won, sets_lost, games_won, games_lost, status) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000001', 1, 1,  8, 2, 18,  6, 105, 58, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000002', 1, 2,  7, 3, 16,  8,  96, 62, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000003', 1, 3,  6, 3, 13,  7,  82, 54, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000004', 1, 4,  4, 5, 10, 12,  65, 78, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000005', 1, 5,  3, 6,  8, 14,  55, 85, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000006', 1, 6,  2, 7,  5, 15,  40, 90, 'active')
ON CONFLICT DO NOTHING;

-- ─── League 2: South West London ──────────────────────────────────────────────
INSERT INTO league_members (user_id, league_id, rank, wins, losses, sets_won, sets_lost, games_won, games_lost, status) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000007', 2, 1,  6, 1, 13,  4,  80, 42, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000008', 2, 2,  5, 2, 11,  5,  68, 45, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000009', 2, 3,  4, 3,  9,  7,  58, 52, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000010', 2, 4,  2, 4,  5, 10,  38, 65, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000011', 2, 5,  1, 6,  3, 13,  28, 80, 'active')
ON CONFLICT DO NOTHING;

-- ─── League 3: Central London ─────────────────────────────────────────────────
INSERT INTO league_members (user_id, league_id, rank, wins, losses, sets_won, sets_lost, games_won, games_lost, status) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000012', 3, 1,  7, 1, 15,  3,  88, 38, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000013', 3, 2,  6, 2, 13,  5,  78, 46, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000014', 3, 3,  4, 4,  9,  9,  60, 68, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000015', 3, 4,  3, 5,  7, 11,  48, 72, 'active'),
  ('aaaaaaaa-0001-0001-0001-000000000016', 3, 5,  1, 7,  3, 15,  25, 92, 'active')
ON CONFLICT DO NOTHING;
