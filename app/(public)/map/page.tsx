import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DiveMap, { type DivePin, type SitePin } from '@/components/map/DiveMap'

export default async function MapPage() {
  const supabase = createClient()

  const [{ data: diveRows }, { data: siteRows }] = await Promise.all([
    supabase
      .from('dive_logs')
      .select('id, location_lat, location_lng, dive_date, max_depth_ft, bottom_time_minutes, custom_location, dive_sites(name)')
      .not('location_lat', 'is', null)
      .not('location_lng', 'is', null),
    supabase
      .from('dive_sites')
      .select('id, name, slug, site_type, max_depth_ft, log_count, location')
      .not('location', 'is', null)
      .gt('log_count', 0),
  ])

  const dives: DivePin[] = (diveRows ?? []).map((row) => ({
    id: row.id,
    lat: Number(row.location_lat),
    lng: Number(row.location_lng),
    dive_date: row.dive_date,
    max_depth_ft: row.max_depth_ft,
    bottom_time_minutes: row.bottom_time_minutes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    site_name: (row.dive_sites as any)?.name ?? row.custom_location ?? null,
  }))

  // dive_sites.location is a PostGIS geography point stored as WKB.
  // We resolve lat/lng by finding the first dive logged at each site that has coords.
  // Build a lookup: site_id -> {lat, lng} from dive pins
  const siteCoordsMap: Record<string, { lat: number; lng: number }> = {}

  // Fetch site coords from dives that have a dive_site_id and location
  const { data: siteDiveCoords } = await supabase
    .from('dive_logs')
    .select('dive_site_id, location_lat, location_lng')
    .not('dive_site_id', 'is', null)
    .not('location_lat', 'is', null)
    .not('location_lng', 'is', null)

  ;(siteDiveCoords ?? []).forEach((row) => {
    if (row.dive_site_id && !siteCoordsMap[row.dive_site_id]) {
      siteCoordsMap[row.dive_site_id] = {
        lat: Number(row.location_lat),
        lng: Number(row.location_lng),
      }
    }
  })

  const sites: SitePin[] = (siteRows ?? [])
    .filter((s) => siteCoordsMap[s.id])
    .map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      lat: siteCoordsMap[s.id].lat,
      lng: siteCoordsMap[s.id].lng,
      log_count: s.log_count ?? 0,
      site_type: s.site_type,
      max_depth_ft: s.max_depth_ft,
    }))

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-semibold text-gray-900">Divers Slate</Link>
          <span className="text-xs text-gray-400">{dives.length} dives · {sites.length} sites</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/sites" className="text-sm text-gray-500 hover:text-gray-700">Browse sites</Link>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">Log in</Link>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-50 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-400 border border-white shadow-sm" />
          <span className="text-xs text-gray-500">Dive site</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-sky-500 border border-white shadow-sm" />
          <span className="text-xs text-gray-500">Individual dive</span>
        </div>
      </div>

      {/* Full-screen map */}
      <div className="flex-1">
        <DiveMap dives={dives} sites={sites} />
      </div>
    </div>
  )
}
