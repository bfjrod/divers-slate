import { createClient } from '@/lib/supabase/server'
import ShopMap from '@/components/map/ShopMap'
import type { ShopWithCoords } from '@/lib/supabase/types'

export const revalidate = 3600 // refresh shop list hourly

export default async function MapHomepage() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('shops_geo')
    .select('id, name, slug, city, state, lat, lng')

  if (error) {
    console.error('Failed to load shops:', error.message)
  }

  const shops: ShopWithCoords[] = (data ?? [])
    .filter((row) => row.lat !== null && row.lng !== null)
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      city: row.city,
      state: row.state,
      lat: row.lat!,
      lng: row.lng!,
      location: null,
      address: null,
      description: null,
      certifications_accepted: null,
      booking_platform: null,
      booking_platform_id: null,
      padi_rating: null,
      established_year: null,
      phone: null,
      website: null,
      created_at: '',
    }))

  return (
    <main className="w-screen h-screen">
      <ShopMap shops={shops} />
    </main>
  )
}
