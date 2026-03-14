'use client'

import { useState } from 'react'
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dive_sites: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  users: any
}

interface Props {
  recent: FeedDive[]
  following: FeedDive[]
}

export default function FeedTabs({ recent, following }: Props) {
  const [tab, setTab] = useState<'recent' | 'following'>('recent')
  const dives = tab === 'recent' ? recent : following

  return (
    <main className="max-w-xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feed</h1>
        <Link href="/logbook" className="text-sm text-blue-600 hover:underline">My logbook</Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-6">
        {(['recent', 'following'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'following' ? `Following (${following.length})` : 'Recent'}
          </button>
        ))}
      </div>

      {dives.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">
            {tab === 'following'
              ? 'No dives from people you follow yet. Find divers on the feed or their public pages.'
              : 'No dives logged yet.'}
          </p>
          {tab === 'following' && (
            <Link href="/feed" className="inline-block mt-3 text-sm text-blue-600 hover:underline">
              Browse all dives →
            </Link>
          )}
        </div>
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

      <div className="flex gap-4 text-xs text-gray-500 mb-3">
        <span>{date}</span>
        {dive.max_depth_ft && <span>{dive.max_depth_ft} ft</span>}
        {dive.bottom_time_minutes && <span>{dive.bottom_time_minutes} min</span>}
        {dive.visibility_ft && <span>{dive.visibility_ft} ft vis</span>}
      </div>

      {dive.marine_life && dive.marine_life.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {dive.marine_life.slice(0, 5).map((s: string) => (
            <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{s}</span>
          ))}
          {dive.marine_life.length > 5 && (
            <span className="px-2 py-0.5 bg-gray-50 text-gray-400 text-xs rounded-full">+{dive.marine_life.length - 5}</span>
          )}
        </div>
      )}

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
