create table messages (
  id serial primary key,
  challenge_id int references challenges(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table messages enable row level security;

create policy "Participants can read messages" on messages for select using (
  exists (
    select 1 from challenges
    where challenges.id = messages.challenge_id
    and (challenges.challenger_id = auth.uid() or challenges.opponent_id = auth.uid())
  )
);

create policy "Participants can send messages" on messages for insert with check (
  auth.uid() = sender_id and
  exists (
    select 1 from challenges
    where challenges.id = messages.challenge_id
    and (challenges.challenger_id = auth.uid() or challenges.opponent_id = auth.uid())
  )
);
