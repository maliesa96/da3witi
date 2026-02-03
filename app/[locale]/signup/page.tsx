import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import SignupForm from './SignupForm';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SignupPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Auth');

  // If already authenticated, bounce straight to dashboard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const sp = await searchParams;
    const nextRaw = typeof sp.next === 'string' ? sp.next : '';
    const localePrefix = `/${locale}`;
    const nextSafe =
      nextRaw === localePrefix || nextRaw.startsWith(`${localePrefix}/`)
        ? nextRaw
        : `/${locale}/dashboard`;
    redirect(nextSafe);
  }

  const sp = await searchParams;
  const nextParam = typeof sp.next === 'string' ? sp.next : '';

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#FDFCF8] px-4 py-6">
      <div className="w-full max-w-md space-y-6 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-stone-200">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900">{t('signup')}</h1>
          <p className="text-stone-500 mt-2 text-sm">
            {t('already_have_account')}{' '}
            <Link 
              href={`/${locale}/login`} 
              className="text-stone-900 font-medium hover:underline"
            >
              {t('login')}
            </Link>
          </p>
        </div>

        <SignupForm 
          locale={locale} 
          next={nextParam} 
        />

        <AuthMessages searchParams={searchParams} />
      </div>
    </div>
  );
}

async function AuthMessages({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const t = await getTranslations('Auth');

  if (params.success) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
        <div className="font-medium mb-1">✓ Account created!</div>
        <div className="text-green-700">{t('check_email_confirm')}</div>
      </div>
    );
  }

  if (params.error) {
    let errorMessage = t('error_signup');
    
    // Map error codes to user-friendly messages
    const errorMap: Record<string, string> = {
      'passwords_dont_match': 'error_passwords_dont_match',
      'password_too_short': 'error_password_too_short',
      'password_weak': 'error_password_weak',
      'invalid_email': 'error_invalid_email',
      'email_exists': 'error_email_exists',
      'missing_fields': 'error_signup',
      'signup_failed': 'error_signup',
    };
    
    const errorKey = errorMap[params.error as string] || 'error_signup';
    errorMessage = t(errorKey as any);

    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg">
        <div className="font-medium mb-1">⚠ Unable to create account</div>
        <div className="text-red-700">{errorMessage}</div>
      </div>
    );
  }

  return null;
}

