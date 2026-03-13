'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'

type Props = {
  lat: number
  lng: number
  height?: number
}

export default function DiveLocationMap({ lat, lng, height = 200 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.protomaps.com/styles/v4/light/en.json?key=${process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY}`,
      center: [lng, lat],
      zoom: 10,
      interactive: false,
    })

    mapRef.current = map

    map.on('load', () => {
      new maplibregl.Marker({ color: '#0ea5e9' })
        .setLngLat([lng, lat])
        .addTo(map)
    })

    return () => {
      map.remove()
      mapRef.current = null
      maplibregl.removeProtocol('pmtiles')
    }
  }, [lat, lng])

  return <div ref={containerRef} className="w-full" style={{ height }} />
}
