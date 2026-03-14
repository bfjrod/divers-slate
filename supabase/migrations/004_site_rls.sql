-- RLS for dive_sites: public read, auth insert/update-own
alter table dive_sites enable row level security;

create policy "Anyone can read dive sites"
  on dive_sites for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can create dive sites"
  on dive_sites for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "Site creator can update their site"
  on dive_sites for update
  to authenticated
  using (created_by = auth.uid());

-- RLS for dive_logs: public read, owner write
alter table dive_logs enable row level security;

create policy "Anyone can read dive logs"
  on dive_logs for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can insert own dive logs"
  on dive_logs for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update own dive logs"
  on dive_logs for update
  to authenticated
  using (user_id = auth.uid());

create policy "Users can delete own dive logs"
  on dive_logs for delete
  to authenticated
  using (user_id = auth.uid());

-- RLS for users: public read of public profiles, owner write
alter table users enable row level security;

create policy "Anyone can read user profiles"
  on users for select
  to anon, authenticated
  using (true);

create policy "Users can insert own profile"
  on users for insert
  to authenticated
  with check (id = auth.uid());

create policy "Users can update own profile"
  on users for update
  to authenticated
  using (id = auth.uid());

-- Auto-increment log_count on dive_sites when a dive is logged there
create or replace function increment_site_log_count()
returns trigger language plpgsql security definer as $$
begin
  if new.dive_site_id is not null then
    update dive_sites
    set log_count = log_count + 1
    where id = new.dive_site_id;
  end if;
  return new;
end;
$$;

create trigger trg_increment_site_log_count
  after insert on dive_logs
  for each row execute function increment_site_log_count();

-- Decrement on delete
create or replace function decrement_site_log_count()
returns trigger language plpgsql security definer as $$
begin
  if old.dive_site_id is not null then
    update dive_sites
    set log_count = greatest(0, log_count - 1)
    where id = old.dive_site_id;
  end if;
  return old;
end;
$$;

create trigger trg_decrement_site_log_count
  after delete on dive_logs
  for each row execute function decrement_site_log_count();

-- Helper: search nearby sites within radius_m metres of a point
create or replace function nearby_sites(
  lat double precision,
  lng double precision,
  radius_m double precision default 500
)
returns table (
  id uuid,
  name text,
  slug text,
  country text,
  region text,
  site_type text,
  max_depth_ft numeric,
  avg_depth_ft numeric,
  avg_visibility_ft numeric,
  log_count int,
  distance_m double precision
)
language sql stable security definer as $$
  select
    ds.id, ds.name, ds.slug, ds.country, ds.region, ds.site_type,
    ds.max_depth_ft, ds.avg_depth_ft, ds.avg_visibility_ft, ds.log_count,
    st_distance(ds.location, st_point(lng, lat)::geography) as distance_m
  from dive_sites ds
  where ds.location is not null
    and st_dwithin(ds.location, st_point(lng, lat)::geography, radius_m)
  order by distance_m;
$$;
