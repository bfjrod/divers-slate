import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import DiveLocationMap from '@/components/map/DiveLocationMap'

interface Props {
  params: { slug: string }
}

type RecentDive = {
  id: string
  dive_date: string
  max_depth_ft: number | null
  bottom_time_minutes: number | null
  visibility_ft: number | null
  marine_life: string[] | null
  is_public: boolean
  users: { display_name: string | null; username: string | null } | null
}

export default async function SitePage({ params }: Props) {
  const supabase = createClient()

  const { data: site } = await supabase
    .from('dive_sites')
    .select('id, name, slug, country, region, site_type, max_depth_ft, avg_depth_ft, avg_visibility_ft, log_count, location')
    .eq('slug', params.slug)
    .single()

  if (!site) notFound()

  // Parse location point (stored as WKB hex — extract via cast in query)
  // We store lat/lng separately via a view or we geocode from the location string
  // For now, fetch recent dives at this site to get a coordinate
  const { data: recentDives } = await supabase
    .from('dive_logs')
    .select('id, dive_date, max_depth_ft, bottom_time_minutes, visibility_ft, marine_life, is_public, location_lat, location_lng, users(display_name, username)')
    .eq('dive_site_id', site.id)
    .order('dive_date', { ascending: false })
    .limit(20)

  const dives = (recentDives ?? []) as (RecentDive & { location_lat: number | null; location_lng: number | null })[]

  // Aggregate all species spotted across all dives at this site
  const speciesCounts: Record<string, number> = {}
  dives.forEach((d) => {
    (d.marine_life ?? []).forEach((s) => {
      speciesCounts[s] = (speciesCounts[s] ?? 0) + 1
    })
  })
  const topSpecies = Object.entries(speciesCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)

  // Use the first dive with coords for the map
  const pinDive = dives.find((d) => d.location_lat && d.location_lng)

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/sites" className="text-sm text-gray-400 hover:text-gray-600">← All sites</Link>
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">Divers Slate</Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{site.name}</h1>
            <p className="mt-1 text-sm text-gray-400">
              {[site.region, site.country].filter(Boolean).join(', ')}
              {site.site_type && <span className="ml-2 capitalize text-gray-400">· {site.site_type}</span>}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-gray-900">{site.log_count}</p>
            <p className="text-xs text-gray-400">{site.log_count === 1 ? 'dive logged' : 'dives logged'}</p>
          </div>
        </div>
      </div>

      {/* Map */}
      {pinDive?.location_lat && pinDive.location_lng && (
        <div className="mb-8 rounded-xl overflow-hidden border border-gray-100">
          <DiveLocationMap lat={Number(pinDive.location_lat)} lng={Number(pinDive.location_lng)} />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Max depth', value: site.max_depth_ft ? `${site.max_depth_ft} ft` : '—' },
          { label: 'Avg depth', value: site.avg_depth_ft ? `${site.avg_depth_ft} ft` : '—' },
          { label: 'Avg visibility', value: site.avg_visibility_ft ? `${site.avg_visibility_ft} ft` : '—' },
        ].map((s) => (
          <div key={s.label} className="border border-gray-100 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Commonly seen */}
      {topSpecies.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Commonly seen</h2>
          <div className="flex flex-wrap gap-2">
            {topSpecies.map(([species, count]) => (
              <span key={species} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                {species}
                <span className="text-blue-400">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recent dives */}
      {dives.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent dives</h2>
          <ul className="divide-y divide-gray-50">
            {dives.map((dive) => {
              const date = new Date(dive.dive_date + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })
              const diver = dive.users
              return (
                <li key={dive.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      {date}
                      {dive.max_depth_ft ? <span className="text-gray-400"> · {dive.max_depth_ft} ft</span> : null}
                      {dive.bottom_time_minutes ? <span className="text-gray-400"> · {dive.bottom_time_minutes} min</span> : null}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {dive.is_public && diver?.display_name ? diver.display_name : 'Anonymous diver'}
                    </p>
                  </div>
                  <Link href={`/dives/${dive.id}`} className="text-xs text-blue-600 hover:underline shrink-0 ml-4">
                    View →
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </main>
  )
}
