'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signInWithPassword(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const locale = formData.get('locale') as string || 'en'
  const next = formData.get('next') as string || `/${locale}/dashboard`

  // Basic validation
  if (!email || !password) {
    redirect(`/${locale}/login?error=invalid_credentials`)
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Password sign-in error:', error.message)
    
    // Handle specific error cases
    if (error.message.includes('Invalid login credentials')) {
      redirect(`/${locale}/login?error=invalid_credentials`)
    } else if (error.message.includes('Email not confirmed')) {
      redirect(`/${locale}/login?error=email_not_confirmed`)
    } else if (error.message.includes('Invalid email')) {
      redirect(`/${locale}/login?error=invalid_email`)
    }
    
    // Generic error
    redirect(`/${locale}/login?error=login_failed`)
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

export async function signInWithMagicLink(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const locale = formData.get('locale') as string || 'en'
  const next = formData.get('next') as string || `/${locale}/dashboard`
  const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/auth/callback?next=${next}`

  // Basic validation
  if (!email) {
    redirect(`/${locale}/login?mode=magic&error=invalid_email`)
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectUrl
    },
  })

  if (error) {
    console.error('Sign-in link error:', error.message)
    
    // Handle specific error cases
    if (error.message.includes('Invalid email')) {
      redirect(`/${locale}/login?mode=magic&error=invalid_email`)
    }
    
    redirect(`/${locale}/login?mode=magic&error=magic_link_failed`)
  }

  revalidatePath('/', 'layout')
  redirect(`/${locale}/login?mode=magic&sent=true`)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

