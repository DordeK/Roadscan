// Base G-force thresholds for pothole detection
// Values represent net G above gravity baseline (expo-sensors returns G units, ~1.0 at rest)
export const BASE_THRESHOLDS = {
  low: 0.05,  // G net — minor pothole / rough surface
  medium: 0.15, // G net — moderate pothole
  high: 0.4,   // G net — severe pothole / large impact
};

// Sensitivity multipliers applied on top of the base thresholds.
// "High" sensitivity → lower effective threshold → triggers more easily.
export const SENSITIVITY_MULTIPLIERS = {
  low: 1.2,    // harder to trigger
  normal: 1.0, // default
  high: 0.8,   // easier to trigger
};

// Accelerometer subscription rate (samples per second)
export const ACCELEROMETER_SAMPLE_RATE_MS = 10; // 100 Hz → 10 ms interval

// After a detection, ignore further events for this long (ms) to avoid double-logging
export const DETECTION_DEBOUNCE_MS = 3000;

// A spike must resolve within this window to be classified as a pothole
// rather than sustained vibration (ms)
export const SPIKE_RESOLUTION_MS = 200;

// Ignore spikes above this value — likely manual phone handling, not a road pothole
export const MAX_VALID_G = 2.0;

// Minimum speed (km/h) required before the app will detect / alert
// Set to 0 to disable the speed gate — G-force thresholds are sufficient
export const MIN_SPEED_KMH = 0;

// Proximity alert radius (m) — default; overridden by Settings
export const DEFAULT_WARNING_DISTANCE_M = 100;

// Don't re-alert for the same pothole within this window (ms)
export const ALERT_COOLDOWN_MS = 30000; // 30 seconds

// Background location task name (must be consistent across the app)
export const BACKGROUND_LOCATION_TASK = 'POTHOLE_BACKGROUND_TASK';

// Radius (m) used when fetching nearby potholes from the API
export const NEARBY_FETCH_RADIUS_M = 200;
