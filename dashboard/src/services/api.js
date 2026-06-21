import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'https://roadscan-production.up.railway.app'

const client = axios.create({
  baseURL: API_URL,
  timeout: 10000,
})

/**
 * Fetch the top dangerous potholes.
 * GET /api/potholes/dangerous
 * Returns an array of pothole objects sorted by severity/confidence.
 */
export async function getDangerousPotholes() {
  const { data } = await client.get('/api/potholes/dangerous')
  return data
}

/**
 * Fetch dashboard stats (total count, high severity count, etc.).
 * GET /api/potholes/stats
 * Returns an object with { total, highSeverity, ... }
 *
 * NOTE: If the backend does not expose this endpoint yet, the StatsBar
 * derives totals from the potholes array returned by getDangerousPotholes.
 */
export async function getStats() {
  const { data } = await client.get('/api/potholes/stats')
  return data
}

/**
 * Fetch road surface readings for a bounding box.
 * GET /api/surface/area?minLng=&minLat=&maxLng=&maxLat=
 */
export async function getSurfaceArea(minLng, minLat, maxLng, maxLat) {
  const { data } = await client.get('/api/surface/area', {
    params: { minLng, minLat, maxLng, maxLat },
  })
  return Array.isArray(data) ? data : (data?.data ?? [])
}
