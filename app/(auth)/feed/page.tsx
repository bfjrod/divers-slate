import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FeedTabs from './FeedTabs'

export default async function AuthFeedPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch who the user follows
  const { data: followRows } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', user.id)

  const followingIds = (followRows ?? []).map((r) => r.following_id)

  const DIVE_SELECT = 'id, dive_date, max_depth_ft, bottom_time_minutes, visibility_ft, marine_life, custom_location, rating, is_public, dive_sites(name, slug, country), users(display_name, username)'

  const [{ data: recentRows }, { data: followingRows }] = await Promise.all([
    supabase
      .from('dive_logs')
      .select(DIVE_SELECT)
      .order('dive_date', { ascending: false })
      .limit(40),
    followingIds.length > 0
      ? supabase
          .from('dive_logs')
          .select(DIVE_SELECT)
          .in('user_id', followingIds)
          .order('dive_date', { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] }),
  ])

  return (
    <FeedTabs
      recent={recentRows ?? []}
      following={followingRows ?? []}
    />
  )
}
