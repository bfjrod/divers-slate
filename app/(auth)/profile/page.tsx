'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@/lib/supabase/types'

const CERT_LEVELS = ['open_water', 'advanced', 'rescue', 'divemaster', 'instructor']
const CERT_AGENCIES = ['PADI', 'NAUI', 'SSI', 'BSAC', 'SDI', 'GUE']

export default function ProfilePage() {
  return <Suspense><ProfileForm /></Suspense>
}

function ProfileForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isOnboarding = searchParams.get('onboarding') === '1'
  const supabase = createClient()

  const [form, setForm] = useState({
    display_name: '',
    username: '',
    home_city: '',
    cert_level: '',
    cert_agency: '',
  })
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: raw } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      const data = raw as User | null
      if (data) {
        setForm({
          display_name: data.display_name ?? '',
          username: data.username ?? '',
          home_city: data.home_city ?? '',
          cert_level: data.cert_level ?? '',
          cert_agency: data.cert_agency ?? '',
        })
      }
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced username availability check
  useEffect(() => {
    if (!form.username || form.username.length < 3) {
      setUsernameAvailable(null)
      return
    }
    const timer = setTimeout(async () => {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', form.username)
        .maybeSingle()
      const { data: { user } } = await supabase.auth.getUser()
      setUsernameAvailable(!existing || existing.id === user?.id)
    }, 400)
    return () => clearTimeout(timer)
  }, [form.username]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.username) { setError('Username is required'); return }
    if (usernameAvailable === false) { setError('Username is taken'); return }
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // upsert so email-signup users (who skip OAuth callback) get a row created
    const { error: saveErr } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        display_name: form.display_name || null,
        username: form.username,
        home_city: form.home_city || null,
        cert_level: form.cert_level || null,
        cert_agency: form.cert_agency || null,
      })

    if (saveErr) { setError(saveErr.message); setSaving(false); return }
    router.push('/logbook')
  }

  function field(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {isOnboarding ? 'Set up your slate' : 'Edit profile'}
        </h1>
        {isOnboarding && (
          <p className="text-sm text-gray-500 mb-6">Just a few details to get started.</p>
        )}

        <form onSubmit={save} className="mt-6 space-y-4">
          <Field label="Display name">
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => field('display_name', e.target.value)}
              placeholder="Jane Doe"
              className="input"
            />
          </Field>

          <Field label="Username" hint={
            form.username.length >= 3
              ? usernameAvailable === true ? '✓ Available' : usernameAvailable === false ? '✗ Taken' : ''
              : ''
          }>
            <input
              type="text"
              value={form.username}
              onChange={(e) => field('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="janediver"
              required
              className="input"
            />
          </Field>

          <Field label="Home city">
            <input
              type="text"
              value={form.home_city}
              onChange={(e) => field('home_city', e.target.value)}
              placeholder="Key Largo, FL"
              className="input"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cert level">
              <select value={form.cert_level} onChange={(e) => field('cert_level', e.target.value)} className="input">
                <option value="">—</option>
                {CERT_LEVELS.map((l) => <option key={l} value={l}>{l.replace('_', ' ')}</option>)}
              </select>
            </Field>
            <Field label="Agency">
              <select value={form.cert_agency} onChange={(e) => field('cert_agency', e.target.value)} className="input">
                <option value="">—</option>
                {CERT_AGENCIES.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving || usernameAvailable === false}
            className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : isOnboarding ? 'Start diving' : 'Save changes'}
          </button>
        </form>
      </div>
    </main>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        {hint && <span className={`text-xs ${hint.startsWith('✓') ? 'text-green-600' : 'text-red-500'}`}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}
