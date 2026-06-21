import { useState, useEffect, useCallback, useRef } from 'react'
import { getSurfaceArea } from '../services/api'

const REFRESH_MS = 30_000

export function useSurface(bounds) {
  const [segments, setSegments] = useState([])
  const [loading, setLoading]   = useState(false)
  const boundsRef = useRef(bounds)
  boundsRef.current = bounds

  const fetch = useCallback(async () => {
    const b = boundsRef.current
    if (!b) return
    setLoading(true)
    try {
      const data = await getSurfaceArea(b.minLng, b.minLat, b.maxLng, b.maxLat)
      setSegments(data)
    } catch (_) {
      // fail silently — surface layer is non-critical
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const timer = setInterval(fetch, REFRESH_MS)
    return () => clearInterval(timer)
  }, [fetch])

  // Re-fetch when bounds change (user pans map)
  useEffect(() => {
    fetch()
  }, [bounds, fetch])

  return { segments, loading, refresh: fetch }
}
