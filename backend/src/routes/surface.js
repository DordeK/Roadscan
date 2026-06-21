'use strict';

const { Router } = require('express');
const { pool } = require('../db');
const { classifySurface } = require('../services/surfaceClassifier');

const router = Router();

/**
 * POST /api/surface
 * Body: { deviceUuid, lat, lng, vertAccelWindow: number[] }
 * Classifies the window and stores the result.
 */
router.post('/', async (req, res, next) => {
  try {
    const { deviceUuid, lat, lng, vertAccelWindow } = req.body;

    if (!lat || !lng || !Array.isArray(vertAccelWindow) || vertAccelWindow.length < 10) {
      return res.status(400).json({ error: 'lat, lng and vertAccelWindow (≥10 samples) required' });
    }

    const { surface, confidence } = classifySurface(vertAccelWindow);

    const result = await pool.query(
      `INSERT INTO road_surface (location, surface_type, confidence, device_uuid)
       VALUES (ST_SetSRID(ST_Point($1, $2), 4326), $3, $4, $5)
       RETURNING id, surface_type, confidence, recorded_at`,
      [lng, lat, surface, confidence, deviceUuid ?? null]
    );

    return res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/surface/nearby?lat=&lng=&radius=500
 * Returns surface readings within `radius` metres (default 500m).
 */
router.get('/nearby', async (req, res, next) => {
  try {
    const lat    = parseFloat(req.query.lat);
    const lng    = parseFloat(req.query.lng);
    const radius = Math.min(5000, parseFloat(req.query.radius) || 500);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    const result = await pool.query(
      `SELECT
         id,
         surface_type,
         confidence,
         recorded_at,
         ST_X(location::geometry) AS lng,
         ST_Y(location::geometry) AS lat
       FROM road_surface
       WHERE ST_DWithin(
         location,
         ST_SetSRID(ST_Point($1, $2), 4326)::geography,
         $3
       )
       ORDER BY recorded_at DESC
       LIMIT 2000`,
      [lng, lat, radius]
    );

    return res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/surface/area?minLng=&minLat=&maxLng=&maxLat=
 * Returns all surface readings in a bounding box (for dashboard map).
 */
router.get('/area', async (req, res, next) => {
  try {
    const { minLng, minLat, maxLng, maxLat } = req.query;
    if (!minLng || !minLat || !maxLng || !maxLat) {
      return res.status(400).json({ error: 'minLng, minLat, maxLng, maxLat required' });
    }

    const result = await pool.query(
      `SELECT
         id,
         device_uuid,
         surface_type,
         confidence,
         recorded_at,
         ST_X(location::geometry) AS lng,
         ST_Y(location::geometry) AS lat
       FROM road_surface
       WHERE location && ST_MakeEnvelope($1, $2, $3, $4, 4326)
       ORDER BY device_uuid, recorded_at ASC
       LIMIT 5000`,
      [minLng, minLat, maxLng, maxLat]
    );

    return res.json({ data: result.rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
