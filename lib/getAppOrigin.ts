import { headers } from 'next/headers'

/**
 * Resolves the application origin (scheme + host) from the incoming request
 * headers. Works in server actions and server components.
 *
 * Priority: x-forwarded-host (proxy/CDN) > host header > NEXT_PUBLIC_APP_URL.
 */
export async function getAppOrigin(): Promise<string> {
  const h = await headers()

  const forwardedHost = h.get('x-forwarded-host')
  if (forwardedHost) {
    const proto = h.get('x-forwarded-proto') || 'https'
    return `${proto}://${forwardedHost}`
  }

  const host = h.get('host')
  if (host) {
    const isLocal = host.startsWith('localhost') || host.startsWith('127.')
    const proto = isLocal ? 'http' : 'https'
    return `${proto}://${host}`
  }

  return process.env.NEXT_PUBLIC_APP_URL || 'https://da3witi.com'
}
