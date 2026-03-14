-- Store the raw depth/time/temp waypoints from dive computer imports
alter table dive_logs add column if not exists profile_data jsonb;
-- Shape: [{t: number, d: number, tmp?: number}]
-- t = seconds from dive start, d = depth in feet, tmp = temp in °F
