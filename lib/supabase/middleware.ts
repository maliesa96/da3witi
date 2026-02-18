import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_EMAILS } from '@/lib/admin'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // getUser(). A simple mistake could make it very hard to debug
  // issues with users being logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const requiresAuth = pathname.includes('/wizard') || pathname.includes('/dashboard') || pathname.includes('/admin')

  if (!user && requiresAuth) {
    const segments = pathname.split('/');
    const locale = segments[1] === 'ar' || segments[1] === 'en' ? segments[1] : 'en';
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && pathname.includes('/admin') && !ADMIN_EMAILS.includes(user.email ?? '')) {
    const segments = pathname.split('/');
    const locale = segments[1] === 'ar' || segments[1] === 'en' ? segments[1] : 'en';
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}`
    return NextResponse.redirect(url)
  }

  // IMPORTANT: You *must* return the supabaseResponse object as is. If you're creating a
  // new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but remember that it needs to depart
  //    from the response object you receive from supabase.auth.getUser().

  return supabaseResponse
}

