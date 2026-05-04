import type { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SetPasswordForm from './SetPasswordForm';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SetupPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('Auth');
  const sp = await searchParams;
  const eventId = typeof sp.eventId === 'string' ? sp.eventId : '';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#FDFCF8] px-4 py-6">
      <div className="w-full max-w-md space-y-6 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-stone-200">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-stone-900">{t('setup_password_title')}</h1>
          <p className="text-stone-500 mt-2 text-sm">
            {t('setup_password_description')}
          </p>
        </div>

        <SetPasswordForm
          locale={locale}
          eventId={eventId}
        />

        <SetPasswordMessages searchParams={searchParams} />
      </div>
    </div>
  );
}

async function SetPasswordMessages({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const params = await searchParams;
  const t = await getTranslations('Auth');

  if (params.error) {
    const errorMap: Record<string, string> = {
      'passwords_dont_match': 'error_passwords_dont_match',
      'password_too_short': 'error_password_too_short',
      'password_weak': 'error_password_weak',
      'missing_fields': 'error_update_password',
      'update_failed': 'error_update_password',
    };

    const errorKey = errorMap[params.error as string] || 'error_update_password';

    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg">
        <div className="text-red-700">{t(errorKey as 'error_update_password')}</div>
      </div>
    );
  }

  return null;
}
