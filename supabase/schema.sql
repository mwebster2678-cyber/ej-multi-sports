-- ─────────────────────────────────────────────
-- EJ Multi-Sports — Full Schema (fresh install)
-- Drop everything first, then rebuild cleanly
-- ─────────────────────────────────────────────

-- Drop existing tables (order matters for foreign keys)
drop table if exists matches cascade;
drop table if exists challenges cascade;
drop table if exists league_members cascade;
drop table if exists leagues cascade;
drop table if exists sports cascade;
drop table if exists profiles cascade;

-- Drop trigger and function if they exist
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.update_stats_on_confirm();

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  full_name text not null,
  avatar_url text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Profiles viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- ─────────────────────────────────────────────
-- SPORTS
-- ─────────────────────────────────────────────
create table sports (
  id serial primary key,
  name text not null,
  icon text,
  created_at timestamptz default now()
);

alter table sports enable row level security;
create policy "Sports viewable by everyone" on sports for select using (true);

insert into sports (name, icon) values ('Tennis', '🎾');

-- ─────────────────────────────────────────────
-- LEAGUES
-- ─────────────────────────────────────────────
create table leagues (
  id serial primary key,
  sport_id int references sports(id),
  name text not null,
  type text not null check (type in ('ladder', 'round_robin', 'knockout')),
  region text,
  season text,
  status text default 'active' check (status in ('active', 'upcoming', 'completed')),
  description text,
  created_at timestamptz default now()
);

alter table leagues enable row level security;
create policy "Leagues viewable by everyone" on leagues for select using (true);

insert into leagues (sport_id, name, type, region, season, description)
values (1, 'EJ Tennis Ladder', 'ladder', 'South East England', '2026', 'Our flagship tennis ladder open to all levels.');

-- ─────────────────────────────────────────────
-- LEAGUE MEMBERS
-- ─────────────────────────────────────────────
create table league_members (
  id serial primary key,
  league_id int references leagues(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  rank int,
  wins int default 0,
  losses int default 0,
  points int default 0,
  status text default 'active',
  joined_at timestamptz default now(),
  unique(league_id, user_id)
);

alter table league_members enable row level security;
create policy "League members viewable by everyone" on league_members for select using (true);
create policy "Users can join leagues" on league_members for insert with check (auth.uid() = user_id);
create policy "Users can update own membership" on league_members for update using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- CHALLENGES
-- ─────────────────────────────────────────────
create table challenges (
  id serial primary key,
  league_id int references leagues(id) on delete cascade,
  challenger_id uuid references profiles(id) on delete cascade,
  opponent_id uuid references profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'declined', 'completed', 'expired')),
  proposed_date timestamptz,
  created_at timestamptz default now()
);

alter table challenges enable row level security;
create policy "Challenges viewable by participants" on challenges for select using (
  auth.uid() = challenger_id or auth.uid() = opponent_id
);
create policy "Authenticated users can create challenges" on challenges for insert with check (
  auth.uid() = challenger_id
);
create policy "Participants can update challenges" on challenges for update using (
  auth.uid() = challenger_id or auth.uid() = opponent_id
);

-- ─────────────────────────────────────────────
-- MATCHES
-- ─────────────────────────────────────────────
create table matches (
  id serial primary key,
  league_id int references leagues(id) on delete cascade,
  challenge_id int references challenges(id) on delete set null,
  winner_id uuid references profiles(id) on delete cascade,
  loser_id uuid references profiles(id) on delete cascade,
  score text,
  reported_by uuid references profiles(id),
  confirmed_by uuid references profiles(id),
  status text default 'pending_confirmation' check (status in ('pending_confirmation', 'confirmed', 'disputed')),
  played_at timestamptz,
  created_at timestamptz default now()
);

alter table matches enable row level security;
create policy "Matches viewable by participants" on matches for select using (
  auth.uid() = winner_id or auth.uid() = loser_id
);
create policy "Participants can insert matches" on matches for insert with check (
  auth.uid() = winner_id or auth.uid() = loser_id
);
create policy "Loser can confirm matches" on matches for update using (
  auth.uid() = loser_id or auth.uid() = winner_id
);

-- ─────────────────────────────────────────────
-- TRIGGER: auto-create profile on sign up
-- ─────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, username)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────
-- TRIGGER: auto-update stats + swap ranks on match confirm
-- ─────────────────────────────────────────────
create or replace function public.update_stats_on_confirm()
returns trigger as $$
declare
  w_rank int;
  l_rank int;
begin
  if new.status = 'confirmed' and old.status != 'confirmed' then
    update league_members set wins = wins + 1
      where user_id = new.winner_id and league_id = new.league_id;
    update league_members set losses = losses + 1
      where user_id = new.loser_id and league_id = new.league_id;

    select rank into w_rank from league_members where user_id = new.winner_id and league_id = new.league_id;
    select rank into l_rank from league_members where user_id = new.loser_id and league_id = new.league_id;

    if w_rank > l_rank then
      update league_members set rank = l_rank where user_id = new.winner_id and league_id = new.league_id;
      update league_members set rank = w_rank where user_id = new.loser_id and league_id = new.league_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_match_confirmed
  after update on matches
  for each row execute function public.update_stats_on_confirm();
