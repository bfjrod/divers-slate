import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { DiveLogWithSite } from '@/lib/supabase/types'

export default async function LogbookPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: logs } = await supabase
    .from('dive_logs')
    .select('*, dive_sites(name, slug, country, region)')
    .eq('user_id', user!.id)
    .order('dive_date', { ascending: false })

  const typedLogs = (logs ?? []) as DiveLogWithSite[]

  // Quick stats
  const totalDives = typedLogs.length
  const totalMinutes = typedLogs.reduce((s, l) => s + (l.bottom_time_minutes ?? 0), 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const deepest = Math.max(0, ...typedLogs.map((l) => l.max_depth_ft ?? 0))

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Slate</h1>
          {totalDives > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">
              {totalDives} dives · {totalHours}h bottom time · {deepest}ft deepest
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/logbook/import"
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Import from computer
          </Link>
          <Link
            href="/logbook/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Log a dive
          </Link>
        </div>
      </div>

      {/* Dive list */}
      {typedLogs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No dives logged yet.</p>
          <Link href="/logbook/new" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            Log your first dive →
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {typedLogs.map((log, i) => (
            <li key={log.id}>
              <Link
                href={`/logbook/${log.id}`}
                className="flex items-center gap-4 py-4 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
              >
                {/* Dive number */}
                <span className="w-8 text-center text-xs text-gray-300 font-mono">
                  #{totalDives - i}
                </span>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {log.dive_sites?.name ?? log.custom_location ?? 'Unknown site'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {log.dive_sites?.country && `${log.dive_sites.country} · `}
                    {new Date(log.dive_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex gap-4 text-right shrink-0">
                  {log.max_depth_ft && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">{log.max_depth_ft}ft</p>
                      <p className="text-xs text-gray-400">depth</p>
                    </div>
                  )}
                  {log.bottom_time_minutes && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">{log.bottom_time_minutes}min</p>
                      <p className="text-xs text-gray-400">bottom</p>
                    </div>
                  )}
                  {log.visibility_ft && (
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium text-gray-700">{log.visibility_ft}ft</p>
                      <p className="text-xs text-gray-400">vis</p>
                    </div>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
