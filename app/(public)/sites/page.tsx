import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const SITE_TYPES = ['reef', 'wreck', 'wall', 'cave', 'muck', 'drift', 'night']

interface Props {
  searchParams: { q?: string; type?: string }
}

export default async function SitesPage({ searchParams }: Props) {
  const supabase = createClient()
  const q = searchParams.q?.trim() ?? ''
  const type = searchParams.type ?? ''

  let query = supabase
    .from('dive_sites')
    .select('id, name, slug, country, region, site_type, max_depth_ft, avg_visibility_ft, log_count')
    .order('log_count', { ascending: false })
    .limit(50)

  if (q) query = query.ilike('name', `%${q}%`)
  if (type) query = query.eq('site_type', type)

  const { data: sites } = await query

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← Divers Slate</Link>
        <Link href="/map" className="text-sm text-blue-600 hover:underline">View on map</Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dive sites</h1>

      {/* Search + filter */}
      <form method="GET" className="flex gap-2 mb-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="input flex-1"
        />
        <select name="type" defaultValue={type} className="input w-36">
          <option value="">All types</option>
          {SITE_TYPES.map((t) => (
            <option key={t} value={t} className="capitalize">{t}</option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          Search
        </button>
      </form>

      {/* Results */}
      {(!sites || sites.length === 0) ? (
        <p className="text-gray-400 text-sm text-center py-12">No sites found.</p>
      ) : (
        <ul className="divide-y divide-gray-50">
          {sites.map((site) => (
            <li key={site.id}>
              <Link
                href={site.slug ? `/sites/${site.slug}` : '#'}
                className="flex items-center justify-between py-4 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{site.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[site.region, site.country].filter(Boolean).join(', ')}
                    {site.site_type && <span className="ml-1 capitalize">· {site.site_type}</span>}
                    {site.max_depth_ft && <span className="ml-1">· {site.max_depth_ft} ft max</span>}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="text-sm font-semibold text-gray-700">{site.log_count}</p>
                  <p className="text-xs text-gray-400">{site.log_count === 1 ? 'dive' : 'dives'}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
