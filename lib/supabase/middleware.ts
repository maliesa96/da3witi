import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_EMAILS } from '../admin-emails'
import { COOKIE_NAME } from './cookieName'

const VENDOR_ID = process.env.VENDOR_ID || null;
const _isVendorMode = !!VENDOR_ID;

let _vendorAdminEmailsCache: string[] | null = null;
let _vendorAdminEmailsCacheTime = 0;
const CACHE_TTL_MS = 60_000;

async function getVendorAdminEmails(
  supabase: ReturnType<typeof createServerClient>
): Promise<string[]> {
  if (!VENDOR_ID) return [];
  const now = Date.now();
  if (_vendorAdminEmailsCache && now - _vendorAdminEmailsCacheTime < CACHE_TTL_MS) {
    return _vendorAdminEmailsCache;
  }
  const { data } = await supabase
    .from("vendors")
    .select("admin_emails")
    .eq("id", VENDOR_ID)
    .single();
  _vendorAdminEmailsCache = (data?.admin_emails as string[]) ?? [];
  _vendorAdminEmailsCacheTime = now;
  return _vendorAdminEmailsCache;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      ...(COOKIE_NAME ? { cookieOptions: { name: COOKIE_NAME } } : {}),
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
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

  if (_isVendorMode && pathname.includes('/signup')) {
    const segments = pathname.split('/');
    const locale = segments[1] === 'ar' || segments[1] === 'en' ? segments[1] : 'en';
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    return NextResponse.redirect(url)
  }

  // Vendor sites have no admin dashboard — block /admin entirely
  if (_isVendorMode && pathname.includes('/admin')) {
    const segments = pathname.split('/');
    const locale = segments[1] === 'ar' || segments[1] === 'en' ? segments[1] : 'en';
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}`
    return NextResponse.redirect(url)
  }

  const requiresAuth = pathname.includes('/wizard') || pathname.includes('/dashboard') || pathname.includes('/admin')

  if (!user && requiresAuth) {
    const segments = pathname.split('/');
    const locale = segments[1] === 'ar' || segments[1] === 'en' ? segments[1] : 'en';
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && (pathname.includes('/admin') || (_isVendorMode && pathname.includes('/wizard')))) {
    const vendorAdminEmails = _isVendorMode ? await getVendorAdminEmails(supabase) : [];
    const isAllowed = _isVendorMode
      ? vendorAdminEmails.includes(user.email!) || ADMIN_EMAILS.includes(user.email!)
      : ADMIN_EMAILS.includes(user.email!);

    if (!isAllowed) {
      const segments = pathname.split('/');
      const locale = segments[1] === 'ar' || segments[1] === 'en' ? segments[1] : 'en';
      const url = request.nextUrl.clone()
      if (pathname.includes('/admin')) {
        url.pathname = `/${locale}`
      } else {
        url.pathname = `/${locale}/dashboard`
      }
      return NextResponse.redirect(url)
    }
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

