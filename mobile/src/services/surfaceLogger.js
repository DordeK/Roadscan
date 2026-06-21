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

let buffer           = [];
let samplesSincePost = 0;
let deviceUuid       = null;
let running          = false;
let onSurfaceCb      = null;

export function startSurfaceLogging(uuid, onSurface) {
  buffer = [];
  samplesSincePost = 0;
  deviceUuid = uuid;
  onSurfaceCb = onSurface ?? null;
  running = true;
}

export function stopSurfaceLogging() {
  running = false;
  buffer = [];
  samplesSincePost = 0;
  onSurfaceCb = null;
}

export async function pushSurfaceSample(vertAccel) {
  if (!running) return;

  buffer.push(vertAccel);
  if (buffer.length > WINDOW_SAMPLES) buffer.shift();
  samplesSincePost++;

  if (samplesSincePost < POST_EVERY_N || buffer.length < WINDOW_SAMPLES) return;
  samplesSincePost = 0;

  const window = [...buffer];

  try {
    const loc = await getCurrentLocation();
    if (!loc) return;
    const result = await logSurface(deviceUuid, loc.latitude, loc.longitude, window);
    if (onSurfaceCb && result?.surface_type) {
      onSurfaceCb({ surfaceType: result.surface_type, confidence: result.confidence });
    }
  } catch (err) {
    console.warn('[surfaceLogger] post failed:', err.message);
  }
}
