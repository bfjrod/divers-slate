/**
 * One-time seed script: queries Google Places Text Search for scuba diving shops
 * in the three launch regions and upserts them into Supabase.
 *
 * Usage:
 *   npx tsx lib/google-places/seed.ts
 *
 * Requires env vars:
 *   GOOGLE_PLACES_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (bypasses RLS for seeding)
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const REGIONS = [
  'scuba diving Florida Keys',
  'scuba diving Hawaii',
  'scuba diving Monterey California',
]

const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place/textsearch/json'
const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!PLACES_KEY) throw new Error('Missing GOOGLE_PLACES_API_KEY')
if (!SUPABASE_URL) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
if (!SUPABASE_SERVICE_KEY) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlaceResult {
  place_id: string
  name: string
  formatted_address: string
  geometry: { location: { lat: number; lng: number } }
  types: string[]
}

interface TextSearchResponse {
  results: PlaceResult[]
  next_page_token?: string
  status: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Parse city and state from Google's formatted_address */
function parseCityState(address: string): { city: string | null; state: string | null } {
  // Typical format: "123 Main St, Key Largo, FL 33037, USA"
  const parts = address.split(',').map((p) => p.trim())
  const city = parts.length >= 2 ? parts[parts.length - 3] ?? null : null
  const stateZip = parts.length >= 2 ? parts[parts.length - 2] ?? null : null
  const state = stateZip ? stateZip.split(' ')[0] : null
  return { city, state }
}

/** Sleep to respect Places API next_page_token delay (2s minimum) */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Fetch all pages for a query (max 3 pages = 60 results)
// ---------------------------------------------------------------------------

async function fetchAllPages(query: string): Promise<PlaceResult[]> {
  const results: PlaceResult[] = []
  let pageToken: string | undefined

  for (let page = 0; page < 3; page++) {
    const params = new URLSearchParams({ query, key: PLACES_KEY, type: 'establishment' })
    if (pageToken) params.set('pagetoken', pageToken)

    const res = await fetch(`${PLACES_BASE}?${params}`)
    const data: TextSearchResponse = await res.json()

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`Places API error for "${query}" page ${page + 1}: ${data.status}`)
      break
    }

    results.push(...data.results)
    console.log(`  Page ${page + 1}: ${data.results.length} results`)

    if (!data.next_page_token) break
    pageToken = data.next_page_token
    await sleep(2500) // Google requires a short delay before using next_page_token
  }

  return results
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  let totalInserted = 0
  let totalSkipped = 0

  for (const region of REGIONS) {
    console.log(`\nFetching: "${region}"`)
    const places = await fetchAllPages(region)
    console.log(`  Total fetched: ${places.length}`)

    for (const place of places) {
      const slug = slugify(place.name)
      const { city, state } = parseCityState(place.formatted_address)
      const { lat, lng } = place.geometry.location

      const { error } = await supabase.from('shops').upsert(
        {
          name: place.name,
          slug,
          // EWKT string — PostgREST casts text → geography via PostGIS implicit cast
          location: `SRID=4326;POINT(${lng} ${lat})`,
          address: place.formatted_address,
          city,
          state,
          // Text Search doesn't return phone/website — those require a Place Details call
          // Run a separate enrichment pass per-shop if needed
          phone: null,
          website: null,
        },
        { onConflict: 'slug' }
      )

      if (error) {
        console.warn(`  Skipped "${place.name}": ${error.message}`)
        totalSkipped++
      } else {
        totalInserted++
      }
    }
  }

  console.log(`\nDone. Inserted/updated: ${totalInserted}, skipped: ${totalSkipped}`)
}

seed().catch(console.error)
