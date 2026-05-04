import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin, pathname } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = (searchParams.get('type') ?? 'invite') as EmailOtpType
  const pathParts = pathname.split('/').filter(Boolean)
  const locale = pathParts[0] || 'en'
  const next = searchParams.get('next') ?? `/${locale}/dashboard`

  const redirectToAuthError = (error: string) => {
    const params = new URLSearchParams()
    params.set('error', error)
    if (next) params.set('next', next)
    return NextResponse.redirect(`${origin}/${locale}/auth/error?${params.toString()}`)
  }

  if (!token_hash) {
    return redirectToAuthError('missing_token')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })

  if (error) {
    console.error('[Auth Confirm] OTP verification failed:', error.message)
    return redirectToAuthError('invite_expired')
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`)
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`)
  } else {
    return NextResponse.redirect(`${origin}${next}`)
  }
}
