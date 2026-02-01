import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { signInWithMagicLink } from './actions';
import MagicLinkSubmitButton from './MagicLinkSubmitButton';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Auth');

  // If already authenticated, bounce straight to dashboard (or ?next=...).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const sp = await searchParams;
    const nextRaw = typeof sp.next === 'string' ? sp.next : '';
    // Prevent open redirects / cross-locale redirects:
    // only allow absolute paths that stay within this locale.
    const localePrefix = `/${locale}`;
    const nextSafe =
      nextRaw === localePrefix || nextRaw.startsWith(`${localePrefix}/`)
        ? nextRaw
        : `/${locale}/dashboard`;
    redirect(nextSafe);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#FDFCF8] px-4 py-6">
      <div className="w-full max-w-md space-y-6 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-stone-200">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900">{t('login')}</h1>
          <p className="text-stone-500 mt-2">{t('magic_link_desc')}</p>
        </div>

        <form className="space-y-6">
          <input type="hidden" name="locale" value={locale} />
          <NextParam searchParams={searchParams} />
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
              {t('email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none transition-all"
              placeholder="name@example.com"
            />
          </div>

          <MagicLinkSubmitButton
            formAction={signInWithMagicLink}
            className="w-full bg-stone-900 text-white font-medium py-2 rounded-lg hover:bg-stone-800 transition-all shadow-sm"
          >
            {t('send_magic_link')}
          </MagicLinkSubmitButton>
        </form>

        {/* Success/Error Messages */}
        <AuthMessages searchParams={searchParams} />
      </div>
    </div>
  );
}

async function AuthMessages({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  void params;

  if (params.sent) {
    return (
      <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg text-center">
        Check your email for the sign-in link!
      </div>
    );
  }

  if (params.error) {
    return (
      <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg text-center">
        Error sending sign-in link. Please try again.
      </div>
    );
  }

  return null;
}

async function NextParam({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '';
  return <input type="hidden" name="next" value={next} />;
}

