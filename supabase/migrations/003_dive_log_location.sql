-- Add dive entry point coordinates to dive_logs
alter table dive_logs
  add column location_lat numeric,
  add column location_lng numeric;

-- All dive data is publicly readable — only identity (diver name) is gated in app logic
create policy "Dive logs are publicly readable"
on dive_logs for select
to anon, authenticated
using (true);
