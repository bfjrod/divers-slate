# Divers Slate — Claude Code Plan

## The concept

A personal dive logbook for every diver. Log every dive, upload photos, record conditions, track your history. The slate is what divers write on underwater — Divers Slate is where that data lives permanently.

This is diver-first, not shop-first. The shop is context, not the product. The product is the diver's complete dive history.

---

## What changed from DiveNet

| DiveNet | Divers Slate |
|---|---|
| Shop is the atomic unit | Dive log is the atomic unit |
| Shop discovery is the product | Personal logbook is the product |
| Monetize via shop listings | Monetize via diver subscriptions |
| Data flywheel needs shop buy-in | Data flywheel is just divers logging dives |
| Hard dependency on shops to launch | Zero dependency — divers can start day one |

The pivot removes every external dependency. A diver can sign up and start logging with no shop involved at all.

---

## What Divers Slate does

A diver logs every dive they have ever done. Each log entry captures:

- Where they dove (shop, dive site, GPS coordinates)
- Conditions (visibility, water temp, current, weather)
- Dive data (max depth, bottom time, avg depth, surface interval)
- Gear used (wetsuit thickness, BCD, tank size, weight)
- Photos and video from the dive
- Dive computer data (UDDF/UDCF file upload)
- Notes and observations (marine life spotted, notable moments)
- Certification earned (if a training dive)

Over time this becomes the diver's complete underwater history — every dive they have ever taken, in one place.

---

## The data model

```sql
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
  total_dives int default 0,
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

-- Shops — reference data, not the product
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
  shop_id uuid references shops(id),   -- optional, which shop ran the dive
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
  certification_earned text,            -- if a training dive

  -- Files
  uddf_file_url text,                   -- dive computer export
  has_photos boolean default false,

  -- Privacy
  is_public boolean default false,

  created_at timestamptz default now()
);

-- Photos attached to a dive log
create table dive_photos (
  id uuid primary key default gen_random_uuid(),
  dive_log_id uuid references dive_logs(id),
  user_id uuid references users(id),
  url text not null,                    -- Cloudflare R2
  thumbnail_url text,
  caption text,
  width int,
  height int,
  taken_at timestamptz,
  created_at timestamptz default now()
);

-- Gear inventory — diver's equipment list
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
  dive_log_id uuid references dive_logs(id)  -- the training dive this came from
);
```

---

## Repo structure

```
divers-slate/
  app/
    (public)/
      page.tsx                  # Landing page
      sites/
        page.tsx                # Dive site directory + map
        [slug]/page.tsx         # Dive site profile with aggregated conditions
    (auth)/
      logbook/
        page.tsx                # Diver's full logbook
        [id]/page.tsx           # Single dive log detail
        new/page.tsx            # Log a dive (multi-step form)
        import/page.tsx         # Bulk import from UDDF or CSV
      profile/
        page.tsx                # Diver profile + stats
      gear/
        page.tsx                # Gear inventory
      certifications/
        page.tsx                # Cert history
    (portal)/
      stats/page.tsx            # Dive stats dashboard
  components/
    logbook/
      LogForm.tsx               # Multi-step log entry form
      LogCard.tsx               # Single log summary card
      LogDetail.tsx             # Full log view
      UDDFImport.tsx            # Dive computer file upload
      PhotoUpload.tsx           # Photo upload with R2
      MarineLifePicker.tsx      # Tag marine life spotted
    map/
      SiteMap.tsx               # Dive site map
      SiteMarker.tsx
    stats/
      DiveStats.tsx             # Total dives, depth, time
      DepthChart.tsx            # Depth over time
      VisibilityChart.tsx       # Visibility by location
      MarineLifeCloud.tsx       # Most spotted marine life
    profile/
      ProfileCard.tsx
      CertBadges.tsx
  lib/
    supabase/
      client.ts
      server.ts
      queries/
        logs.ts
        sites.ts
        photos.ts
        stats.ts
    r2/
      upload.ts                 -- Cloudflare R2 photo upload
    uddf/
      parser.ts                 -- Parse dive computer exports
    google-places/
      seed.ts                   -- Seed dive sites from public data
  supabase/
    migrations/
      001_schema.sql
      002_postgis.sql
      003_storage_buckets.sql
    seed/
      dive_sites.ts
```

---

## Build sequence

### Step 1 — Schema and auth
Get the database running with auth. A diver can sign up and log in.

### Step 2 — Log a dive (text only)
The core loop. A diver fills out the log form and saves a dive. No photos yet, no file upload. Just the data.

### Step 3 — Photo upload
Attach photos to a dive log. Store in Cloudflare R2. Display in the log detail view.

### Step 4 — UDDF import
Upload a dive computer file. Parse depth profile, bottom time, water temp. Pre-fill the log form with that data.

### Step 5 — Dive site profiles
Aggregate conditions from all logs at a site. Average visibility by month, common marine life, depth profile. This is the data moat.

### Step 6 — Stats dashboard
Total dives, total bottom time, deepest dive, most visited sites, marine life spotted. The profile page a diver wants to share.

### Step 7 — Public profiles
Divers opt in to a public profile showing their stats and recent dives. This is the social/discovery layer.

---

## Claude Code session prompts

### Session 1 — Scaffold and schema

```
Create a Next.js 14 project with TypeScript, Tailwind, and Supabase.
Enable PostGIS. Run these migrations:

[paste schema]

Set up Supabase Auth with email/password and Google OAuth.
Generate TypeScript types from the schema.
Set up the Supabase client for server and client components.
```

### Session 2 — Log a dive form

```
Build a multi-step dive log form at app/(auth)/logbook/new/page.tsx.

Step 1 — Where: search for a dive site by name (query dive_sites table),
or type a custom location if the site is not in the DB yet.
Optionally select which shop ran the dive.

Step 2 — When and dive data: date, dive number, max depth, avg depth,
bottom time, surface interval, air in/out, tank size, gas mix.

Step 3 — Conditions: visibility, surface temp, bottom temp, current
(none/mild/moderate/strong), weather, wave height, tide.

Step 4 — Gear: wetsuit thickness, weight, BCD, computer.

Step 5 — Notes: free text notes, marine life tags (multi-select with
common species pre-loaded), buddy name, dive type.

On submit insert to dive_logs and increment the user's total_dives count.
Redirect to the new log detail page.
```

### Session 3 — Photo upload

```
Add photo upload to the dive log.

Use Cloudflare R2 for storage via the S3-compatible API.
On the log detail page at app/(auth)/logbook/[id]/page.tsx,
show an upload zone. Accept JPEG and HEIC. Generate a thumbnail
on upload using sharp. Store both URLs in dive_photos.

Cap free tier at 10 photos per dive log.
Show photos in a masonry grid on the log detail page.
```

### Session 4 — UDDF import

```
Build a UDDF file parser at lib/uddf/parser.ts.

UDDF is XML. Parse:
- dive date and time
- max depth
- avg depth
- bottom time
- water temperature samples
- depth profile (array of [time, depth] pairs)

On the new log form add a "Import from dive computer" button at the
top of step 2. When a UDDF file is uploaded, parse it and pre-fill
the form fields. Show the depth profile as a sparkline chart.
Accept UDCF format as well.
```

### Session 5 — Dive site profiles

```
Build the dive site profile page at app/(public)/sites/[slug]/page.tsx.

Aggregate from dive_logs where dive_site_id matches:
- Average visibility by month (last 12 months)
- Average water temp by month
- Most common current rating
- Most spotted marine life (count occurrences in marine_life array)
- Total logged dives
- Deepest logged dive
- Recent logs (last 10, public only)

Display a visibility trend bar chart, marine life frequency list,
and recent public log cards. No login required to view.
```

### Session 6 — Stats dashboard

```
Build the stats dashboard at app/(auth)/stats/page.tsx.

Show:
- Total dives, total bottom time (hours), deepest dive, longest dive
- Dives by month (bar chart, last 12 months)
- Average visibility over time (line chart)
- Top 5 dive sites by number of dives
- Marine life spotted (total unique species + frequency cloud)
- Deepest 5 dives (table)
- Gear usage stats (how many dives per piece of gear)

All data from the current user's dive_logs only.
```

### Session 7 — Public profile

```
Build a public diver profile at app/(public)/divers/[username]/page.tsx.

Only show if user.is_public = true.

Display:
- Display name, avatar, home city, cert level and agency
- Total dives, total bottom time, years diving
- Cert badges (from certifications table)
- Recent public dive logs (is_public = true on the log)
- Top dive sites
- Marine life spotted count

Add a toggle in profile settings to make the profile public or private.
```

---

## Photo strategy

Photos are the infrastructure cost to watch.

| Approach | Cost | Tradeoff |
|---|---|---|
| Cloudflare R2 | $0.015/GB/month, zero egress | Best economics, S3-compatible |
| Cap free at 10 photos/dive | Keeps costs near zero at scale | Pro unlock for unlimited |
| HEIC → JPEG conversion | Reduces file size ~40% | Slightly more compute on upload |
| Thumbnail on upload | Reduces bandwidth on log lists | Sharp library in Next.js API route |
| Full-res only on detail view | Most views hit thumbnail only | Standard pattern |

Do not use S3. Egress fees will hurt at scale. R2 is the right call.

---

## UDDF support

Most major dive computers export UDDF or UDCF. Support these first:

| Brand | Export format | Notes |
|---|---|---|
| Garmin Descent | FIT + UDDF | UDDF via Garmin Connect export |
| Shearwater | UDDF | Direct USB export |
| Suunto | UDDF | Via Suunto app export |
| Mares | UDDF | Via Mares software |
| Oceanic | UDDF | Via Oceanic+ app |
| Generic | UDDF / UDCF | Open formats, broad compatibility |

Do not build device-specific integrations in the POC. UDDF file upload covers 90% of the market.

---

## Monetization

| Tier | Price | What you get |
|---|---|---|
| Free | $0 | 100 dive logs, 10 photos/dive, basic stats |
| Pro | $4/month or $36/year | Unlimited logs, unlimited photos, full stats, public profile, gear tracker, cert history |
| Lifetime | $99 one-time | Everything in Pro forever |

Comparable: Logbook of the World (ham radio logging) charges nothing and has 2M+ users. Divers Slate charges for the photo storage and advanced stats — the things that actually cost money to run.

Target: 5,000 Pro subscribers = $180,000 ARR at near-zero marginal cost.

---

## Infrastructure costs at scale

| Stage | Logs | Photos (10/dive avg) | Monthly cost |
|---|---|---|---|
| POC | 1,000 | 10,000 (~30GB) | $0 (Supabase free) |
| Early | 100,000 | 1M (~3TB) | $50–100 |
| Growth | 1,000,000 | 10M (~30TB) | $500–600 |
| Scale | 10,000,000 | 100M (~300TB) | $4,500–5,500 |

At 5,000 Pro subscribers ($180K ARR) infrastructure is ~$500/month. Margins are ~97%.

---

## The moat

After 1 million logged dives across 10,000 sites:

- Average visibility at every major dive site by month and season
- Water temperature curves by site
- Marine life frequency and seasonality — when to see whale sharks at Isla Mujeres, when manta rays are at Komodo
- Gear failure rates by brand and model (inferred from notes)
- Diver progression curves — how many dives to reach rescue, divemaster, instructor

This is data that does not exist anywhere in structured form today. Dive magazines publish anecdotes. DiveNet Slate will have the numbers.

That corpus is the product. The logbook is just how you collect it.