import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import StarDisplay from '@/components/StarDisplay'
import FollowButton from '@/components/FollowButton'

interface Props {
  params: { username: string }
}

type PublicDive = {
  id: string
  dive_date: string
  max_depth_ft: number | null
  bottom_time_minutes: number | null
  marine_life: string[] | null
  rating: number | null
  dive_sites: { name: string; slug: string | null } | null
  custom_location: string | null
}

export default async function DiverProfilePage({ params }: Props) {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('id, display_name, username, cert_level, cert_agency, home_city, is_public, created_at')
    .eq('username', params.username)
    .single()

  if (!profile) notFound()

  // Fetch their public dives
  const { data: dives } = await supabase
    .from('dive_logs')
    .select('id, dive_date, max_depth_ft, bottom_time_minutes, marine_life, rating, custom_location, dive_sites(name, slug)')
    .eq('user_id', profile.id)
    .order('dive_date', { ascending: false })
    .limit(20)

  const publicDives = (dives ?? []) as PublicDive[]

  // Stats
  const totalDives = publicDives.length
  const maxDepth = publicDives.reduce((m, d) => Math.max(m, d.max_depth_ft ?? 0), 0)

  // Is the viewer following this diver?
  let isFollowing = false
  if (authUser && authUser.id !== profile.id) {
    const { data: follow } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', authUser.id)
      .eq('following_id', profile.id)
      .single()
    isFollowing = !!follow
  }

  // Follower count
  const { count: followerCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profile.id)

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/feed" className="text-sm text-gray-400 hover:text-gray-600">← Feed</Link>
      </div>

      {/* Profile header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{profile.display_name ?? profile.username}</h1>
          <p className="text-sm text-gray-400 mt-0.5">@{profile.username}</p>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            {profile.home_city && <span>{profile.home_city}</span>}
            {profile.cert_level && (
              <span className="capitalize">
                {profile.cert_agency ? `${profile.cert_agency} ` : ''}{profile.cert_level.replace('_', ' ')}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">{followerCount ?? 0} followers</p>
        </div>

        {authUser && authUser.id !== profile.id && (
          <FollowButton
            followerId={authUser.id}
            followingId={profile.id}
            initialFollowing={isFollowing}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{totalDives}</p>
          <p className="text-xs text-gray-400 mt-0.5">dives logged</p>
        </div>
        <div className="border border-gray-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{maxDepth > 0 ? `${maxDepth} ft` : '—'}</p>
          <p className="text-xs text-gray-400 mt-0.5">best depth</p>
        </div>
      </div>

      {/* Dive list */}
      {publicDives.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No public dives yet.</p>
      ) : (
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent dives</h2>
          <ul className="divide-y divide-gray-50">
            {publicDives.map((dive) => {
              const siteName = dive.dive_sites?.name ?? dive.custom_location ?? 'Open water'
              const date = new Date(dive.dive_date + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })
              return (
                <li key={dive.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{siteName}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-gray-400">
                        {date}
                        {dive.max_depth_ft ? ` · ${dive.max_depth_ft} ft` : ''}
                        {dive.bottom_time_minutes ? ` · ${dive.bottom_time_minutes} min` : ''}
                      </p>
                      {dive.rating && <StarDisplay rating={dive.rating} />}
                    </div>
                  </div>
                  <Link href={`/dives/${dive.id}`} className="text-xs text-blue-600 hover:underline ml-4 shrink-0">
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
