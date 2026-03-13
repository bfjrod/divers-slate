-- Enable PostGIS (must be done via Dashboard or with superuser role)
-- Dashboard → Database → Extensions → postgis

-- Shops — the atomic unit
create table shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  location geography(point, 4326),
  address text,
  city text,
  state text,
  phone text,
  website text,
  description text,
  certifications_accepted text[],
  booking_platform text, -- 'fareharbor' | 'peek' | 'direct' | null
  booking_platform_id text,
  padi_rating text,
  established_year int,
  created_at timestamptz default now()
);

-- Dive offerings — trips/products a shop sells (distinct from logged dives)
create table dive_offerings (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id),
  name text not null,
  type text, -- 'reef' | 'wreck' | 'cave' | 'night' | 'wall'
  max_depth_ft int,
  min_certification text,
  max_divers int,
  duration_minutes int,
  price_usd numeric,
  description text
);

-- Availability slots (manual entry until booking integration)
create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  dive_offering_id uuid references dive_offerings(id),
  date date not null,
  time time not null,
  spots_total int,
  spots_remaining int,
  external_booking_url text
);

-- Diver accounts
create table users (
  id uuid primary key references auth.users(id),
  display_name text,
  cert_level text,
  cert_agency text,
  home_city text,
  created_at timestamptz default now()
);

-- The logbook — core data engine
create table dive_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  shop_id uuid references shops(id),
  dive_offering_id uuid references dive_offerings(id),
  logged_at timestamptz default now(),
  dive_date date not null,
  visibility_ft int,
  water_temp_f int,
  current text, -- 'none' | 'mild' | 'moderate' | 'strong'
  max_depth_ft int,
  bottom_time_minutes int,
  notes text,
  uddf_file_url text
);

-- Reviews — gated behind dive_log
create table reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id),
  user_id uuid references users(id),
  dive_log_id uuid references dive_logs(id),
  rating_overall numeric(3,1),
  rating_instructor numeric(3,1),
  rating_equipment numeric(3,1),
  rating_value numeric(3,1),
  rating_safety numeric(3,1),
  body text,
  created_at timestamptz default now()
);

-- Photos — capped at 2 per dive_log on free tier (enforced in application layer)
create table photos (
  id uuid primary key default gen_random_uuid(),
  dive_log_id uuid references dive_logs(id),
  user_id uuid references users(id),
  r2_key text not null,
  caption text,
  created_at timestamptz default now()
);

-- Indexes
create index on shops using gist (location);
create index on dive_logs (shop_id);
create index on dive_logs (user_id);
create index on reviews (shop_id);
create index on dive_offerings (shop_id);
create index on availability_slots (dive_offering_id);
create index on photos (dive_log_id);
