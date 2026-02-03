'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { signInWithPassword } from './actions'
import Link from 'next/link'

interface PasswordLoginFormProps {
  locale: string
  next: string
}

export default function PasswordLoginForm({ locale, next }: PasswordLoginFormProps) {
  const [isPending, startTransition] = useTransition()
  const t = useTranslations('Auth')

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await signInWithPassword(formData)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-2">
          {t('email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          disabled={isPending}
          className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="name@example.com"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="password" className="block text-sm font-medium text-stone-700">
            {t('password')}
          </label>
          <Link 
            href={`/${locale}/reset-password`} 
            className="text-xs text-stone-600 hover:text-stone-900 hover:underline"
            tabIndex={isPending ? -1 : 0}
          >
            {t('forgot_password')}
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          disabled={isPending}
          className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-stone-900 text-white font-medium py-2 rounded-lg hover:bg-stone-800 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Signing in...</span>
          </>
        ) : (
          t('login')
        )}
      </button>
    </form>
  )
}
