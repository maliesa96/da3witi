'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signUpWithPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const locale = formData.get('locale') as string || 'en'
  const next = formData.get('next') as string || `/${locale}/dashboard`

  // Basic validation
  if (!email || !password || !confirmPassword) {
    redirect(`/${locale}/signup?error=missing_fields`)
  }

  // Validate email format (basic check)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    redirect(`/${locale}/signup?error=invalid_email`)
  }

  // Validate passwords match
  if (password !== confirmPassword) {
    redirect(`/${locale}/signup?error=passwords_dont_match`)
  }

  // Validate password length
  if (password.length < 8) {
    redirect(`/${locale}/signup?error=password_too_short`)
  }

  // Validate password strength: 1 uppercase, 1 lowercase, 1 number, 1 symbol
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
  
  if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
    redirect(`/${locale}/signup?error=password_weak`)
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/auth/callback?next=${next}`,
    },
  })

  if (error) {
    console.error('Sign-up error:', error.message)
    
    // Handle specific error cases
    if (error.message.includes('User already registered')) {
      redirect(`/${locale}/signup?error=email_exists`)
    } else if (error.message.includes('Invalid email')) {
      redirect(`/${locale}/signup?error=invalid_email`)
    } else if (error.message.includes('Password')) {
      redirect(`/${locale}/signup?error=password_too_short`)
    }
    
    // Generic error
    redirect(`/${locale}/signup?error=signup_failed`)
  }

  // Supabase doesn't return an error for existing emails (for privacy).
  // Instead, it returns a user with an empty identities array.
  if (data?.user?.identities?.length === 0) {
    redirect(`/${locale}/signup?error=email_exists`)
  }

  revalidatePath('/', 'layout')
  redirect(`/${locale}/login?success=account_created`)
}
