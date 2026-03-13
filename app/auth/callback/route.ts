import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/logbook'

  if (code) {
    const supabase = createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Upsert user profile row on first login
      await supabase.from('users').upsert(
        {
          id: data.user.id,
          display_name: data.user.user_metadata?.full_name ?? null,
          avatar_url: data.user.user_metadata?.avatar_url ?? null,
        },
        { onConflict: 'id', ignoreDuplicates: true }
      )

      // Check if username is set — if not, send to profile to pick one
      const { data: profile } = await supabase
        .from('users')
        .select('username')
        .eq('id', data.user.id)
        .single()

      if (!profile?.username) {
        return NextResponse.redirect(`${origin}/profile?onboarding=1`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
