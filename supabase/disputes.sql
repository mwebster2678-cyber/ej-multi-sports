-- Add admin flag to profiles
alter table profiles add column if not exists is_admin boolean default false;

-- Set your account as admin (replace with your email)
update profiles set is_admin = true
where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');

-- Allow admin to update any match
create policy "Admin can update any match" on matches for update using (
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Allow loser to dispute (already covered but make explicit)
drop policy if exists "Loser can confirm matches" on matches;
create policy "Participants can update matches" on matches for update using (
  auth.uid() = winner_id or auth.uid() = loser_id or
  exists (select 1 from profiles where id = auth.uid() and is_admin = true)
);

-- Trigger: auto-update stats on INSERT when status = confirmed
create or replace function public.update_stats_on_insert()
returns trigger as $$
declare
  w_rank int;
  l_rank int;
begin
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
  return new;
end;
$$ language plpgsql security definer;

create trigger on_match_auto_confirmed
  after insert on matches
  for each row
  when (new.status = 'confirmed')
  execute function public.update_stats_on_insert();

-- Trigger: reverse stats when a match is disputed
create or replace function public.reverse_stats_on_dispute()
returns trigger as $$
declare
  w_rank int;
  l_rank int;
begin
  if new.status = 'disputed' and old.status = 'confirmed' then
    update league_members set wins = greatest(wins - 1, 0)
      where user_id = new.winner_id and league_id = new.league_id;
    update league_members set losses = greatest(losses - 1, 0)
      where user_id = new.loser_id and league_id = new.league_id;

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

create trigger on_match_disputed
  after update on matches
  for each row execute function public.reverse_stats_on_dispute();
