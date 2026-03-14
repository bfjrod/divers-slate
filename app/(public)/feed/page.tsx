import { createClient } from '@/lib/supabase/server'
import FeedTabs from '@/components/FeedTabs'

const DIVE_SELECT = 'id, dive_date, max_depth_ft, bottom_time_minutes, visibility_ft, marine_life, custom_location, rating, is_public, dive_sites(name, slug, country), users(display_name, username)'

export default async function FeedPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: recentRows } = await supabase
    .from('dive_logs')
    .select(DIVE_SELECT)
    .order('dive_date', { ascending: false })
    .limit(40)

  let followingRows: unknown[] = []
  if (user) {
    const { data: followRows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (followRows ?? []).map((r) => r.following_id)

    if (followingIds.length > 0) {
      const { data } = await supabase
        .from('dive_logs')
        .select(DIVE_SELECT)
        .in('user_id', followingIds)
        .order('dive_date', { ascending: false })
        .limit(40)
      followingRows = data ?? []
    }
  }

  return (
    <FeedTabs
      recent={recentRows ?? []}
      following={followingRows}
      isLoggedIn={!!user}
    />
  )
}
