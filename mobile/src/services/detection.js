import { Accelerometer } from 'expo-sensors';
import {
  ACCELEROMETER_SAMPLE_RATE_MS,
  GRAVITY_ALPHA,
  MOTION_THRESHOLD_MS2,
  MIN_CONSECUTIVE_MOTION,
  MOTION_WINDOW_MS,
  SEVERITY_THRESHOLDS,
  DETECTION_COOLDOWN_MS,
} from '../constants/detection';

// ─── Module state ─────────────────────────────────────────────────────────────
let subscription = null;

// Low-pass gravity estimate (in m/s², initialised pointing down)
let gravity = { x: 0, y: 0, z: -9.81 };

// Previous vertical acceleration reading (m/s²) for delta calculation
let prevVertAccel = null;

// Previous delta for V-spike detection
let prevDelta = null;

// Motion gate
let consecutiveMotionCount = 0;
let lastMotionTime = 0;
let isMoving = false;

// Cooldown
let lastDetectionTime = 0;

// Speed shared by the location service
let currentSpeedKmh = 0;

// ─── ML inference state ───────────────────────────────────────────────────────
const ML_WINDOW_SIZE = 20;       // samples fed to the model (1 s at 20 Hz)
const ML_GATE_DELTA = 0.5;       // m/s² — only run ML when there is notable jerk
const ML_CHECK_INTERVAL_MS = 500; // minimum ms between consecutive ML requests

let mlWindow = [];               // rolling buffer of last ML_WINDOW_SIZE samples
let mlCheckPending = false;      // true while an async ML request is in-flight
let lastMLCheckTime = 0;         // timestamp of most recent ML request
let mlPredictFn = null;          // injected via startDetection({ mlPredict })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function magnitude(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function classifySeverity(spikeMagnitude) {
  if (spikeMagnitude >= SEVERITY_THRESHOLDS.high) return 'high';
  if (spikeMagnitude >= SEVERITY_THRESHOLDS.medium) return 'medium';
  return 'low';
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function setCurrentSpeed(speedKmh) {
  currentSpeedKmh = speedKmh >= 0 ? speedKmh : 0;
}

export function getCurrentSpeed() {
  return currentSpeedKmh;
}

export function startDetection({ sensitivity = 'normal', onDetect, onData, mlPredict }) {
  if (subscription) {
    console.warn('[detection] Already subscribed — call stopDetection first');
    return;
  }

  // sensitivityMultiplier kept for reference — used by threshold algo (commented out below)
  const sensitivityMultiplier = sensitivity === 'high' ? 0.8 : sensitivity === 'low' ? 1.2 : 1.0; // eslint-disable-line no-unused-vars

  mlPredictFn = typeof mlPredict === 'function' ? mlPredict : null;
  mlWindow = [];
  mlCheckPending = false;
  lastMLCheckTime = 0;

  Accelerometer.setUpdateInterval(ACCELEROMETER_SAMPLE_RATE_MS);

  subscription = Accelerometer.addListener(({ x, y, z }) => {
    const now = Date.now();

    // expo-sensors returns G units — convert to m/s²
    const ax = x * 9.81;
    const ay = y * 9.81;
    const az = z * 9.81;
    const accel = { x: ax, y: ay, z: az };

    // ── 1. Update gravity estimate (low-pass filter) ────────────────────────
    gravity.x = GRAVITY_ALPHA * gravity.x + (1 - GRAVITY_ALPHA) * ax;
    gravity.y = GRAVITY_ALPHA * gravity.y + (1 - GRAVITY_ALPHA) * ay;
    gravity.z = GRAVITY_ALPHA * gravity.z + (1 - GRAVITY_ALPHA) * az;

    const gravMag = magnitude(gravity);
    if (gravMag === 0) return;

    // ── 2. Extract vertical (gravity-aligned) acceleration ─────────────────
    // Project accel onto gravity unit vector, then subtract gravity magnitude
    const gravUnit = { x: gravity.x / gravMag, y: gravity.y / gravMag, z: gravity.z / gravMag };
    const vertAccel = dot(accel, gravUnit) - gravMag;

    // ── 3. Motion gate ──────────────────────────────────────────────────────
    const netAccelMag = Math.abs(vertAccel);
    if (netAccelMag > MOTION_THRESHOLD_MS2) {
      consecutiveMotionCount++;
      lastMotionTime = now;
    } else {
      consecutiveMotionCount = 0;
    }

    if (consecutiveMotionCount >= MIN_CONSECUTIVE_MOTION) {
      isMoving = true;
    } else if (now - lastMotionTime > MOTION_WINDOW_MS) {
      isMoving = false;
    }

    // ── 4. Detection ────────────────────────────────────────────────────────
    if (prevVertAccel !== null) {
      const delta = vertAccel - prevVertAccel;

      if (typeof onData === 'function') {
        onData({ vertAccel, delta, isMoving, ax_g: x, ay_g: y, az_g: z });
      }

      // ── 4a. ML-based detection (primary) ──────────────────────────────────
      // Maintain a rolling window of the last ML_WINDOW_SIZE samples.
      mlWindow.push({ ax_g: x, ay_g: y, az_g: z, vert_accel_ms2: vertAccel, delta_ms2: delta });
      if (mlWindow.length > ML_WINDOW_SIZE) mlWindow.shift();

      // Fire an async ML check when there is notable jerk, the phone is moving,
      // we have a full window, and we are not already waiting for a response.
      if (
        mlPredictFn &&
        isMoving &&
        mlWindow.length === ML_WINDOW_SIZE &&
        !mlCheckPending &&
        Math.abs(delta) > ML_GATE_DELTA &&
        now - lastDetectionTime > DETECTION_COOLDOWN_MS &&
        now - lastMLCheckTime > ML_CHECK_INTERVAL_MS
      ) {
        mlCheckPending = true;
        lastMLCheckTime = now;
        const windowSnapshot = [...mlWindow];

        mlPredictFn(windowSnapshot)
          .then(({ is_pothole, probability }) => {
            if (is_pothole && Date.now() - lastDetectionTime > DETECTION_COOLDOWN_MS) {
              lastDetectionTime = Date.now();
              const spikeMag = Math.max(...windowSnapshot.map((s) => Math.abs(s.delta_ms2)));
              const severity = classifySeverity(spikeMag);
              const gForce = parseFloat((spikeMag / 9.81).toFixed(3));
              console.log(`[detection] ML POTHOLE! prob=${probability.toFixed(3)} severity=${severity} gForce=${gForce}G`);
              if (typeof onDetect === 'function') {
                onDetect({ severity, gForce });
              }
            } else {
              console.log(`[detection] ML pass — prob=${probability.toFixed(3)}`);
            }
          })
          .catch((err) => console.warn('[detection] ML check failed:', err.message))
          .finally(() => { mlCheckPending = false; });
      }

      // ── 4b. V-spike threshold detection (commented out — kept for reference) ──
      // if (
      //   isMoving &&
      //   prevDelta !== null &&
      //   prevDelta < -downThreshold &&   // downward spike
      //   delta > upThreshold &&           // followed by upward spike
      //   now - lastDetectionTime > DETECTION_COOLDOWN_MS
      // ) {
      //   lastDetectionTime = now;
      //   const spikeMag = Math.max(Math.abs(prevDelta), Math.abs(delta));
      //   const severity = classifySeverity(spikeMag);
      //   const gForce = parseFloat((spikeMag / 9.81).toFixed(3));
      //   console.log(`[detection] V-SPIKE! severity=${severity} spikeMag=${spikeMag.toFixed(2)}m/s²`);
      //   if (typeof onDetect === 'function') onDetect({ severity, gForce });
      // }

      prevDelta = delta;
    }

    prevVertAccel = vertAccel;
  });
}

export function stopDetection() {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
  prevVertAccel = null;
  prevDelta = null;
  consecutiveMotionCount = 0;
  isMoving = false;
  lastDetectionTime = 0;
  gravity = { x: 0, y: 0, z: -9.81 };
  mlWindow = [];
  mlCheckPending = false;
  lastMLCheckTime = 0;
  mlPredictFn = null;
}

export function isDetecting() {
  return subscription !== null;
}
