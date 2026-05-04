'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function setPassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const locale = formData.get('locale') as string || 'en'
  const eventId = formData.get('eventId') as string || ''

  const errorBase = `/${locale}/setup-password?${eventId ? `eventId=${eventId}&` : ''}`

  if (!password || !confirmPassword) {
    redirect(`${errorBase}error=missing_fields`)
  }

  if (password !== confirmPassword) {
    redirect(`${errorBase}error=passwords_dont_match`)
  }

  if (password.length < 8) {
    redirect(`${errorBase}error=password_too_short`)
  }

  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)

  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
    redirect(`${errorBase}error=password_weak`)
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    console.error('Set password error:', error.message)
    redirect(`${errorBase}error=update_failed`)
  }

  revalidatePath('/', 'layout')

  if (eventId) {
    redirect(`/${locale}/dashboard?eventId=${eventId}`)
  } else {
    redirect(`/${locale}/dashboard`)
  }
}
