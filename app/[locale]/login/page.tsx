import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import PasswordLoginForm from './PasswordLoginForm';
import MagicLinkForm from './MagicLinkForm';

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
  const sp = await searchParams;
  const mode = sp.mode === 'magic' ? 'magic' : 'password'; // default to password

  // If already authenticated, bounce straight to dashboard (or ?next=...).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
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
          <p className="text-stone-500 mt-2 text-sm">
            {t('dont_have_account')}{' '}
            <Link 
              href={`/${locale}/signup`} 
              className="text-stone-900 font-medium hover:underline"
            >
              {t('signup')}
            </Link>
          </p>
        </div>

        {mode === 'password' ? (
          <PasswordLoginForm 
            locale={locale} 
            next={typeof sp.next === 'string' ? sp.next : ''} 
          />
        ) : (
          <MagicLinkForm 
            locale={locale} 
            next={typeof sp.next === 'string' ? sp.next : ''} 
          />
        )}

        {/* Toggle login method */}
        <div className="text-center">
          <Link
            href={`/${locale}/login?mode=${mode === 'password' ? 'magic' : 'password'}${sp.next ? `&next=${sp.next}` : ''}`}
            className="text-sm text-stone-600 hover:text-stone-900 hover:underline"
          >
            {mode === 'password' ? t('login_with_magic_link') : t('login_with_password')}
          </Link>
        </div>

        {/* Success/Error Messages */}
        <AuthMessages searchParams={searchParams} />
      </div>
    </div>
  );
}


async function AuthMessages({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const t = await getTranslations('Auth');

  if (params.sent) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
        <div className="font-medium mb-1">✓ Email sent!</div>
        <div className="text-green-700">{t('check_email')}</div>
      </div>
    );
  }

  if (params.success === 'account_created') {
    return (
      <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
        <div className="font-medium mb-1">✓ Account created!</div>
        <div className="text-green-700">{t('check_email_confirm')}</div>
      </div>
    );
  }

  if (params.updated) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
        <div className="font-medium mb-1">✓ Password updated!</div>
        <div className="text-green-700">{t('password_updated')}</div>
      </div>
    );
  }

  if (params.error) {
    let errorMessage = t('error_login');
    
    // Map error codes to user-friendly messages
    const errorMap: Record<string, string> = {
      'invalid_credentials': 'error_invalid_credentials',
      'email_not_confirmed': 'check_email_confirm',
      'invalid_email': 'error_invalid_email',
      'magic_link_failed': 'error_magic_link',
      'login_failed': 'error_login',
    };
    
    const errorKey = errorMap[params.error as string] || 'error_login';
    errorMessage = t(errorKey as any);

    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg">
        <div className="font-medium mb-1">⚠ Unable to sign in</div>
        <div className="text-red-700">{errorMessage}</div>
      </div>
    );
  }

  return null;
}


