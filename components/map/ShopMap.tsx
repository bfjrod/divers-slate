'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ShopWithCoords } from '@/lib/supabase/types'

interface ShopMapProps {
  shops: ShopWithCoords[]
}

export default function ShopMap({ shops }: ShopMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    // Register PMTiles protocol so MapLibre can load Protomaps tiles
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    const map = new maplibregl.Map({
      container: containerRef.current,
      // Protomaps hosted CDN — replace YOUR_KEY with NEXT_PUBLIC_PROTOMAPS_API_KEY
      style: `https://api.protomaps.com/styles/v4/light/en.json?key=${process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY}`,
      center: [-96, 37],  // continental US center
      zoom: 4,
    })

    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      shops.forEach((shop) => {
        const popup = new maplibregl.Popup({ offset: 12, closeButton: false })
          .setHTML(
            `<div class="p-2 min-w-[160px]">
              <p class="font-semibold text-sm leading-tight">${shop.name}</p>
              ${shop.city ? `<p class="text-xs text-gray-500 mt-0.5">${shop.city}${shop.state ? `, ${shop.state}` : ''}</p>` : ''}
              <a href="/shops/${shop.slug}" class="inline-block mt-2 text-xs font-medium text-blue-600 hover:underline">
                View shop →
              </a>
            </div>`
          )

        new maplibregl.Marker({ color: '#0ea5e9' })
          .setLngLat([shop.lng, shop.lat])
          .setPopup(popup)
          .addTo(map)
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
      maplibregl.removeProtocol('pmtiles')
    }
  }, [shops])

  return <div ref={containerRef} className="w-full h-full" />
}
