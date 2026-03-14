import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import StarDisplay from '@/components/StarDisplay'

type FeedDive = {
  id: string
  dive_date: string
  max_depth_ft: number | null
  bottom_time_minutes: number | null
  visibility_ft: number | null
  marine_life: string[] | null
  custom_location: string | null
  rating: number | null
  is_public: boolean
  dive_sites: { name: string; slug: string | null; country: string | null } | null
  users: { display_name: string | null; username: string | null } | null
}

export default async function FeedPage() {
  const supabase = createClient()

  const { data } = await supabase
    .from('dive_logs')
    .select('id, dive_date, max_depth_ft, bottom_time_minutes, visibility_ft, marine_life, custom_location, rating, is_public, dive_sites(name, slug, country), users(display_name, username)')
    .order('dive_date', { ascending: false })
    .limit(40)

  const dives = (data ?? []) as FeedDive[]

  return (
    <main className="max-w-xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Divers Slate</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Recent dives</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/map" className="text-sm text-gray-500 hover:text-gray-700">Map</Link>
          <Link href="/logbook" className="text-sm text-blue-600 hover:underline">My logbook</Link>
        </div>
      </div>

      {dives.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-12">No dives logged yet. Be the first!</p>
      ) : (
        <ul className="space-y-3">
          {dives.map((dive) => <DiveCard key={dive.id} dive={dive} />)}
        </ul>
      )}
    </main>
  )
}

function DiveCard({ dive }: { dive: FeedDive }) {
  const site = dive.dive_sites
  const diver = dive.users
  const siteName = site?.name ?? dive.custom_location ?? 'Open water'

  const date = new Date(dive.dive_date + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <li className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
      {/* Site + diver */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <Link
            href={site?.slug ? `/sites/${site.slug}` : `/dives/${dive.id}`}
            className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
          >
            {siteName}
          </Link>
          {site?.country && <p className="text-xs text-gray-400">{site.country}</p>}
        </div>
        {dive.rating && <StarDisplay rating={dive.rating} />}
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-xs text-gray-500 mb-3">
        <span>{date}</span>
        {dive.max_depth_ft && <span>{dive.max_depth_ft} ft</span>}
        {dive.bottom_time_minutes && <span>{dive.bottom_time_minutes} min</span>}
        {dive.visibility_ft && <span>{dive.visibility_ft} ft vis</span>}
      </div>

      {/* Marine life tags */}
      {dive.marine_life && dive.marine_life.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {dive.marine_life.slice(0, 5).map((s) => (
            <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{s}</span>
          ))}
          {dive.marine_life.length > 5 && (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-xs rounded-full">+{dive.marine_life.length - 5}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {dive.is_public && diver?.display_name ? (
            diver.username ? (
              <Link href={`/divers/${diver.username}`} className="hover:text-blue-500 transition-colors">
                {diver.display_name}
              </Link>
            ) : diver.display_name
          ) : 'Anonymous diver'}
        </p>
        <Link href={`/dives/${dive.id}`} className="text-xs text-blue-600 hover:underline">
          View →
        </Link>
      </div>
    </li>
  )
}
