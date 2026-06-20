import { Accelerometer } from 'expo-sensors';
import {
  ACCELEROMETER_SAMPLE_RATE_MS,
  GRAVITY_ALPHA,
  MOTION_THRESHOLD_MS2,
  MIN_CONSECUTIVE_MOTION,
  MOTION_WINDOW_MS,
  V_SPIKE_DOWN_MS2,
  V_SPIKE_UP_MS2,
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

export function startDetection({ sensitivity = 'normal', onDetect }) {
  if (subscription) {
    console.warn('[detection] Already subscribed — call stopDetection first');
    return;
  }

  const sensitivityMultiplier = sensitivity === 'high' ? 0.8 : sensitivity === 'low' ? 1.2 : 1.0;
  const downThreshold = V_SPIKE_DOWN_MS2 * sensitivityMultiplier;
  const upThreshold = V_SPIKE_UP_MS2 * sensitivityMultiplier;

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

    // ── 4. V-spike detection ────────────────────────────────────────────────
    if (prevVertAccel !== null) {
      const delta = vertAccel - prevVertAccel;

      console.log(`[raw] vert=${vertAccel.toFixed(3)} delta=${delta.toFixed(3)} prevDelta=${(prevDelta ?? 0).toFixed(3)} moving=${isMoving}(${consecutiveMotionCount}) down=${downThreshold.toFixed(1)} up=${upThreshold.toFixed(1)}`);

      if (
        isMoving &&
        prevDelta !== null &&
        prevDelta < -downThreshold &&  // downward spike
        delta > upThreshold &&          // followed by upward spike
        now - lastDetectionTime > DETECTION_COOLDOWN_MS
      ) {
        lastDetectionTime = now;

        const spikeMag = Math.max(Math.abs(prevDelta), Math.abs(delta));
        const severity = classifySeverity(spikeMag);
        const gForce = parseFloat((spikeMag / 9.81).toFixed(3));

        console.log(`[detection] POTHOLE! severity=${severity} spikeMag=${spikeMag.toFixed(2)}m/s² gForce=${gForce}G`);

        if (typeof onDetect === 'function') {
          onDetect({ severity, gForce });
        }
      }

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
}

export function isDetecting() {
  return subscription !== null;
}
