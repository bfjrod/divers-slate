import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { DiveLog } from '@/lib/supabase/types'
import DiveLocationMap from '@/components/map/DiveLocationMap'
import DiveProfile from '@/components/DiveProfile'
import StarDisplay from '@/components/StarDisplay'

type DiveLogDetail = DiveLog & {
  dive_sites: { name: string; country: string | null; region: string | null; site_type: string | null } | null
}

interface Props {
  params: { id: string }
}

export default async function DiveDetailPage({ params }: Props) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: logData } = await supabase
    .from('dive_logs')
    .select('*, dive_sites(name, country, region, site_type)')
    .eq('id', params.id)
    .eq('user_id', user!.id)
    .single()
  const log = logData as DiveLogDetail | null

  if (!log) notFound()

  const site = log.dive_sites as { name: string; country: string | null; region: string | null; site_type: string | null } | null

  const dateStr = new Date(log.dive_date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-6">
        <Link href="/logbook" className="text-sm text-gray-400 hover:text-gray-600">← My Slate</Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {site?.name ?? log.custom_location ?? 'Unknown site'}
        </h1>
        <p className="mt-1 text-gray-400 text-sm">
          {dateStr}
          {log.dive_number ? ` · Dive #${log.dive_number}` : ''}
          {site?.country ? ` · ${site.country}` : ''}
        </p>
        <div className="flex items-center gap-3 mt-2">
          {log.rating && <StarDisplay rating={log.rating} size="md" />}
          <Link href={`/dives/${log.id}`} className="text-xs text-blue-500 hover:underline">
            Public view →
          </Link>
        </div>
      </div>

      {/* Location map */}
      {log.location_lat && log.location_lng && (
        <div className="mb-8 rounded-xl overflow-hidden border border-gray-100">
          <DiveLocationMap lat={Number(log.location_lat)} lng={Number(log.location_lng)} />
        </div>
      )}

      {/* Depth profile */}
      {log.profile_data && log.profile_data.length > 1 && (
        <div className="mb-8">
          <DiveProfile data={log.profile_data} maxDepthFt={log.max_depth_ft} />
        </div>
      )}

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: 'Max depth', value: log.max_depth_ft ? `${log.max_depth_ft} ft` : '—' },
          { label: 'Bottom time', value: log.bottom_time_minutes ? `${log.bottom_time_minutes} min` : '—' },
          { label: 'Visibility', value: log.visibility_ft ? `${log.visibility_ft} ft` : '—' },
        ].map((s) => (
          <div key={s.label} className="border border-gray-100 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Conditions */}
      {(log.water_temp_surface_f || log.current || log.weather || log.tide) && (
        <Section title="Conditions">
          <Grid>
            {log.water_temp_surface_f && <Stat label="Surface temp" value={`${log.water_temp_surface_f}°F`} />}
            {log.water_temp_bottom_f && <Stat label="Bottom temp" value={`${log.water_temp_bottom_f}°F`} />}
            {log.current && <Stat label="Current" value={log.current} />}
            {log.weather && <Stat label="Weather" value={log.weather} />}
            {log.tide && <Stat label="Tide" value={log.tide} />}
            {log.wave_height_ft && <Stat label="Waves" value={`${log.wave_height_ft} ft`} />}
          </Grid>
        </Section>
      )}

      {/* Gas & dive data */}
      {(log.air_in_psi || log.gas_mix || log.avg_depth_ft) && (
        <Section title="Dive data">
          <Grid>
            {log.avg_depth_ft && <Stat label="Avg depth" value={`${log.avg_depth_ft} ft`} />}
            {log.surface_interval_minutes && <Stat label="Surface interval" value={`${log.surface_interval_minutes} min`} />}
            {log.air_in_psi && <Stat label="Air in" value={`${log.air_in_psi} PSI`} />}
            {log.air_out_psi && <Stat label="Air out" value={`${log.air_out_psi} PSI`} />}
            {log.tank_size && <Stat label="Tank" value={log.tank_size.toUpperCase()} />}
            {log.gas_mix && <Stat label="Gas" value={log.gas_mix} />}
          </Grid>
        </Section>
      )}

      {/* Gear */}
      {(log.wetsuit_mm !== null || log.bcd || log.computer) && (
        <Section title="Gear">
          <Grid>
            {log.wetsuit_mm !== null && <Stat label="Wetsuit" value={log.wetsuit_mm === 0 ? 'Drysuit' : `${log.wetsuit_mm}mm`} />}
            {log.weight_lbs && <Stat label="Weight" value={`${log.weight_lbs} lbs`} />}
            {log.bcd && <Stat label="BCD" value={log.bcd} />}
            {log.computer && <Stat label="Computer" value={log.computer} />}
          </Grid>
        </Section>
      )}

      {/* Marine life */}
      {log.marine_life && log.marine_life.length > 0 && (
        <Section title="Marine life">
          <div className="flex flex-wrap gap-2">
            {log.marine_life.map((s: string) => (
              <span key={s} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">{s}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Notes */}
      {log.notes && (
        <Section title="Notes">
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{log.notes}</p>
        </Section>
      )}

      {/* Buddy + type */}
      {(log.buddy || log.dive_type || log.certification_earned) && (
        <Section title="Details">
          <Grid>
            {log.buddy && <Stat label="Buddy" value={log.buddy} />}
            {log.dive_type && <Stat label="Type" value={log.dive_type} />}
            {log.certification_earned && <Stat label="Cert earned" value={log.certification_earned} />}
          </Grid>
        </Section>
      )}

      <p className="mt-12 text-xs text-gray-300 text-center">Photos coming in the next session</p>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{children}</div>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5 capitalize">{value}</p>
    </div>
  )
}
