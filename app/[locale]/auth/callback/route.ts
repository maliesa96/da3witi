import { NextResponse } from 'next/server'
// The client you created from the server-side auth instructions
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { AFFILIATE_REF_COOKIE, getCookieValue, normalizeAffiliateRef } from '@/lib/affiliateRef'

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
      const targetUrl = isLocalEnv
        ? `${origin}${next}`
        : forwardedHost
          ? `https://${forwardedHost}${next}`
          : `${origin}${next}`

      const response = NextResponse.redirect(targetUrl)

      // Primary site: lock affiliate attribution from ref cookie (first signup only)
      if (!process.env.VENDOR_ID) {
        const refRaw = getCookieValue(request.headers.get('cookie'), AFFILIATE_REF_COOKIE)
        const refCode = normalizeAffiliateRef(refRaw)
        if (refCode) {
          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user?.id) {
            const affiliate = await prisma.affiliate.findFirst({
              where: { code: refCode, active: true },
              select: { id: true },
            })
            if (affiliate) {
              await prisma.affiliateAttribution.upsert({
                where: { userId: user.id },
                create: { userId: user.id, affiliateId: affiliate.id },
                update: {},
              })
            }
          }
        }
        response.cookies.set(AFFILIATE_REF_COOKIE, '', {
          path: '/',
          maxAge: 0,
        })
      }

      return response
    }

    return redirectToAuthError('exchange_failed')
  }

  // return the user to an error page with instructions
  return redirectToAuthError('missing_code')
}


