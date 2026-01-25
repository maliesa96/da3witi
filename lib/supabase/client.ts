import { createBrowserClient } from '@supabase/ssr'

let browserClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // This module is meant to be used from Client Components only.
  // If it gets imported on the server by mistake, fail loudly.
  if (typeof window === 'undefined') {
    throw new Error('Supabase browser client was created on the server. Use `@/lib/supabase/server` instead.')
  }

  if (browserClient) return browserClient

  browserClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  )

  return browserClient
}


