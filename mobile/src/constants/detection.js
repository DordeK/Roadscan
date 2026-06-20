// Accelerometer sampling: 20 Hz
export const ACCELEROMETER_SAMPLE_RATE_MS = 50;

// Low-pass filter coefficient for gravity estimation (0–1, higher = smoother)
export const GRAVITY_ALPHA = 0.8;

// Motion gate: vehicle must show this much net vertical acceleration (m/s²)
export const MOTION_THRESHOLD_MS2 = 0.7;

// Minimum consecutive readings above MOTION_THRESHOLD_MS2 to consider vehicle moving
export const MIN_CONSECUTIVE_MOTION = 5;

// If no motion reading for this long, vehicle is considered stopped (ms)
export const MOTION_WINDOW_MS = 1500;

// V-spike thresholds (m/s²): asymmetric — down spike is sharper than up recovery
export const V_SPIKE_DOWN_MS2 = 1.5;   // wheel dropping into hole
export const V_SPIKE_UP_MS2 = 1.0;     // wheel climbing back out

// Severity classification based on max V-spike magnitude (m/s²)
export const SEVERITY_THRESHOLDS = {
  medium: 5.0,  // >= 5 m/s² → medium
  high: 8.0,    // >= 8 m/s² → high
  // below medium → low
};

// After a detection, ignore further events for this long (ms)
export const DETECTION_COOLDOWN_MS = 1000;

// Proximity alert radius (m) — default; overridden by Settings
export const DEFAULT_WARNING_DISTANCE_M = 100;

// Don't re-alert for the same pothole within this window (ms)
export const ALERT_COOLDOWN_MS = 30000;

// Background location task name
export const BACKGROUND_LOCATION_TASK = 'POTHOLE_BACKGROUND_TASK';

// Radius (m) used when fetching nearby potholes from the API
export const NEARBY_FETCH_RADIUS_M = 200;
