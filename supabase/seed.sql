insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, role) values
  ('00000001-0000-0000-0000-000000000001', 'james.hunter@test.com', crypt('password123', gen_salt('bf')), now(), now(), now(), jsonb_build_object('provider','email'), jsonb_build_object('full_name','James Hunter','username','jameshunter'), 'authenticated'),
  ('00000001-0000-0000-0000-000000000002', 'sarah.mills@test.com',  crypt('password123', gen_salt('bf')), now(), now(), now(), jsonb_build_object('provider','email'), jsonb_build_object('full_name','Sarah Mills','username','sarahmills'),   'authenticated'),
  ('00000001-0000-0000-0000-000000000003', 'tom.wright@test.com',   crypt('password123', gen_salt('bf')), now(), now(), now(), jsonb_build_object('provider','email'), jsonb_build_object('full_name','Tom Wright','username','tomwright'),     'authenticated'),
  ('00000001-0000-0000-0000-000000000004', 'emma.davis@test.com',   crypt('password123', gen_salt('bf')), now(), now(), now(), jsonb_build_object('provider','email'), jsonb_build_object('full_name','Emma Davis','username','emmadavis'),     'authenticated');

insert into league_members (league_id, user_id, rank) values
  (1, '00000001-0000-0000-0000-000000000001', 2),
  (1, '00000001-0000-0000-0000-000000000002', 3),
  (1, '00000001-0000-0000-0000-000000000003', 4),
  (1, '00000001-0000-0000-0000-000000000004', 5);
