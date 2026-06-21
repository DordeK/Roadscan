import React, { useState, useRef, useCallback, useEffect } from 'react'
import ReactMapGL, { Marker, Popup, NavigationControl, Source, Layer } from 'react-map-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import PotholePin from './PotholePin'
import Tooltip from './Tooltip'
import { useSurface } from '../hooks/useSurface'

const SURFACE_COLORS = {
  smooth_asphalt: '#4CAF50',
  rough_asphalt:  '#FF9800',
  cobblestone:    '#FF5722',
  gravel:         '#F44336',
}

// Max coordinate gap (degrees) before a new line segment is started.
// ~0.005° ≈ 500m — bigger gap means the device stopped/teleported.
const MAX_GAP_DEG = 0.005

function buildSurfaceGeoJSON(segments) {
  // Group by device_uuid (points already ordered by device + time from backend)
  const byDevice = {}
  for (const s of segments) {
    const key = s.device_uuid ?? 'unknown'
    if (!byDevice[key]) byDevice[key] = []
    byDevice[key].push(s)
  }

  const features = []

  for (const points of Object.values(byDevice)) {
    // Walk points: start a new line segment when surface changes or there's a big gap
    let segCoords = []
    let segSurface = null

    const flush = () => {
      if (segCoords.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: segCoords },
          properties: {
            surface_type: segSurface,
            color: SURFACE_COLORS[segSurface] ?? '#888888',
          },
        })
      }
    }

    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      const lng = parseFloat(p.lng)
      const lat = parseFloat(p.lat)

      const gapTooLarge = segCoords.length > 0 && (
        Math.abs(lng - segCoords[segCoords.length - 1][0]) > MAX_GAP_DEG ||
        Math.abs(lat - segCoords[segCoords.length - 1][1]) > MAX_GAP_DEG
      )

      if (p.surface_type !== segSurface || gapTooLarge) {
        flush()
        // Carry last point into new segment so lines connect visually
        segCoords = segCoords.length > 0 ? [segCoords[segCoords.length - 1], [lng, lat]] : [[lng, lat]]
        segSurface = p.surface_type
      } else {
        segCoords.push([lng, lat])
      }
    }
    flush()
  }

  return { type: 'FeatureCollection', features }
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

const INITIAL_VIEW = {
  longitude: 15,
  latitude: 48,
  zoom: 5,
}

function getLngLat(pothole) {
  // Support multiple coordinate field shapes from the backend
  const lng =
    pothole.longitude ??
    pothole.lng ??
    pothole.location?.coordinates?.[0] ??
    pothole.location?.lng

  const lat =
    pothole.latitude ??
    pothole.lat ??
    pothole.location?.coordinates?.[1] ??
    pothole.location?.lat

  return { lng: parseFloat(lng), lat: parseFloat(lat) }
}

function isValidCoord(lng, lat) {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    !isNaN(lng) &&
    !isNaN(lat) &&
    lng >= -180 && lng <= 180 &&
    lat >= -90 && lat <= 90
  )
}

export default function Map({ potholes, flyToRef }) {
  const [viewState, setViewState] = useState(INITIAL_VIEW)
  const [hoveredPothole, setHoveredPothole] = useState(null)
  const [selectedPothole, setSelectedPothole] = useState(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [showSurface, setShowSurface] = useState(true)
  const [bounds, setBounds] = useState(null)
  const mapRef = useRef(null)

  const { segments } = useSurface(bounds)
  const surfaceGeoJSON = buildSurfaceGeoJSON(segments)

  // Update bounds when view changes so useSurface re-fetches for the new area
  const handleMove = useCallback((e) => {
    setViewState(e.viewState)
    if (mapRef.current) {
      const b = mapRef.current.getBounds()
      if (b) {
        setBounds({
          minLng: b.getWest(),
          minLat: b.getSouth(),
          maxLng: b.getEast(),
          maxLat: b.getNorth(),
        })
      }
    }
  }, [])

  // Expose flyTo so parent/DangerPanel can trigger it
  if (flyToRef) {
    flyToRef.current = ({ lng, lat, zoom = 15 }) => {
      setViewState((v) => ({ ...v, longitude: lng, latitude: lat, zoom }))
    }
  }

  const handleHover = useCallback((pothole) => {
    setHoveredPothole(pothole)
  }, [])

  const handleClick = useCallback((pothole) => {
    setSelectedPothole((prev) =>
      prev?.id === pothole.id ? null : pothole
    )
  }, [])

  const handleMouseMove = useCallback((e) => {
    if (e.nativeEvent) {
      setTooltipPosition({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY })
    }
  }, [])

  if (!MAPBOX_TOKEN) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0F0F0F',
        color: '#F44336',
        flexDirection: 'column',
        gap: 12,
        padding: 32,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 32 }}>⚠</div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>Mapbox token missing</div>
        <div style={{ fontSize: 13, color: '#AAAAAA', maxWidth: 400 }}>
          Set <code style={{ background: '#2A2A2A', padding: '2px 6px', borderRadius: 4 }}>VITE_MAPBOX_TOKEN</code> in
          your <code style={{ background: '#2A2A2A', padding: '2px 6px', borderRadius: 4 }}>.env</code> file.
          Get a free token at <a href="https://mapbox.com" target="_blank" rel="noreferrer" style={{ color: '#2196F3' }}>mapbox.com</a>.
        </div>
      </div>
    )
  }

  return (
    <div style={{ flex: 1, position: 'relative' }} onMouseMove={handleMouseMove}>
      <ReactMapGL
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: '100%', height: '100%' }}
        onClick={() => setSelectedPothole(null)}
      >
        <NavigationControl position="top-left" />

        {/* Surface condition layer */}
        {showSurface && segments.length > 0 && (
          <Source id="surface" type="geojson" data={surfaceGeoJSON}>
            <Layer
              id="surface-lines"
              type="line"
              layout={{ 'line-join': 'round', 'line-cap': 'round' }}
              paint={{
                'line-color': ['get', 'color'],
                'line-width': 5,
                'line-opacity': 0.75,
              }}
            />
          </Source>
        )}

        {potholes.map((pothole) => {
          const { lng, lat } = getLngLat(pothole)
          if (!isValidCoord(lng, lat)) return null

          return (
            <Marker
              key={pothole.id ?? `${lat}-${lng}`}
              longitude={lng}
              latitude={lat}
              anchor="center"
            >
              <PotholePin
                pothole={pothole}
                onHover={handleHover}
                onClick={handleClick}
              />
            </Marker>
          )
        })}

        {selectedPothole && (() => {
          const { lng, lat } = getLngLat(selectedPothole)
          if (!isValidCoord(lng, lat)) return null
          return (
            <Popup
              longitude={lng}
              latitude={lat}
              anchor="bottom"
              onClose={() => setSelectedPothole(null)}
              closeOnClick={false}
              style={{ zIndex: 10 }}
            >
              <Tooltip pothole={selectedPothole} />
            </Popup>
          )
        })()}
      </ReactMapGL>

      {/* Hover tooltip rendered as overlay so it follows cursor */}
      {hoveredPothole && !selectedPothole && (
        <div
          style={{
            position: 'absolute',
            left: tooltipPosition.x + 14,
            top: tooltipPosition.y + 14,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <Tooltip pothole={hoveredPothole} />
        </div>
      )}

      {/* Surface legend + toggle */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 12,
        background: 'rgba(15,15,15,0.88)',
        border: '1px solid #2A2A2A',
        borderRadius: 10,
        padding: '10px 14px',
        zIndex: 15,
        minWidth: 180,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#AAA', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            Road Surface
          </span>
          <button
            onClick={() => setShowSurface((v) => !v)}
            style={{
              background: showSurface ? '#1A3A1A' : '#2A2A2A',
              border: `1px solid ${showSurface ? '#4CAF50' : '#444'}`,
              borderRadius: 4,
              color: showSurface ? '#4CAF50' : '#666',
              fontSize: 10,
              padding: '2px 7px',
              cursor: 'pointer',
            }}
          >
            {showSurface ? 'ON' : 'OFF'}
          </button>
        </div>
        {Object.entries(SURFACE_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, opacity: 0.85, flexShrink: 0 }} />
            <span style={{ color: '#888', fontSize: 11 }}>
              {type.replace(/_/g, ' ')}
            </span>
          </div>
        ))}
        {segments.length === 0 && (
          <div style={{ color: '#444', fontSize: 10, marginTop: 6 }}>No data — start monitoring</div>
        )}
      </div>
    </div>
  )
}
