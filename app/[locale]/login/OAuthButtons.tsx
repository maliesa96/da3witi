'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'

interface OAuthButtonsProps {
  locale: string
  next: string
}

export default function OAuthButtons({ locale, next }: OAuthButtonsProps) {
  const t = useTranslations('Auth')
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null)

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    setLoadingProvider(provider)
    const supabase = createClient()
    const redirectTo = `${window.location.origin}/${locale}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })

    if (error) {
      console.error(`${provider} sign-in error:`, error.message)
      setLoadingProvider(null)
    }
    // On success Supabase redirects the browser automatically — no need to reset state
  }

  return (
    <div className="space-y-3">
      {/* Google */}
      <button
        type="button"
        disabled={loadingProvider !== null}
        onClick={() => signInWithProvider('google')}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-stone-200 rounded-lg bg-white hover:bg-stone-50 transition-all text-sm font-medium text-stone-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loadingProvider === 'google' ? (
          <Spinner />
        ) : (
          <GoogleIcon />
        )}
        <span>{t('continue_with_google')}</span>
      </button>

      {/* Apple TODO /*
      <button
        type="button"
        disabled={loadingProvider !== null}
        onClick={() => signInWithProvider('apple')}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-stone-200 rounded-lg bg-white hover:bg-stone-50 transition-all text-sm font-medium text-stone-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loadingProvider === 'apple' ? (
          <Spinner />
        ) : (
          <AppleIcon />
        )}
        <span>{t('continue_with_apple')}</span>
      </button>
      */}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5 text-stone-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.29.07 2.18.8 3.07.83 1.15-.21 2.24-.97 3.47-.91 1.45.09 2.53.62 3.24 1.57-2.99 1.75-2.28 5.58.35 6.75-.55 1.49-1.26 2.97-2.13 4.62zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  )
}
