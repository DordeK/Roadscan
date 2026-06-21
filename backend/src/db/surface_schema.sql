-- Road surface segments table
-- Each row is one classified 2-second window at a GPS location.
CREATE TABLE IF NOT EXISTS road_surface (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  location     GEOMETRY(POINT, 4326) NOT NULL,
  surface_type VARCHAR(30) NOT NULL,   -- 'smooth_asphalt' | 'rough_asphalt' | 'cobblestone' | 'gravel'
  confidence   SMALLINT    NOT NULL DEFAULT 0, -- 0–99
  device_uuid  VARCHAR(255),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS road_surface_location_idx ON road_surface USING GIST(location);
CREATE INDEX IF NOT EXISTS road_surface_recorded_idx ON road_surface(recorded_at);
