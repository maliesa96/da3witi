import { NextResponse } from 'next/server'
// The client you created from the server-side auth instructions
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin, pathname } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in search params, use it as the redirection URL
  const pathParts = pathname.split('/').filter(Boolean)
  const locale = pathParts[0] || 'en'
  const next = searchParams.get('next') ?? `/${locale}/dashboard`

  const redirectToAuthError = (error: string) => {
    const params = new URLSearchParams()
    params.set('error', error)
    const errorCode = searchParams.get('error_code')
    const errorDescription = searchParams.get('error_description')
    if (errorCode) params.set('error_code', errorCode)
    if (errorDescription) params.set('error_description', errorDescription)
    if (next) params.set('next', next)
    return NextResponse.redirect(`${origin}/${locale}/auth/error?${params.toString()}`)
  }

  // Supabase can redirect back with error parameters (e.g. expired/invalid link)
  if (searchParams.get('error') || searchParams.get('error_code')) {
    return redirectToAuthError(searchParams.get('error') ?? 'auth_error')
  }

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // buddy check for proxy
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        // we can be sure that it's safe to use the origin directly
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }

    return redirectToAuthError('exchange_failed')
  }

  // return the user to an error page with instructions
  return redirectToAuthError('missing_code')
}


