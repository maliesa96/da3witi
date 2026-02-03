'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updatePassword } from './actions'

interface UpdatePasswordFormProps {
  locale: string
}

function PasswordRequirements({ password }: { password: string }) {
  const t = useTranslations('Auth')
  
  const requirements = [
    { key: 'length', met: password.length >= 8, label: t('password_req_length') },
    { key: 'uppercase', met: /[A-Z]/.test(password), label: t('password_req_uppercase') },
    { key: 'lowercase', met: /[a-z]/.test(password), label: t('password_req_lowercase') },
    { key: 'number', met: /[0-9]/.test(password), label: t('password_req_number') },
    { key: 'symbol', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password), label: t('password_req_symbol') },
  ]

  if (!password) return null

  return (
    <div className="mt-2 space-y-1">
      {requirements.map((req) => (
        <div key={req.key} className="flex items-center gap-2 text-xs">
          {req.met ? (
            <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-stone-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
            </svg>
          )}
          <span className={req.met ? 'text-green-600' : 'text-stone-400'}>
            {req.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function UpdatePasswordForm({ locale }: UpdatePasswordFormProps) {
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const t = useTranslations('Auth')

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await updatePassword(formData)
    })
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <input type="hidden" name="locale" value={locale} />
      
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-2">
          {t('new_password')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          disabled={isPending}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="••••••••"
        />
        <PasswordRequirements password={password} />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-stone-700 mb-2">
          {t('confirm_password')}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
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
            <span>Updating password...</span>
          </>
        ) : (
          t('update_password')
        )}
      </button>
    </form>
  )
}
