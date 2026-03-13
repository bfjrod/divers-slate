import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

interface Props {
  params: { slug: string }
}

export default async function ShopProfilePage({ params }: Props) {
  const supabase = createClient()

  const { data: shop } = await supabase
    .from('shops')
    .select('id, name, city, state, address, website, phone, description, padi_rating')
    .eq('slug', params.slug)
    .single()

  if (!shop) notFound()

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold">{shop.name}</h1>
      {(shop.city || shop.state) && (
        <p className="mt-1 text-gray-500">
          {[shop.city, shop.state].filter(Boolean).join(', ')}
        </p>
      )}
      {shop.address && <p className="mt-2 text-sm text-gray-400">{shop.address}</p>}
      {shop.description && <p className="mt-4">{shop.description}</p>}

      <div className="mt-6 flex gap-4">
        {shop.website && (
          <a href={shop.website} target="_blank" rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline">
            Website →
          </a>
        )}
        {shop.phone && (
          <a href={`tel:${shop.phone}`} className="text-sm text-blue-600 hover:underline">
            {shop.phone}
          </a>
        )}
      </div>

      <p className="mt-12 text-xs text-gray-300">Shop profile — full page coming in Session 4</p>
    </main>
  )
}
