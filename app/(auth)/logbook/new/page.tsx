'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { DiveSite } from '@/lib/supabase/types'
import type { ProfilePoint } from '@/lib/uddf/parse'
import { parseUddfString, type ParsedDive, type UddfParseResult } from '@/lib/uddf/parse'
import DiveLocationPicker from '@/components/map/DiveLocationPicker'
import StarPicker from '@/components/StarPicker'

const STEPS = ['Where', 'Computer', 'Dive data', 'Conditions', 'Gear', 'Notes']

const MARINE_LIFE_OPTIONS = [
  'Sea turtle', 'Nurse shark', 'Reef shark', 'Whale shark', 'Manta ray',
  'Eagle ray', 'Moray eel', 'Octopus', 'Cuttlefish', 'Seahorse',
  'Lionfish', 'Barracuda', 'Grouper', 'Pufferfish', 'Clownfish',
  'Nudibranch', 'Lobster', 'Dolphin', 'Manatee', 'Hammerhead',
]

type FormState = {
  // Step 1 — Where
  dive_site_id: string
  custom_location: string
  shop_name: string

  // Step 3 — Dive data (pre-fillable from UDDF)
  dive_date: string
  dive_number: string
  max_depth_ft: string
  avg_depth_ft: string
  bottom_time_minutes: string
  surface_interval_minutes: string
  air_in_psi: string
  air_out_psi: string
  tank_size: string
  gas_mix: string
  computer: string

  // Step 4 — Conditions (pre-fillable from UDDF)
  visibility_ft: string
  water_temp_surface_f: string
  water_temp_bottom_f: string
  current: string
  weather: string
  wave_height_ft: string
  tide: string

  // Step 5 — Gear
  wetsuit_mm: string
  weight_lbs: string
  bcd: string

  // Step 6 — Notes
  notes: string
  marine_life: string[]
  buddy: string
  dive_type: string
  certification_earned: string
  rating: number
  is_public: boolean

  // Location pin
  location_lat: number | null
  location_lng: number | null
}

const initial: FormState = {
  dive_site_id: '', custom_location: '', shop_name: '',
  dive_date: new Date().toISOString().split('T')[0],
  dive_number: '', max_depth_ft: '', avg_depth_ft: '',
  bottom_time_minutes: '', surface_interval_minutes: '',
  air_in_psi: '', air_out_psi: '', tank_size: '', gas_mix: 'air', computer: '',
  visibility_ft: '', water_temp_surface_f: '', water_temp_bottom_f: '',
  current: 'none', weather: '', wave_height_ft: '', tide: '',
  wetsuit_mm: '', weight_lbs: '', bcd: '',
  notes: '', marine_life: [], buddy: '', dive_type: 'recreational', certification_earned: '', rating: 0,
  is_public: false, location_lat: null, location_lng: null,
}

export default function NewDivePage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(initial)

  // Site search
  const [siteSearch, setSiteSearch] = useState('')
  const [siteResults, setSiteResults] = useState<DiveSite[]>([])
  const [selectedSite, setSelectedSite] = useState<DiveSite | null>(null)
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false)

  // Geocoded map center from custom location
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null)
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // UDDF state (Step 2)
  const [uddfFile, setUddfFile] = useState<File | null>(null)
  const [uddfParsed, setUddfParsed] = useState<UddfParseResult | null>(null)
  const [uddfError, setUddfError] = useState<string | null>(null)
  const [uddfSelectedIndex, setUddfSelectedIndex] = useState<number | null>(null)
  // profile_data lives outside FormState (not a string field)
  const profileDataRef = useRef<ProfilePoint[] | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  // Site search
  async function searchSites(q: string) {
    setSiteSearch(q)
    if (q.length < 2) { setSiteResults([]); setSiteDropdownOpen(false); return }
    setSiteDropdownOpen(true)
    const { data } = await supabase
      .from('dive_sites')
      .select('id, name, country, region, site_type, max_depth_ft, avg_depth_ft, avg_visibility_ft, log_count, created_by, created_at, slug, location')
      .ilike('name', `%${q}%`)
      .limit(6)
    setSiteResults(data ?? [])
  }

  function closeSiteDropdown() {
    // Delay so button clicks inside the dropdown register before it hides
    blurTimerRef.current = setTimeout(() => setSiteDropdownOpen(false), 150)
  }

  async function createSite() {
    if (!siteSearch.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const slug = siteSearch.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { data, error: err } = await supabase
      .from('dive_sites')
      .insert({ name: siteSearch.trim(), slug, created_by: user.id })
      .select('id, name, country, region, site_type, max_depth_ft, avg_depth_ft, avg_visibility_ft, log_count, created_by, created_at, slug, location')
      .single()
    if (!err && data) pickSite(data)
  }

  function pickSite(site: DiveSite) {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current)
    setSelectedSite(site)
    set('dive_site_id', site.id)
    setSiteSearch(site.name)
    setSiteResults([])
    setSiteDropdownOpen(false)
  }

  function clearSite() {
    setSelectedSite(null)
    set('dive_site_id', '')
    setSiteSearch('')
  }

  async function geocodeCustomLocation(q: string) {
    if (!q.trim() || q.trim().length < 3) return
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      )
      const json = await res.json()
      if (json?.[0]) {
        setMapCenter({ lat: parseFloat(json[0].lat), lng: parseFloat(json[0].lon) })
      }
    } catch {
      // silently ignore geocoding failures
    }
  }

  // UDDF
  function handleUddfFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.uddf')) {
      setUddfError('Please select a .uddf file')
      return
    }
    setUddfError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const xml = ev.target?.result as string
      const result = parseUddfString(xml)
      if (result.fatalError) { setUddfError(result.fatalError); return }
      if (result.dives.length === 0) { setUddfError('No dives found in this file'); return }
      setUddfFile(f)
      setUddfParsed(result)
      // Auto-select if only one dive
      if (result.dives.length === 1) selectUddfDive(result.dives[0], 0)
    }
    reader.readAsText(f)
  }

  function selectUddfDive(dive: ParsedDive, index: number) {
    setUddfSelectedIndex(index)
    profileDataRef.current = dive.profileData ?? null
    setForm((f) => ({
      ...f,
      dive_number:              dive.diveNumber !== null ? String(dive.diveNumber) : f.dive_number,
      dive_date:                dive.diveDate ?? f.dive_date,
      max_depth_ft:             dive.maxDepthFt !== null ? String(dive.maxDepthFt) : f.max_depth_ft,
      avg_depth_ft:             dive.avgDepthFt !== null ? String(dive.avgDepthFt) : f.avg_depth_ft,
      bottom_time_minutes:      dive.bottomTimeMinutes !== null ? String(dive.bottomTimeMinutes) : f.bottom_time_minutes,
      surface_interval_minutes: dive.surfaceIntervalMinutes !== null ? String(dive.surfaceIntervalMinutes) : f.surface_interval_minutes,
      water_temp_surface_f:     dive.waterTempSurfaceF !== null ? String(dive.waterTempSurfaceF) : f.water_temp_surface_f,
      water_temp_bottom_f:      dive.waterTempBottomF !== null ? String(dive.waterTempBottomF) : f.water_temp_bottom_f,
      air_in_psi:               dive.airInPsi !== null ? String(dive.airInPsi) : f.air_in_psi,
      air_out_psi:              dive.airOutPsi !== null ? String(dive.airOutPsi) : f.air_out_psi,
      tank_size:                dive.tankSize ?? f.tank_size,
      computer:                 dive.computerName ?? f.computer,
    }))
  }

  function clearUddfSelection() {
    setUddfSelectedIndex(null)
    profileDataRef.current = null
  }

  function toggleMarineLife(species: string) {
    setForm((f) => ({
      ...f,
      marine_life: f.marine_life.includes(species)
        ? f.marine_life.filter((s) => s !== species)
        : [...f.marine_life, species],
    }))
  }

  async function submit() {
    setSubmitting(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Upload raw UDDF file if one was used
    let uddfFileUrl: string | null = null
    if (uddfFile) {
      const storagePath = `${user.id}/${Date.now()}-${uddfFile.name}`
      const { error: uploadErr } = await supabase.storage
        .from('dive-files')
        .upload(storagePath, uddfFile, { contentType: 'application/octet-stream', upsert: false })
      if (!uploadErr) uddfFileUrl = storagePath
    }

    const n = (v: string) => (v === '' ? null : Number(v))

    const { data, error: insertErr } = await supabase
      .from('dive_logs')
      .insert({
        user_id: user.id,
        dive_site_id: form.dive_site_id || null,
        custom_location: form.custom_location || null,
        dive_date: form.dive_date,
        dive_number: n(form.dive_number),
        max_depth_ft: n(form.max_depth_ft),
        avg_depth_ft: n(form.avg_depth_ft),
        bottom_time_minutes: n(form.bottom_time_minutes) as number | null,
        surface_interval_minutes: n(form.surface_interval_minutes),
        air_in_psi: n(form.air_in_psi),
        air_out_psi: n(form.air_out_psi),
        tank_size: form.tank_size || null,
        gas_mix: form.gas_mix || null,
        visibility_ft: n(form.visibility_ft),
        water_temp_surface_f: n(form.water_temp_surface_f),
        water_temp_bottom_f: n(form.water_temp_bottom_f),
        current: form.current || null,
        weather: form.weather || null,
        wave_height_ft: n(form.wave_height_ft),
        tide: form.tide || null,
        wetsuit_mm: n(form.wetsuit_mm),
        weight_lbs: n(form.weight_lbs),
        bcd: form.bcd || null,
        computer: form.computer || null,
        notes: form.notes || null,
        marine_life: form.marine_life.length > 0 ? form.marine_life : null,
        buddy: form.buddy || null,
        dive_type: form.dive_type || null,
        certification_earned: form.certification_earned || null,
        location_lat: form.location_lat,
        location_lng: form.location_lng,
        rating: form.rating || null,
        is_public: form.is_public,
        profile_data: profileDataRef.current,
        uddf_file_url: uddfFileUrl,
      })
      .select('id')
      .single()

    if (insertErr || !data) {
      setError(insertErr?.message ?? 'Failed to save dive')
      setSubmitting(false)
      return
    }

    router.push(`/logbook/${data.id}`)
  }

  const selectedDive = uddfParsed && uddfSelectedIndex !== null ? uddfParsed.dives[uddfSelectedIndex] : null

  return (
    <main className="max-w-xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <h1 className="text-xl font-bold text-gray-900">Log a dive</h1>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? 'bg-blue-600' : 'bg-gray-100'}`} />
            <p className={`text-xs mt-1 ${i === step ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>{s}</p>
          </div>
        ))}
      </div>

      {/* Step 1 — Where */}
      {step === 0 && (
        <div className="space-y-4">
          <div>
            <label className="label">Dive site</label>
            {selectedSite ? (
              <div className="flex items-center justify-between px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedSite.name}</p>
                  {selectedSite.country && <p className="text-xs text-gray-500">{selectedSite.country}</p>}
                </div>
                <button onClick={clearSite} className="text-xs text-gray-400 hover:text-gray-600">Change</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={siteSearch}
                  onChange={(e) => searchSites(e.target.value)}
                  onBlur={closeSiteDropdown}
                  onFocus={() => siteSearch.length >= 2 && setSiteDropdownOpen(true)}
                  placeholder="Search dive sites…"
                  className="input"
                />
                {siteDropdownOpen && siteSearch.length >= 2 && (
                  <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                    {siteResults.map((site) => (
                      <li key={site.id}>
                        <button type="button" onClick={() => pickSite(site)} className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors">
                          <p className="text-sm font-medium text-gray-900">{site.name}</p>
                          {site.country && <p className="text-xs text-gray-400">{site.country}{site.region ? ` · ${site.region}` : ''}</p>}
                        </button>
                      </li>
                    ))}
                    {siteResults.length === 0 && (
                      <li>
                        <button type="button" onClick={createSite} className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors">
                          <p className="text-sm text-blue-600">+ Add &ldquo;{siteSearch}&rdquo; as a new site</p>
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}
          </div>

          {!selectedSite && (
            <div>
              <label className="label">Or enter a custom location</label>
              <input
                type="text"
                value={form.custom_location}
                onChange={(e) => set('custom_location', e.target.value)}
                onBlur={(e) => geocodeCustomLocation(e.target.value)}
                placeholder="e.g. Blue Heron Bridge, FL"
                className="input"
              />
            </div>
          )}

          <div>
            <label className="label">
              Drop a pin <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <DiveLocationPicker
              defaultLat={form.location_lat ?? undefined}
              defaultLng={form.location_lng ?? undefined}
              flyToLat={mapCenter?.lat}
              flyToLng={mapCenter?.lng}
              onChange={(lat, lng) => setForm((f) => ({ ...f, location_lat: lat, location_lng: lng }))}
            />
          </div>
        </div>
      )}

      {/* Step 2 — Computer */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Upload your dive computer export to pre-fill depth, time, and temperature. Skip if you&rsquo;ll enter data manually.</p>

          {!uddfParsed ? (
            /* A: No file yet */
            <div>
              <label
                htmlFor="uddf-input"
                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 rounded-xl p-10 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
              >
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0-3 3m3-3 3 3M6 20h12a2 2 0 002-2V8a2 2 0 00-.586-1.414l-4-4A2 2 0 0013.172 2H6a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm font-medium text-gray-600">Choose .uddf file</span>
                <span className="text-xs text-gray-400">Garmin Dive app · Suunto DM · any UDDF 3.x</span>
                <input id="uddf-input" type="file" accept=".uddf" className="sr-only" onChange={handleUddfFile} />
              </label>
              {uddfError && <p className="text-sm text-red-500 mt-2">{uddfError}</p>}
            </div>
          ) : selectedDive ? (
            /* C: Dive selected */
            <div className="border border-green-200 bg-green-50 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    ✓ Dive #{selectedDive.diveNumber ?? uddfSelectedIndex! + 1}
                    {selectedDive.diveDate ? ` · ${new Date(selectedDive.diveDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                    {selectedDive.maxDepthFt ? ` · ${selectedDive.maxDepthFt}ft` : ''}
                    {selectedDive.bottomTimeMinutes ? ` · ${selectedDive.bottomTimeMinutes}min` : ''}
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">Depth, time, temps{selectedDive.profileData ? ', and dive profile' : ''} pre-filled.</p>
                </div>
                <button onClick={clearUddfSelection} className="text-xs text-gray-400 hover:text-gray-600 shrink-0 ml-3">Change</button>
              </div>
            </div>
          ) : (
            /* B: File parsed, pick a dive */
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Found {uddfParsed.dives.length} dives
                {uddfParsed.computerName ? ` from ${uddfParsed.computerName}` : ''}
                . Pick one:
              </p>
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                {uddfParsed.dives.map((dive, i) => {
                  const date = dive.diveDate
                    ? new Date(dive.diveDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : 'Unknown date'
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => selectUddfDive(dive, i)}
                        className="w-full flex items-center gap-4 px-4 py-3 bg-white hover:bg-blue-50 transition-colors text-left"
                      >
                        <span className="w-8 text-center text-xs text-gray-300 font-mono shrink-0">#{dive.diveNumber ?? i + 1}</span>
                        <span className="flex-1 text-sm text-gray-700">{date}</span>
                        <div className="flex gap-4 text-right shrink-0">
                          {dive.maxDepthFt && <div><p className="text-sm font-medium text-gray-700">{dive.maxDepthFt}ft</p></div>}
                          {dive.bottomTimeMinutes && <div><p className="text-sm font-medium text-gray-700">{dive.bottomTimeMinutes}min</p></div>}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Step 3 — Dive data */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input type="date" value={form.dive_date} onChange={(e) => set('dive_date', e.target.value)} className="input" required />
            </div>
            <div>
              <label className="label">Dive #</label>
              <input type="number" value={form.dive_number} onChange={(e) => set('dive_number', e.target.value)} placeholder="e.g. 47" className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Max depth (ft)</label>
              <input type="number" value={form.max_depth_ft} onChange={(e) => set('max_depth_ft', e.target.value)} placeholder="60" className="input" />
            </div>
            <div>
              <label className="label">Avg depth (ft)</label>
              <input type="number" value={form.avg_depth_ft} onChange={(e) => set('avg_depth_ft', e.target.value)} placeholder="40" className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Bottom time (min)</label>
              <input type="number" value={form.bottom_time_minutes} onChange={(e) => set('bottom_time_minutes', e.target.value)} placeholder="45" className="input" />
            </div>
            <div>
              <label className="label">Surface interval (min)</label>
              <input type="number" value={form.surface_interval_minutes} onChange={(e) => set('surface_interval_minutes', e.target.value)} placeholder="60" className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Air in (PSI)</label>
              <input type="number" value={form.air_in_psi} onChange={(e) => set('air_in_psi', e.target.value)} placeholder="3000" className="input" />
            </div>
            <div>
              <label className="label">Air out (PSI)</label>
              <input type="number" value={form.air_out_psi} onChange={(e) => set('air_out_psi', e.target.value)} placeholder="500" className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tank</label>
              <select value={form.tank_size} onChange={(e) => set('tank_size', e.target.value)} className="input">
                <option value="">—</option>
                {['al80', 'al63', 'hp100', 'lp85', 'lp108'].map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Gas mix</label>
              <select value={form.gas_mix} onChange={(e) => set('gas_mix', e.target.value)} className="input">
                {['air', 'ean32', 'ean36', 'ean40', 'trimix'].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Conditions */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Visibility (ft)</label>
              <input type="number" value={form.visibility_ft} onChange={(e) => set('visibility_ft', e.target.value)} placeholder="60" className="input" />
            </div>
            <div>
              <label className="label">Surface temp (°F)</label>
              <input type="number" value={form.water_temp_surface_f} onChange={(e) => set('water_temp_surface_f', e.target.value)} placeholder="78" className="input" />
            </div>
            <div>
              <label className="label">Bottom temp (°F)</label>
              <input type="number" value={form.water_temp_bottom_f} onChange={(e) => set('water_temp_bottom_f', e.target.value)} placeholder="72" className="input" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Current</label>
              <select value={form.current} onChange={(e) => set('current', e.target.value)} className="input">
                {['none', 'mild', 'moderate', 'strong'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Weather</label>
              <select value={form.weather} onChange={(e) => set('weather', e.target.value)} className="input">
                <option value="">—</option>
                {['sunny', 'cloudy', 'rough'].map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tide</label>
              <select value={form.tide} onChange={(e) => set('tide', e.target.value)} className="input">
                <option value="">—</option>
                {['incoming', 'outgoing', 'slack'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Wave height (ft)</label>
            <input type="number" step="0.5" value={form.wave_height_ft} onChange={(e) => set('wave_height_ft', e.target.value)} placeholder="1.5" className="input w-32" />
          </div>
        </div>
      )}

      {/* Step 5 — Gear */}
      {step === 4 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Wetsuit (mm)</label>
              <select value={form.wetsuit_mm} onChange={(e) => set('wetsuit_mm', e.target.value)} className="input">
                <option value="">—</option>
                <option value="0">Drysuit</option>
                {[3, 5, 7].map((n) => <option key={n} value={n}>{n}mm</option>)}
              </select>
            </div>
            <div>
              <label className="label">Weight (lbs)</label>
              <input type="number" step="0.5" value={form.weight_lbs} onChange={(e) => set('weight_lbs', e.target.value)} placeholder="16" className="input" />
            </div>
          </div>
          <div>
            <label className="label">BCD</label>
            <input type="text" value={form.bcd} onChange={(e) => set('bcd', e.target.value)} placeholder="Scubapro Hydros Pro" className="input" />
          </div>
          <div>
            <label className="label">Dive computer</label>
            <input type="text" value={form.computer} onChange={(e) => set('computer', e.target.value)} placeholder="Garmin Descent Mk2" className="input" />
          </div>
        </div>
      )}

      {/* Step 6 — Notes */}
      {step === 5 && (
        <div className="space-y-4">
          <div>
            <label className="label">Overall rating</label>
            <StarPicker value={form.rating} onChange={(r) => setForm((f) => ({ ...f, rating: r }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Dive type</label>
              <select value={form.dive_type} onChange={(e) => set('dive_type', e.target.value)} className="input">
                {['recreational', 'training', 'technical', 'freediving'].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Buddy</label>
              <input type="text" value={form.buddy} onChange={(e) => set('buddy', e.target.value)} placeholder="Alex" className="input" />
            </div>
          </div>
          <div>
            <label className="label">Marine life spotted</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {MARINE_LIFE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleMarineLife(s)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    form.marine_life.includes(s)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Visibility was exceptional. Spotted a large green sea turtle resting on the reef…"
              rows={4}
              className="input resize-none"
            />
          </div>
          {form.dive_type === 'training' && (
            <div>
              <label className="label">Certification earned</label>
              <input type="text" value={form.certification_earned} onChange={(e) => set('certification_earned', e.target.value)} placeholder="PADI Open Water" className="input" />
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-700">Show my name on this dive</p>
              <p className="text-xs text-gray-400">Dive data is always public; this adds your identity</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.is_public}
              onClick={() => setForm((f) => ({ ...f, is_public: !f.is_public }))}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${form.is_public ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_public ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 0}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-0 transition-colors"
        >
          ← Back
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {step === 1 && !selectedDive ? 'Skip →' : 'Next →'}
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving…' : 'Save dive'}
          </button>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-600 text-center">{error}</p>}
    </main>
  )
}
