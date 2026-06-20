-- Seed data: 1000 potholes across the Netherlands
-- Run with: docker cp backend/src/db/seed.sql pothole-db:/seed.sql
--           docker exec pothole-db psql -U postgres -d pothole_tracker -f /seed.sql

INSERT INTO potholes (location, severity, report_count, confidence, last_reported_at, hidden)
SELECT
  ST_SetSRID(
    ST_Point(
      -- Longitude: Netherlands roughly 3.3 to 7.2
      3.3 + random() * 3.9,
      -- Latitude: Netherlands roughly 50.75 to 53.55
      50.75 + random() * 2.8
    ),
    4326
  ),
  -- Severity: weighted toward medium (50% medium, 30% high, 20% low)
  CASE
    WHEN random() < 0.20 THEN 'low'
    WHEN random() < 0.70 THEN 'medium'
    ELSE 'high'
  END,
  -- Report count: 1–50, skewed toward lower numbers
  CEIL(random() * random() * 50)::INT + 1,
  0, -- placeholder, recalculated below
  NOW() - (random() * INTERVAL '180 days'),
  FALSE
FROM generate_series(1, 800);

-- Amsterdam cluster (denser — ~200 extra potholes in city area)
INSERT INTO potholes (location, severity, report_count, confidence, last_reported_at, hidden)
SELECT
  ST_SetSRID(
    ST_Point(
      4.75 + random() * 0.35,   -- Amsterdam lng ~4.75–5.10
      52.28 + random() * 0.20   -- Amsterdam lat ~52.28–52.48
    ),
    4326
  ),
  CASE
    WHEN random() < 0.20 THEN 'low'
    WHEN random() < 0.70 THEN 'medium'
    ELSE 'high'
  END,
  CEIL(random() * random() * 80)::INT + 1,
  0,
  NOW() - (random() * INTERVAL '90 days'),
  FALSE
FROM generate_series(1, 200);

-- Recalculate confidence for all rows based on report_count
UPDATE potholes
SET confidence = LEAST(99, 30 * LN(report_count + 1));
