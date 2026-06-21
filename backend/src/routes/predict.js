'use strict';

const express = require('express');
const { predict } = require('../services/predictor');

const router = express.Router();

/**
 * POST /api/predict
 *
 * Body: { samples: [{ vert_accel_ms2, delta_ms2, ax_g, ay_g, az_g }, ...] }
 * Requires at least 20 samples (1 second at 20 Hz).
 *
 * Response: { is_pothole: bool, probability: float, confidence: "low"|"medium"|"high" }
 *
 * Typical usage: mobile app sends the window of samples surrounding a
 * V-spike detection event to get an ML-based second opinion.
 */
router.post('/', async (req, res) => {
  const { samples } = req.body;

  if (!Array.isArray(samples)) {
    return res.status(400).json({ error: 'samples must be an array' });
  }

  const required = ['vert_accel_ms2', 'delta_ms2', 'ax_g', 'ay_g', 'az_g'];
  const first = samples[0];
  if (!first || required.some((k) => typeof first[k] !== 'number')) {
    return res.status(400).json({ error: `Each sample must have: ${required.join(', ')}` });
  }

  try {
    const result = await predict(samples);
    return res.json({ data: result });
  } catch (err) {
    console.error('[predict] error:', err.message);
    return res.status(422).json({ error: err.message });
  }
});

module.exports = router;
