/**
 * Utility to extract coordinates from various Google Maps link formats
 * and return a standardized maps.google.com/?q=LAT,LNG link.
 */
export function formatGoogleMapsLink(url: string): string {
  if (!url) return url;

  // If it's already a full link, try to parse it
  if (url.includes('google.com')) {
    // Try to find coordinates in the format @LAT,LNG (common in many Google Maps URLs)
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return `https://maps.google.com/?q=${atMatch[1]},${atMatch[2]}`;
    }

    // Try to find coordinates in query parameters q=LAT,LNG or query=LAT,LNG
    const qMatch = url.match(/(?:q|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      return `https://maps.google.com/?q=${qMatch[1]},${qMatch[2]}`;
    }
  }

  // Handle plain coordinates like "29.37, 47.97" or "29.37,47.97"
  const coordMatch = url.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  if (coordMatch) {
    return `https://maps.google.com/?q=${coordMatch[1]},${coordMatch[2]}`;
  }

  return url;
}

