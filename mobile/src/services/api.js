import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@pothole_tracker/settings';
const FALLBACK_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Reads the API base URL from AsyncStorage settings.
 * Falls back to the env variable / hard-coded default.
 */
export async function getApiUrl() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings.apiUrl) return settings.apiUrl.replace(/\/$/, ''); // strip trailing slash
    }
  } catch (_) {}
  return FALLBACK_URL;
}

/**
 * Returns a pre-configured axios instance pointed at the current API URL.
 */
async function getClient() {
  const baseURL = await getApiUrl();
  return axios.create({
    baseURL,
    timeout: 8000,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Log a newly detected pothole to the backend.
 *
 * POST /api/potholes
 * Body: { device_uuid, latitude, longitude, severity, g_force }
 */
export async function logPothole(deviceUuid, lat, lng, severity, gForce) {
  const client = await getClient();
  const response = await client.post('/api/potholes', {
    device_uuid: deviceUuid,
    lat,
    lng,
    severity,
    g_force: gForce,
  });
  return response.data;
}

/**
 * Fetch potholes within `radius` metres of the given coordinates.
 *
 * GET /api/potholes/nearby?lat=…&lng=…&radius=…
 */
export async function getNearbyPotholes(lat, lng, radius = 200) {
  const client = await getClient();
  const response = await client.get('/api/potholes/nearby', {
    params: { lat, lng, radius },
  });
  return response.data; // expected: array of pothole objects
}

/**
 * Retrieve all potholes reported by a specific device.
 *
 * GET /api/potholes/device/:device_uuid
 */
export async function getDeviceHistory(deviceUuid) {
  const client = await getClient();
  const response = await client.get(`/api/potholes/device/${deviceUuid}`);
  return response.data; // expected: array of pothole objects
}

/**
 * Send a 20-sample accelerometer window to the ML inference endpoint.
 * Each sample: { ax_g, ay_g, az_g, vert_accel_ms2, delta_ms2 }
 *
 * Returns { is_pothole: bool, probability: float, confidence: string }
 *
 * POST /api/predict
 */
export async function mlPredict(samples) {
  const client = await getClient();
  const response = await client.post('/api/predict', { samples }, { timeout: 3000 });
  return response.data?.data ?? response.data;
}

/**
 * POST /api/surface
 * Sends a 40-sample vertAccel window with GPS coords for surface classification.
 */
export async function logSurface(deviceUuid, lat, lng, vertAccelWindow) {
  const client = await getClient();
  const response = await client.post('/api/surface', {
    deviceUuid,
    lat,
    lng,
    vertAccelWindow,
  }, { timeout: 5000 });
  return response.data?.data ?? response.data;
}
