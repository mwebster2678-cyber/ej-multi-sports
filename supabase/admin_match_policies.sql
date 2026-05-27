-- Allow admins to view all matches (not just ones they participated in)
drop policy if exists "Admins can view all matches" on matches;
create policy "Admins can view all matches" on matches for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Allow admins to delete any match (used when editing a score: delete old, insert corrected)
drop policy if exists "Admins can delete matches" on matches;
create policy "Admins can delete matches" on matches for delete
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Allow admins to insert corrected matches (not bound to winner/loser check)
drop policy if exists "Admins can insert matches" on matches;
create policy "Admins can insert matches" on matches for insert
  with check (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
