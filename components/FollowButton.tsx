'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  followerId: string
  followingId: string
  initialFollowing: boolean
}

export default function FollowButton({ followerId, followingId, initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const supabase = createClient()

    if (following) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
      setFollowing(false)
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: followerId, following_id: followingId })
      setFollowing(true)
    }

    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
        following
          ? 'border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-500'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}
