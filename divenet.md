# DiveNet — Claude Code POC Plan

## The concept

AllTrails for scuba diving. The shop is the atomic unit — you can't dive without one. Divers discover shops, log dives at those shops, and those logs generate the conditions data that makes the platform valuable. The data flywheel:

**Shops attract divers → divers log dives → logs build conditions data → conditions data attracts more divers → more divers book through shops → shops pay for visibility**

---

## What we decided

| Decision | Choice | Reason |
|---|---|---|
| Primary customer | Shop | Can't dive without one |
| Primary user | Diver | They generate the data |
| Business model | AllTrails, not Shopify | Subscription + featured listings, not SaaS |
| API strategy | No FareHarbor/Peek yet | Validate the map and logbook first |
| Photo strategy | Cap free tier at 2 photos | Keeps infrastructure costs near zero |
| Map tiles | Protomaps or MapTiler | Mapbox gets expensive fast at scale |
| Launch strategy | Regional first | Florida Keys, Hawaii, Monterey — density before breadth |

---

## What we are NOT building yet

- FareHarbor / Peek Pro integration
- Shop owner portal
- Real-time availability sync
- Mobile app
- Verified booking reviews (comes after booking layer exists)

---

## Build sequence

### Step 1 — Map of shops
Seed data from Google Places API. No shop cooperation required. Prove you can put every dive shop in the US on a map in a weekend.

### Step 2 — Shop profiles
Each shop gets a profile page with dives offered, conditions from logged dives, and a review layer. This is the POC UI already designed.

### Step 3 — Diver logbook
Tied to shops and their sites. A logged dive at Key Largo Ocean Divers contributes to that shop's conditions data. No free-floating logs.

### Step 4 — Reviews
Gated behind logged dives. You dove there, now rate it. Verified dive badge is the moat.

### Step 5 — Booking
By this point you have diver traffic and shop data. You negotiate from leverage.

---

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 App Router | |
| Database | Supabase + PostGIS | PostGIS required for location queries |
| Map | Protomaps + Mapbox GL JS renderer | Protomaps from day one — Mapbox hosted tiles charge per load |
| Media | Cloudflare R2 | Zero egress fees vs S3 |
| Auth | Supabase Auth | Diver accounts + shop owner portal later |
| Hosting | Vercel | |
| Dive computer import | UDDF file upload | API integrations (Garmin, Suunto) later |

---

## Database schema

```sql
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
  -- synced_at removed: real-time sync is explicitly out of scope for this phase
);

-- Diver accounts
create table users (
  id uuid primary key references auth.users(id),
  display_name text,
  cert_level text,
  cert_agency text,
  home_city text,
  created_at timestamptz default now()
  -- total_dives omitted: compute from count(dive_logs) to avoid counter drift
);

-- The logbook — core data engine
create table dive_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  shop_id uuid references shops(id),
  dive_offering_id uuid references dive_offerings(id), -- nullable: diver may log without selecting a specific offering
  logged_at timestamptz default now(),
  dive_date date not null,
  visibility_ft int,
  water_temp_f int,
  current text, -- 'none' | 'mild' | 'moderate' | 'strong'
  max_depth_ft int,
  bottom_time_minutes int,
  notes text,
  uddf_file_url text -- raw dive computer export
);

-- Reviews — gated behind dive_log
create table reviews (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id),
  user_id uuid references users(id),
  dive_log_id uuid references dive_logs(id), -- required, verified badge
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
  r2_key text not null,       -- Cloudflare R2 object key
  caption text,
  created_at timestamptz default now()
);

-- Indexes — required for map queries and FK lookups (Postgres does NOT auto-index FKs)
create index on shops using gist (location);      -- spatial: nearby shop queries
create index on dive_logs (shop_id);              -- conditions aggregation per shop
create index on dive_logs (user_id);              -- diver's logbook
create index on reviews (shop_id);               -- shop review feed
create index on dive_offerings (shop_id);        -- shop's trip catalog
create index on availability_slots (dive_offering_id);
create index on photos (dive_log_id);
```

---

## Repo structure

```
divenet/
  app/
    (public)/
      page.tsx              # Map homepage
      shops/
        page.tsx            # Shop directory
        [slug]/
          page.tsx          # Shop profile
    (auth)/
      login/page.tsx
      signup/page.tsx
    (portal)/
      logbook/
        page.tsx            # Diver logbook
        new/page.tsx        # Log a dive
  components/
    map/
      ShopMap.tsx
      ShopMarker.tsx
    shop/
      ShopHero.tsx
      ConditionsCard.tsx
      DiveList.tsx
      ReviewCard.tsx
      AvailabilitySlots.tsx
    logbook/
      LogEntry.tsx
      UDDFImport.tsx
  lib/
    supabase/
      client.ts
      server.ts
      queries/
        shops.ts
        logs.ts
        reviews.ts
    google-places/
      seed.ts               # One-time seeding script
  supabase/
    migrations/
      001_initial_schema.sql
      002_add_postgis.sql
    seed/
      florida_keys.ts
```

---

## Claude Code session prompts

Copy these directly into Claude Code in order.

### Session 1 — Scaffold

```
Create a Next.js 14 project with TypeScript, Tailwind, and Supabase.
Enable PostGIS on the Supabase project. Run this migration:

[paste schema from above]

Generate the TypeScript types from the schema using supabase gen types.
Set up the Supabase client for both server and client components.
```

### Session 2 — Seed data

```
Write a seed script at lib/google-places/seed.ts that:
1. Queries Google Places API for "scuba diving" in the Florida Keys
2. Maps the results to our shops schema (name, slug, location, address, phone, website)
3. Upserts into Supabase
4. Logs how many shops were inserted

Run it and show me the count.
```

### Session 3 — Map homepage

```
Build the homepage at app/(public)/page.tsx.
It should render a full-viewport Mapbox GL JS map showing all shops
as markers. Clicking a marker shows a popup with shop name, rating,
and a link to /shops/[slug]. Use Protomaps tiles instead of Mapbox
hosted tiles to avoid per-load fees.
```

### Session 4 — Shop profile

```
Build the shop profile page at app/(public)/shops/[slug]/page.tsx.
Fetch the shop, its dive_offerings, its recent dive_logs (last 30 days),
and its reviews from Supabase.

Display:
- Hero with shop name, location, PADI rating, aggregate review score
- Conditions card: average visibility, water temp, current from recent logs
- Dive offerings list: name, type, depth, min cert, price
- Availability slots (static for now)
- Reviews with verified dive badge if dive_log_id is present
- Sub-ratings: instructor, equipment, value, safety

Use this design as the reference: [paste POC screenshot or describe the UI]
```

### Session 5 — Logbook

```
Build the log a dive flow at app/(portal)/logbook/new/page.tsx.

Step 1: Select a shop (search by name or location)
Step 2: Select which dive at that shop
Step 3: Enter conditions (visibility, temp, current, depth, bottom time)
Step 4: Optional — upload a UDDF file from a dive computer
Step 5: Optional — write a review (only shown after log is saved)

On submit, insert to dive_logs. If a review is written, insert to reviews
with the dive_log_id set.
```

---

## Infrastructure cost at scale

| Stage | Monthly active users | Est. monthly cost |
|---|---|---|
| POC | 100 | $0 (Supabase free tier) |
| Early | 10,000 | $50–100 |
| Growth | 100,000 | $300–500 |
| Scale | 1,000,000 | $2,000–3,000 |

Gross margins at 33,000 paying subscribers ($30/yr = $1M ARR): ~94%. Infrastructure is not the margin problem. The photo strategy is the only variable — cap free tier uploads and costs stay flat.

---

## The moat

Reviews are verified against logged dives. After 100,000 logged dives across 500 sites you have conditions data nobody else has — average visibility by month, current by season, marine life frequency. That corpus takes years to accumulate and cannot be bought or scraped. It is the product.

---

## Comparable exits

| Company | Model | Outcome |
|---|---|---|
| AllTrails | Trails directory + logbook + Pro subscription | $700M+ valuation |
| Fishbrain | Fishing logbook + community + Pro | $82M raised |
| Komoot | Cycling/hiking route discovery + community | Acquired by Outdooractive |

DiveNet at 10% of AllTrails scale = $70M outcome in a high-spend niche.