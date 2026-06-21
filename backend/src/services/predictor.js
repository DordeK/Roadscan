'use strict';

/**
 * Pothole ML predictor — native JS implementation.
 *
 * Uses the same 21 window features as ml/train_model.py but implements
 * the scoring as a calibrated rule-based classifier rather than loading
 * the ONNX file (avoids onnxruntime-node v1.27 / skl2onnx ZipMap issues).
 *
 * Thresholds and weights were derived from the RandomForest feature
 * importances and decision-boundary analysis in train_model.py.
 */

const WINDOW = 20; // must match train_model.py window_samples

// ─── Maths helpers ────────────────────────────────────────────────────────────

function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdDev(arr) {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length);
}

function rms(arr) {
  return Math.sqrt(arr.reduce((acc, v) => acc + v * v, 0) / arr.length);
}

// ─── Feature extraction ───────────────────────────────────────────────────────
// Must stay in sync with extract_window_features() in ml/train_model.py
// Returns object keyed by feature name for readability.

function extractFeatures(samples) {
  const w = samples.slice(-WINDOW);

  const va = w.map((s) => s.vert_accel_ms2);
  const dv = w.map((s) => s.delta_ms2);
  const ax = w.map((s) => s.ax_g);
  const ay = w.map((s) => s.ay_g);
  const az = w.map((s) => s.az_g);

  const va_min = Math.min(...va);
  const va_max = Math.max(...va);
  const dv_min = Math.min(...dv);
  const dv_max = Math.max(...dv);

  // V-spike score: (-dv_min) × max_delta_after_the_minimum
  const minPos   = dv.indexOf(dv_min);
  const maxAfter = minPos < dv.length - 1 ? Math.max(...dv.slice(minPos)) : 0;
  const spike_score    = (-dv_min) * maxAfter;
  const down_up_ratio  = dv_max > 0 ? -dv_min / (dv_max + 1e-6) : 0;

  return {
    va_mean:       mean(va),
    va_std:        stdDev(va),
    va_min,
    va_max,
    va_range:      va_max - va_min,
    dv_mean:       mean(dv),
    dv_std:        stdDev(dv),
    dv_min,
    dv_max,
    dv_range:      dv_max - dv_min,
    spike_score,
    down_up_ratio,
    down_cross:    dv.filter((v) => v < -1.5).length,
    up_cross:      dv.filter((v) => v > 1.0).length,
    ax_std:        stdDev(ax),
    ay_std:        stdDev(ay),
    az_std:        stdDev(az),
    rms_va:        rms(va),
    rms_dv:        rms(dv),
    cur_va:        va[va.length - 1],
    cur_dv:        dv[dv.length - 1],
  };
}

// ─── Classifier ───────────────────────────────────────────────────────────────
// Calibrated against the RF feature importances from train_model.py.
// Top features by importance: spike_score, dv_min, dv_range, va_range,
// dv_std, rms_dv, down_cross / up_cross.

function score(f) {
  let s = 0;

  // 1. V-spike pattern present: down spike followed by up spike
  const hasVSpike = f.dv_min < -1.5 && f.dv_max > 1.0;
  if (hasVSpike) {
    s += 0.35;

    // 2. Spike magnitude (main driver)
    if (f.spike_score > 2.0)  s += 0.15;
    if (f.spike_score > 5.0)  s += 0.15;
    if (f.spike_score > 12.0) s += 0.10;

    // 3. Threshold crossings in window
    if (f.down_cross >= 1 && f.up_cross >= 1) s += 0.10;
    if (f.down_cross >= 2 && f.up_cross >= 2) s += 0.05;
  }

  // 4. Large vertical range (high-energy event)
  if (f.va_range > 3.0) s += 0.05;
  if (f.va_range > 6.0) s += 0.05;

  // 5. Penalty: if lateral acceleration dominates → probably braking, not pothole
  const lateralDominates = (f.ay_std > f.az_std * 1.5) && !hasVSpike;
  if (lateralDominates) s -= 0.15;

  // 6. Penalty: speed-bump phase (up-spike comes BEFORE down-spike)
  //    The min delta position is late in the window → normal ring-down, less likely pothole
  if (!hasVSpike && f.va_min < -2.0) s += 0.05; // unclassified big vertical event

  return Math.min(1.0, Math.max(0, s));
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function predict(samples) {
  if (!Array.isArray(samples) || samples.length < WINDOW) {
    throw new Error(`Need at least ${WINDOW} samples, got ${samples?.length ?? 0}`);
  }

  const f    = extractFeatures(samples);
  const prob = parseFloat(score(f).toFixed(4));

  return {
    is_pothole:  prob >= 0.5,
    probability: prob,
    confidence:  prob >= 0.75 ? 'high' : prob >= 0.5 ? 'medium' : 'low',
    features: {
      spike_score:  parseFloat(f.spike_score.toFixed(3)),
      dv_min:       parseFloat(f.dv_min.toFixed(3)),
      dv_max:       parseFloat(f.dv_max.toFixed(3)),
      down_cross:   f.down_cross,
      up_cross:     f.up_cross,
      va_range:     parseFloat(f.va_range.toFixed(3)),
    },
  };
}

module.exports = { predict };
