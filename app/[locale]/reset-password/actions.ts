'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const locale = formData.get('locale') as string || 'en'
  // Use auth callback to exchange the code, then redirect to reset-password with type=recovery
  const resetPasswordPath = `/${locale}/reset-password?type=recovery`
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/auth/callback?next=${encodeURIComponent(resetPasswordPath)}`

  // Basic validation
  if (!email) {
    redirect(`/${locale}/reset-password?error=invalid_email`)
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    redirect(`/${locale}/reset-password?error=invalid_email`)
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  })

  if (error) {
    console.error('Password reset request error:', error.message)
    
    // Handle specific error cases
    if (error.message.includes('Invalid email')) {
      redirect(`/${locale}/reset-password?error=invalid_email`)
    }
    
    redirect(`/${locale}/reset-password?error=reset_failed`)
  }

  revalidatePath('/', 'layout')
  redirect(`/${locale}/reset-password?sent=true`)
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const locale = formData.get('locale') as string || 'en'

  // Basic validation
  if (!password || !confirmPassword) {
    redirect(`/${locale}/reset-password?type=recovery&error=missing_fields`)
  }

  // Validate passwords match
  if (password !== confirmPassword) {
    redirect(`/${locale}/reset-password?type=recovery&error=passwords_dont_match`)
  }

  // Validate password length
  if (password.length < 8) {
    redirect(`/${locale}/reset-password?type=recovery&error=password_too_short`)
  }

  // Validate password strength: 1 uppercase, 1 lowercase, 1 number, 1 symbol
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
  
  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
    redirect(`/${locale}/reset-password?type=recovery&error=password_weak`)
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    console.error('Password update error:', error.message)
    
    // Handle specific error cases
    if (error.message.includes('Password')) {
      redirect(`/${locale}/reset-password?type=recovery&error=password_too_short`)
    }
    
    redirect(`/${locale}/reset-password?type=recovery&error=update_failed`)
  }

  revalidatePath('/', 'layout')
  redirect(`/${locale}/login?updated=true`)
}
