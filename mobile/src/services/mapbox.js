const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

/**
 * Geocode a free-text address using the Mapbox Geocoding API.
 * Returns { lat, lng, placeName } or null if nothing found.
 */
export async function geocodeAddress(query) {
  if (!TOKEN) throw new Error('EXPO_PUBLIC_MAPBOX_TOKEN is not set');
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${TOKEN}&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding request failed: ${res.status}`);
  const json = await res.json();
  if (!json.features || json.features.length === 0) return null;
  const [lng, lat] = json.features[0].center;
  return { lat, lng, placeName: json.features[0].place_name };
}

/**
 * Fetch a driving route between two coordinates using the Mapbox Directions API.
 * Returns an array of { latitude, longitude } objects suitable for react-native-maps Polyline.
 */
export async function getRoute(fromLat, fromLng, toLat, toLng) {
  if (!TOKEN) throw new Error('EXPO_PUBLIC_MAPBOX_TOKEN is not set');
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLng},${fromLat};${toLng},${toLat}?geometries=geojson&access_token=${TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Directions request failed: ${res.status}`);
  const json = await res.json();
  if (!json.routes || json.routes.length === 0) throw new Error('No route found');
  // GeoJSON coordinates are [lng, lat] — convert to react-native-maps format
  return json.routes[0].geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
}

/**
 * Haversine distance between two lat/lng points.
 * Returns distance in metres.
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Filter potholes to those within maxDistanceM metres of any route coordinate.
 * routeCoords — array of { latitude, longitude }
 * allPotholes — array of pothole objects with lat / lng (or latitude / longitude) fields
 */
export function getPotholesAlongRoute(routeCoords, allPotholes, maxDistanceM = 50) {
  return allPotholes.filter((p) => {
    const pLat = p.lat ?? p.latitude;
    const pLng = p.lng ?? p.longitude;
    return routeCoords.some(
      (coord) => haversineDistance(pLat, pLng, coord.latitude, coord.longitude) <= maxDistanceM
    );
  });
}
