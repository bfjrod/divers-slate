-- Divers Slate schema
create extension if not exists postgis;

-- Diver accounts
create table users (
  id uuid primary key references auth.users(id),
  display_name text,
  username text unique,
  avatar_url text,
  cert_level text,        -- 'open_water' | 'advanced' | 'rescue' | 'divemaster' | 'instructor'
  cert_agency text,       -- 'PADI' | 'NAUI' | 'SSI' | 'BSAC' | 'SDI' | 'GUE'
  cert_number text,
  home_city text,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- Dive sites — crowd-sourced, grows with every log
create table dive_sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  location geography(point, 4326),
  country text,
  region text,
  site_type text,         -- 'reef' | 'wreck' | 'wall' | 'cave' | 'muck' | 'drift' | 'night'
  avg_depth_ft numeric,
  max_depth_ft numeric,
  avg_visibility_ft numeric,
  log_count int default 0,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- Shops — reference data only, not the product
create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  location geography(point, 4326),
  address text,
  city text,
  state text,
  country text,
  phone text,
  website text,
  created_at timestamptz default now()
);

-- The log — core of the entire product
create table dive_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),

  -- Where
  dive_site_id uuid references dive_sites(id),
  shop_id uuid references shops(id),
  custom_location text,                 -- fallback if site not in DB yet

  -- When
  dive_date date not null,
  dive_number int,                      -- diver's cumulative dive number

  -- Dive data
  max_depth_ft numeric,
  avg_depth_ft numeric,
  bottom_time_minutes int,
  surface_interval_minutes int,
  air_in_psi int,
  air_out_psi int,
  tank_size text,                       -- 'al80' | 'hp100' | 'al63' etc
  gas_mix text,                         -- 'air' | 'ean32' | 'ean36' | 'trimix'

  -- Conditions
  visibility_ft int,
  water_temp_surface_f int,
  water_temp_bottom_f int,
  current text,                         -- 'none' | 'mild' | 'moderate' | 'strong'
  weather text,                         -- 'sunny' | 'cloudy' | 'rough'
  wave_height_ft numeric,
  tide text,                            -- 'incoming' | 'outgoing' | 'slack'

  -- Gear
  wetsuit_mm int,                       -- 0 = drysuit, 3, 5, 7
  weight_lbs numeric,
  bcd text,
  computer text,

  -- Notes
  notes text,
  marine_life text[],                   -- ['sea turtle', 'nurse shark', 'octopus']
  buddy text,
  dive_type text,                       -- 'recreational' | 'training' | 'technical' | 'freediving'
  certification_earned text,

  -- Files
  uddf_file_url text,
  has_photos boolean default false,

  -- Privacy
  is_public boolean default false,

  created_at timestamptz default now()
);

-- Photos attached to a dive log
create table dive_photos (
  id uuid primary key default gen_random_uuid(),
  dive_log_id uuid references dive_logs(id) on delete cascade,
  user_id uuid references users(id),
  url text not null,
  thumbnail_url text,
  caption text,
  width int,
  height int,
  taken_at timestamptz,
  created_at timestamptz default now()
);

-- Gear inventory
create table gear (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  type text,                            -- 'bcd' | 'regulator' | 'computer' | 'wetsuit' | 'mask' | 'fins'
  brand text,
  model text,
  purchased_at date,
  notes text
);

-- Certifications earned
create table certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  agency text,
  level text,
  cert_number text,
  issued_date date,
  dive_log_id uuid references dive_logs(id)
);

-- Indexes
create index on users (username);
create index on dive_logs (user_id, dive_date desc);
create index on dive_logs (dive_site_id);
create index on dive_logs (user_id) where is_public = true;
create index on dive_sites using gist (location);
create index on dive_photos (dive_log_id);
create index on gear (user_id);
create index on certifications (user_id);
