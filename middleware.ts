import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';
import { type NextRequest } from 'next/server';
import { updateSession } from './lib/supabase/middleware';

const i18nMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  // Update Supabase session
  const supabaseResponse = await updateSession(request);

  // Run i18n middleware
  const response = i18nMiddleware(request);

  // Copy Supabase cookies to the i18n response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    response.cookies.set(cookie.name, cookie.value, {
      ...cookie,
      // Ensure options are passed correctly if needed
    });
  });

  return response;
}

export const config = {
  // Match only internationalized pathnames, exclude API routes
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
};
