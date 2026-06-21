import { Accelerometer } from 'expo-sensors';
import { ACCELEROMETER_SAMPLE_RATE_MS, GRAVITY_ALPHA } from '../constants/detection';

let subscription = null;
let gravity = { x: 0, y: 0, z: -9.81 };
let prevVertAccel = null;
let sampleCallback = null;

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function magnitude(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

export function startRecording(onSample) {
  if (subscription) return;

  gravity = { x: 0, y: 0, z: -9.81 };
  prevVertAccel = null;
  sampleCallback = onSample;

  Accelerometer.setUpdateInterval(ACCELEROMETER_SAMPLE_RATE_MS);
  subscription = Accelerometer.addListener(({ x, y, z }) => {
    const ax = x * 9.81;
    const ay = y * 9.81;
    const az = z * 9.81;

    gravity.x = GRAVITY_ALPHA * gravity.x + (1 - GRAVITY_ALPHA) * ax;
    gravity.y = GRAVITY_ALPHA * gravity.y + (1 - GRAVITY_ALPHA) * ay;
    gravity.z = GRAVITY_ALPHA * gravity.z + (1 - GRAVITY_ALPHA) * az;

    const gravMag = magnitude(gravity);
    if (gravMag === 0) return;

    const gravUnit = {
      x: gravity.x / gravMag,
      y: gravity.y / gravMag,
      z: gravity.z / gravMag,
    };
    const vertAccel = dot({ x: ax, y: ay, z: az }, gravUnit) - gravMag;
    const delta = prevVertAccel !== null ? vertAccel - prevVertAccel : 0;
    prevVertAccel = vertAccel;

    if (sampleCallback) {
      // Raw x/y/z stored in G units (as received from sensor) for portability
      sampleCallback({ t: Date.now(), ax: x, ay: y, az: z, vertAccel, delta });
    }
  });
}

export function stopRecording() {
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
  prevVertAccel = null;
  gravity = { x: 0, y: 0, z: -9.81 };
  sampleCallback = null;
}

export function isRecording() {
  return subscription !== null;
}
