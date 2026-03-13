import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DiveMap, { type DivePin } from '@/components/map/DiveMap'

export default async function MapPage() {
  const supabase = createClient()

  const { data: rows } = await supabase
    .from('dive_logs')
    .select('id, location_lat, location_lng, dive_date, max_depth_ft, bottom_time_minutes, custom_location, dive_sites(name)')
    .not('location_lat', 'is', null)
    .not('location_lng', 'is', null)

  const dives: DivePin[] = (rows ?? []).map((row) => ({
    id: row.id,
    lat: Number(row.location_lat),
    lng: Number(row.location_lng),
    dive_date: row.dive_date,
    max_depth_ft: row.max_depth_ft,
    bottom_time_minutes: row.bottom_time_minutes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    site_name: (row.dive_sites as any)?.name ?? row.custom_location ?? null,
  }))

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold text-gray-900">Divers Slate</Link>
          <span className="text-xs text-gray-400">{dives.length} dives pinned</span>
        </div>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">Log in</Link>
      </div>

      {/* Full-screen map */}
      <div className="flex-1">
        <DiveMap dives={dives} />
      </div>
    </div>
  )
}
