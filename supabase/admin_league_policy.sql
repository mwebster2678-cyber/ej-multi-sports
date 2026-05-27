-- Allow admins to create new leagues
drop policy if exists "Admins can insert leagues" on leagues;
create policy "Admins can insert leagues"
  on leagues for insert
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Allow admins to update leagues (e.g. ending a league)
drop policy if exists "Admins can update leagues" on leagues;
create policy "Admins can update leagues"
  on leagues for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );
