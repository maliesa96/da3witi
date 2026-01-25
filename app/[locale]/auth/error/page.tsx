import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function getStringParam(
  params: { [key: string]: string | string[] | undefined },
  key: string
) {
  const value = params[key];
  return typeof value === 'string' ? value : '';
}

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations('Auth');
  const locale = await getLocale();
  const params = await searchParams;

  const error = getStringParam(params, 'error');
  const errorCode = getStringParam(params, 'error_code');
  const errorDescription = getStringParam(params, 'error_description');
  const next = getStringParam(params, 'next') || `/${locale}/dashboard`;

  const combined = `${error} ${errorCode} ${errorDescription}`.toLowerCase();
  const isExpired = combined.includes('expired');

  const description = isExpired ? t('auth_error_expired') : t('auth_error_generic');

  const loginHref = `/${locale}/login?next=${encodeURIComponent(next)}`;
  const homeHref = `/${locale}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8] px-6">
      <div className="w-full max-w-md space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-stone-200">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-stone-900">{t('auth_error_title')}</h1>
          <p className="text-stone-600">{description}</p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href={loginHref}
            className="w-full text-center bg-stone-900 text-white font-medium py-2 rounded-lg hover:bg-stone-800 transition-all shadow-sm"
          >
            {t('auth_error_cta_login')}
          </Link>
          <Link
            href={homeHref}
            className="w-full text-center bg-white text-stone-900 font-medium py-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-all"
          >
            {t('auth_error_cta_home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
