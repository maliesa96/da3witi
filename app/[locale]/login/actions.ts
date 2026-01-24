'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signInWithMagicLink(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const locale = formData.get('locale') as string || 'en'
  const next = formData.get('next') as string || `/${locale}/dashboard`

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/auth/callback?next=${next}`,
    },
  })

  if (error) {
    console.error('Magic link error:', error.message)
    redirect(`/${locale}/login?error=true`)
  }

  revalidatePath('/', 'layout')
  redirect(`/${locale}/login?sent=true`)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

