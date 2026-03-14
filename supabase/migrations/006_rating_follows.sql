-- Star rating on dive logs (1–5)
alter table dive_logs add column if not exists rating smallint check (rating >= 1 and rating <= 5);

-- Social follows
create table if not exists follows (
  follower_id uuid references users(id) on delete cascade,
  following_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

alter table follows enable row level security;

create policy "Anyone can read follows"
  on follows for select
  to anon, authenticated
  using (true);

create policy "Users can follow others"
  on follows for insert
  to authenticated
  with check (follower_id = auth.uid());

create policy "Users can unfollow"
  on follows for delete
  to authenticated
  using (follower_id = auth.uid());

create index if not exists follows_following_id_idx on follows (following_id);
create index if not exists follows_follower_id_idx on follows (follower_id);
