/**
 * Surface Logger — buffers vertAccel samples, classifies road surface
 * every 2 seconds, and posts the result to the backend with GPS coords.
 *
 * Usage:
 *   startSurfaceLogging(deviceUuid)
 *   pushSurfaceSample(vertAccel)   — call from detection.js onData
 *   stopSurfaceLogging()
 */

import { logSurface } from './api';
import { getCurrentLocation } from './location';

const WINDOW_SAMPLES = 40;   // 2s at 20Hz — must match surface_model.json
const POST_EVERY_N   = 40;   // post once per full window

let buffer        = [];
let samplesSincePost = 0;
let deviceUuid    = null;
let running       = false;

export function startSurfaceLogging(uuid) {
  buffer = [];
  samplesSincePost = 0;
  deviceUuid = uuid;
  running = true;
}

export function stopSurfaceLogging() {
  running = false;
  buffer = [];
  samplesSincePost = 0;
}

export async function pushSurfaceSample(vertAccel) {
  if (!running) return;

  buffer.push(vertAccel);
  if (buffer.length > WINDOW_SAMPLES) buffer.shift();
  samplesSincePost++;

  if (samplesSincePost < POST_EVERY_N || buffer.length < WINDOW_SAMPLES) return;
  samplesSincePost = 0;

  // Snapshot the current window before the async gap
  const window = [...buffer];

  try {
    const loc = await getCurrentLocation();
    if (!loc) return;
    await logSurface(deviceUuid, loc.latitude, loc.longitude, window);
  } catch (err) {
    // Non-critical — surface logging failures are silent
    console.warn('[surfaceLogger] post failed:', err.message);
  }
}
