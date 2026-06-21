'use strict';

const path = require('path');
const model = require('../ml/surface_model.json');

// ─── Feature extraction (mirrors train_surface_classifier.py) ─────────────────

function extractFeatures(vertAccelWindow) {
  const n = vertAccelWindow.length;
  const mean = vertAccelWindow.reduce((s, v) => s + v, 0) / n;
  const variance = vertAccelWindow.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const roughness = Math.sqrt(variance);

  const absVals = vertAccelWindow.map(Math.abs);
  const meanAbs = absVals.reduce((s, v) => s + v, 0) / n;
  const maxAbs  = Math.max(...absVals);

  const deltas = [];
  for (let i = 1; i < n; i++) {
    deltas.push(Math.abs(vertAccelWindow[i] - vertAccelWindow[i - 1]));
  }
  const meanDelta = deltas.length ? deltas.reduce((s, v) => s + v, 0) / deltas.length : 0;
  const hfRate    = deltas.length ? deltas.filter((d) => d > 1.0).length / deltas.length : 0;

  return { roughness, mean_abs: meanAbs, max_abs: maxAbs, mean_delta: meanDelta, hf_rate: hfRate };
}

// ─── Tree traversal ──────────────────────────────────────────────────────────

function walkTree(node, feats) {
  if ('label' in node) return node.label;
  const val = feats[node.feature];
  return walkTree(val <= node.threshold ? node.left : node.right, feats);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Classify road surface from a window of vert_accel values (m/s²).
 * @param {number[]} vertAccelWindow  — 40 samples (2s at 20Hz)
 * @returns {{ surface: string, confidence: number, features: object }}
 */
function classifySurface(vertAccelWindow) {
  if (vertAccelWindow.length < 10) {
    return { surface: 'unknown', confidence: 0, features: {} };
  }

  const feats = extractFeatures(vertAccelWindow);
  const surface = model.use_tree
    ? walkTree(model.tree, feats)
    : fallbackThreshold(feats);

  // Confidence proxy: distance from class centroid (roughness axis)
  const classStats = model.class_stats[surface];
  const dist = classStats
    ? Math.abs(feats.roughness - classStats.mean_roughness)
    : 1.0;
  const confidence = Math.round(Math.max(0, Math.min(99, 99 - dist * 30)));

  return { surface, confidence, features: feats };
}

function fallbackThreshold(feats) {
  for (const t of model.thresholds) {
    if (feats.roughness <= t.max_roughness) return t.label;
  }
  return model.thresholds[model.thresholds.length - 1].label;
}

module.exports = { classifySurface, extractFeatures };
