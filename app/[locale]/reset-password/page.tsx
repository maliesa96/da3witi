import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import ResetPasswordForm from './ResetPasswordForm';
import UpdatePasswordForm from './UpdatePasswordForm';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Auth');
  const sp = await searchParams;

  // Check if this is a password update request (user clicked email link)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated and has reset token, show password update form
  if (user && sp.type === 'recovery') {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#FDFCF8] px-4 py-6">
        <div className="w-full max-w-md space-y-6 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-stone-200">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-stone-900">{t('reset_password')}</h1>
            <p className="text-stone-500 mt-2 text-sm">Enter your new password</p>
          </div>

          <UpdatePasswordForm 
            locale={locale} 
          />

          <UpdatePasswordMessages searchParams={searchParams} />
        </div>
      </div>
    );
  }

  // Otherwise show the request reset form
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#FDFCF8] px-4 py-6">
      <div className="w-full max-w-md space-y-6 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-stone-200">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900">{t('reset_password')}</h1>
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

        <ResetPasswordForm 
          locale={locale} 
        />

        <ResetMessages searchParams={searchParams} />
      </div>
    </div>
  );
}

async function ResetMessages({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const t = await getTranslations('Auth');

  if (params.sent) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
        <div className="font-medium mb-1">✓ Email sent!</div>
        <div className="text-green-700">{t('reset_link_sent')}</div>
      </div>
    );
  }

  if (params.error) {
    let errorMessage = t('error_reset_password');
    
    // Map error codes to user-friendly messages
    const errorMap: Record<string, string> = {
      'invalid_email': 'error_invalid_email',
      'reset_failed': 'error_reset_password',
    };
    
    const errorKey = errorMap[params.error as string] || 'error_reset_password';
    errorMessage = t(errorKey as any);

    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg">
        <div className="font-medium mb-1">⚠ Unable to send reset link</div>
        <div className="text-red-700">{errorMessage}</div>
      </div>
    );
  }

  return null;
}

async function UpdatePasswordMessages({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const t = await getTranslations('Auth');

  if (params.updated) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg">
        <div className="font-medium mb-1">✓ Password updated!</div>
        <div className="text-green-700">{t('password_updated')}</div>
      </div>
    );
  }

  if (params.error) {
    let errorMessage = t('error_update_password');
    
    // Map error codes to user-friendly messages
    const errorMap: Record<string, string> = {
      'passwords_dont_match': 'error_passwords_dont_match',
      'password_too_short': 'error_password_too_short',
      'password_weak': 'error_password_weak',
      'missing_fields': 'error_update_password',
      'update_failed': 'error_update_password',
    };
    
    const errorKey = errorMap[params.error as string] || 'error_update_password';
    errorMessage = t(errorKey as any);

    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg">
        <div className="font-medium mb-1">⚠ Unable to update password</div>
        <div className="text-red-700">{errorMessage}</div>
      </div>
    );
  }

  return null;
}
