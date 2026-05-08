import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';
import { AFFILIATE_REF_COOKIE, normalizeAffiliateRef } from './lib/affiliateRef';

const i18nMiddleware = createMiddleware(routing);

const AFFILIATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 60; // 60 days

export async function middleware(request: NextRequest) {
  // Update Supabase session
  const supabaseResponse = await updateSession(request);

  // If Supabase decided to redirect (e.g. unauthenticated access), honor it.
  // The previous implementation always returned the i18n response which
  // effectively disabled auth redirects.
  if (supabaseResponse.status >= 300 && supabaseResponse.status < 400) {
    return supabaseResponse;
  }

  // Run i18n middleware
  const response = i18nMiddleware(request);

  // Copy Supabase cookies to the i18n response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      ...cookie,
      // Ensure options are passed correctly if needed
    });
  });

  // Primary site only: last-touch affiliate ref cookie + best-effort click ping
  if (!process.env.VENDOR_ID) {
    const refRaw = request.nextUrl.searchParams.get("ref");
    const code = normalizeAffiliateRef(refRaw);
    if (code) {
      response.cookies.set(AFFILIATE_REF_COOKIE, code, {
        maxAge: AFFILIATE_COOKIE_MAX_AGE,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      const origin = request.nextUrl.origin;
      void fetch(`${origin}/api/affiliate/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      }).catch(() => {});
    }
  }

  return response;
}

export const config = {
  // Match only internationalized pathnames, exclude API routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
