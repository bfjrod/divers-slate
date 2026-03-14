'use client'

import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'

type Props = {
  defaultLat?: number
  defaultLng?: number
  flyToLat?: number
  flyToLng?: number
  onChange: (lat: number, lng: number) => void
}

export default function DiveLocationPicker({ defaultLat, defaultLng, flyToLat, flyToLng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const [pinned, setPinned] = useState(!!(defaultLat && defaultLng))
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    defaultLat && defaultLng ? { lat: defaultLat, lng: defaultLng } : null
  )

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.protomaps.com/styles/v4/light/en.json?key=${process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY}`,
      center: defaultLng && defaultLat ? [defaultLng, defaultLat] : [0, 20],
      zoom: defaultLng && defaultLat ? 10 : 1.5,
    })

    mapRef.current = map

    // If we have a default position, place the marker immediately
    if (defaultLat && defaultLng) {
      const marker = new maplibregl.Marker({ color: '#0ea5e9', draggable: true })
        .setLngLat([defaultLng, defaultLat])
        .addTo(map)

      marker.on('dragend', () => {
        const ll = marker.getLngLat()
        const lat = Math.round(ll.lat * 10000) / 10000
        const lng = Math.round(ll.lng * 10000) / 10000
        setCoords({ lat, lng })
        onChange(lat, lng)
      })

      markerRef.current = marker
    }

    map.on('click', (e) => {
      const lat = Math.round(e.lngLat.lat * 10000) / 10000
      const lng = Math.round(e.lngLat.lng * 10000) / 10000

      // Move existing marker or create new one
      if (markerRef.current) {
        markerRef.current.setLngLat([lng, lat])
      } else {
        const marker = new maplibregl.Marker({ color: '#0ea5e9', draggable: true })
          .setLngLat([lng, lat])
          .addTo(map)

        marker.on('dragend', () => {
          const ll = marker.getLngLat()
          const lt = Math.round(ll.lat * 10000) / 10000
          const lg = Math.round(ll.lng * 10000) / 10000
          setCoords({ lat: lt, lng: lg })
          onChange(lt, lg)
        })

        markerRef.current = marker
      }

      setPinned(true)
      setCoords({ lat, lng })
      onChange(lat, lng)
    })

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      maplibregl.removeProtocol('pmtiles')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fly to geocoded location when parent provides new coordinates
  useEffect(() => {
    if (flyToLat == null || flyToLng == null || !mapRef.current) return
    mapRef.current.flyTo({ center: [flyToLng, flyToLat], zoom: 10, duration: 1000 })
  }, [flyToLat, flyToLng])

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden border border-gray-200" style={{ height: 280 }}>
        <div ref={containerRef} className="w-full h-full" />
        {!pinned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="bg-white/90 text-gray-500 text-xs px-3 py-1.5 rounded-full shadow-sm">
              Tap map to drop a pin
            </span>
          </div>
        )}
      </div>
      {coords && (
        <p className="text-xs text-gray-400 mt-1.5">
          {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} · drag pin to adjust
        </p>
      )}
    </div>
  )
}
