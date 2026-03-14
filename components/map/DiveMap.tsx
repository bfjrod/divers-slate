'use client'

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import 'maplibre-gl/dist/maplibre-gl.css'

export type DivePin = {
  id: string
  lat: number
  lng: number
  dive_date: string
  max_depth_ft: number | null
  bottom_time_minutes: number | null
  site_name: string | null
}

export type SitePin = {
  id: string
  slug: string | null
  name: string
  lat: number
  lng: number
  log_count: number
  site_type: string | null
  max_depth_ft: number | null
}

type Props = {
  dives?: DivePin[]
  sites?: SitePin[]
}

export default function DiveMap({ dives = [], sites = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.protomaps.com/styles/v4/light/en.json?key=${process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY}`,
      center: [0, 20],
      zoom: 1.5,
    })

    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      // Site pins — amber, larger
      sites.forEach((site) => {
        const popup = new maplibregl.Popup({ offset: 12, closeButton: false, maxWidth: '220px' })
          .setHTML(
            `<div style="padding:8px;min-width:160px">
              <p style="font-weight:600;font-size:13px;margin:0 0 2px">${site.name}</p>
              <p style="font-size:11px;color:#6b7280;margin:0 0 6px">${site.site_type ?? 'dive site'} · ${site.log_count} dive${site.log_count !== 1 ? 's' : ''}${site.max_depth_ft ? ` · ${site.max_depth_ft}ft max` : ''}</p>
              ${site.slug ? `<a href="/sites/${site.slug}" style="font-size:11px;color:#d97706;text-decoration:none">View site →</a>` : ''}
            </div>`
          )

        const el = document.createElement('div')
        el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:#f59e0b;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.25);cursor:pointer'

        new maplibregl.Marker({ element: el })
          .setLngLat([site.lng, site.lat])
          .setPopup(popup)
          .addTo(map)
      })

      // Dive pins — blue
      dives.forEach((dive) => {
        const date = new Date(dive.dive_date + 'T12:00:00').toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
        })

        const popup = new maplibregl.Popup({ offset: 12, closeButton: false, maxWidth: '200px' })
          .setHTML(
            `<div style="padding:8px;min-width:140px">
              <p style="font-weight:600;font-size:13px;margin:0 0 2px">${dive.site_name ?? 'Open water'}</p>
              <p style="font-size:11px;color:#6b7280;margin:0 0 6px">${date}${dive.max_depth_ft ? ` · ${dive.max_depth_ft}ft` : ''}${dive.bottom_time_minutes ? ` · ${dive.bottom_time_minutes}min` : ''}</p>
              <a href="/dives/${dive.id}" style="font-size:11px;color:#2563eb;text-decoration:none">View dive →</a>
            </div>`
          )

        new maplibregl.Marker({ color: '#0ea5e9' })
          .setLngLat([dive.lng, dive.lat])
          .setPopup(popup)
          .addTo(map)
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
      maplibregl.removeProtocol('pmtiles')
    }
  }, [dives, sites])

  return <div ref={containerRef} className="w-full h-full" />
}
