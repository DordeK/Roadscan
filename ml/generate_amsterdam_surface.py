#!/usr/bin/env python3
"""
Generate realistic road surface seed data covering Amsterdam.
Simulates ~300 drives along a realistic street grid, assigns surface
types by neighborhood zone, and inserts directly into the DB via Docker.

Usage:
  python3 ml/generate_amsterdam_surface.py | docker exec -i pothole-db psql -U postgres -d pothole_tracker
"""

import math
import random
import sys
from datetime import datetime, timedelta

random.seed(42)

# ─── Amsterdam neighborhood zones ─────────────────────────────────────────────
# Each zone: (center_lng, center_lat, radius_deg, surface_type)
ZONES = [
    # Historic centre & canal ring — cobblestone
    (4.8952, 52.3740, 0.012, 'cobblestone'),
    (4.8880, 52.3720, 0.008, 'cobblestone'),
    (4.9010, 52.3680, 0.010, 'cobblestone'),
    (4.8830, 52.3780, 0.007, 'cobblestone'),
    # Jordaan — mix of cobblestone
    (4.8790, 52.3750, 0.009, 'cobblestone'),
    # Zuidas / South business district — smooth
    (4.8710, 52.3360, 0.022, 'smooth_asphalt'),
    (4.8980, 52.3390, 0.018, 'smooth_asphalt'),
    # A10 ring road corridor — smooth
    (4.8430, 52.3600, 0.012, 'smooth_asphalt'),
    (4.9270, 52.3450, 0.012, 'smooth_asphalt'),
    (4.9300, 52.3770, 0.010, 'smooth_asphalt'),
    (4.8780, 52.4050, 0.012, 'smooth_asphalt'),
    # De Pijp — rough asphalt
    (4.8970, 52.3540, 0.015, 'rough_asphalt'),
    # Oud-West — rough asphalt
    (4.8680, 52.3700, 0.015, 'rough_asphalt'),
    # Amsterdam Oost — rough asphalt
    (4.9350, 52.3620, 0.020, 'rough_asphalt'),
    (4.9500, 52.3680, 0.018, 'rough_asphalt'),
    # Amsterdam Noord — rough + some gravel
    (4.9050, 52.4050, 0.025, 'rough_asphalt'),
    (4.9300, 52.4120, 0.018, 'rough_asphalt'),
    (4.8650, 52.4100, 0.020, 'rough_asphalt'),
    # Bos en Lommer / Slotervaart — rough
    (4.8420, 52.3760, 0.018, 'rough_asphalt'),
    (4.8350, 52.3620, 0.015, 'rough_asphalt'),
    # Bijlmer / Zuidoost — rough
    (4.9700, 52.3250, 0.025, 'rough_asphalt'),
    (4.9900, 52.3150, 0.020, 'rough_asphalt'),
    # Outer ring / industrial areas — gravel
    (4.7900, 52.3800, 0.020, 'gravel'),
    (4.7700, 52.3600, 0.018, 'gravel'),
    (5.0100, 52.3500, 0.018, 'gravel'),
    (4.9800, 52.4200, 0.020, 'gravel'),
    (4.8500, 52.2900, 0.025, 'gravel'),
]

def classify_surface(lng, lat):
    """Return the surface type for a GPS coordinate based on nearest zone."""
    best_surface = 'rough_asphalt'
    best_dist = 9999.0
    for (zlng, zlat, radius, surface) in ZONES:
        dist = math.sqrt((lng - zlng)**2 + (lat - zlat)**2)
        if dist < radius and dist < best_dist:
            best_dist = dist
            best_surface = surface
    return best_surface

# ─── Street grid & named routes ───────────────────────────────────────────────
# Amsterdam bounding box for coverage
LNG_MIN, LNG_MAX = 4.77, 5.01
LAT_MIN, LAT_MAX = 52.29, 52.43

def generate_route_points(start_lng, start_lat, end_lng, end_lat, spacing_deg=0.00025):
    """Interpolate GPS points along a straight route at ~25m spacing."""
    dist = math.sqrt((end_lng - start_lng)**2 + (end_lat - start_lat)**2)
    n = max(2, int(dist / spacing_deg))
    points = []
    for i in range(n + 1):
        t = i / n
        lng = start_lng + t * (end_lng - start_lng) + random.gauss(0, 0.00005)
        lat = start_lat + t * (end_lat - start_lat) + random.gauss(0, 0.00005)
        points.append((lng, lat))
    return points

# Define ~300 drives as (start, end) pairs covering Amsterdam
def build_drives():
    drives = []

    # ── East-West arterials ──
    ew_routes = [
        # (start_lng, lat, end_lng, lat)
        (4.78, 52.410, 4.99, 52.408),   # Noord east-west
        (4.79, 52.394, 5.00, 52.392),   # Noord lower
        (4.80, 52.377, 4.98, 52.376),   # A10 north
        (4.83, 52.370, 4.96, 52.368),   # Haarlemmerweg / Middenweg
        (4.84, 52.358, 4.97, 52.356),   # Overtoom / Wibautstraat
        (4.84, 52.345, 4.97, 52.344),   # De Clercqstraat / Amstelveenseweg
        (4.84, 52.333, 4.97, 52.332),   # Zuidas belt
        (4.85, 52.319, 4.99, 52.318),   # A9 south
        (4.84, 52.306, 4.99, 52.305),   # Bijlmer south
    ]
    for (slng, slat, elng, elat) in ew_routes:
        # Forward drive
        drives.append(generate_route_points(slng, slat, elng, elat))
        # Return drive (different device)
        drives.append(generate_route_points(elng, elat + 0.001, slng, slat + 0.001))

    # ── North-South arterials ──
    ns_routes = [
        (4.790, 52.290, 4.788, 52.435),  # West axis
        (4.830, 52.292, 4.828, 52.432),
        (4.860, 52.294, 4.858, 52.430),
        (4.885, 52.295, 4.883, 52.425),  # Centre axis
        (4.900, 52.296, 4.898, 52.428),
        (4.920, 52.295, 4.918, 52.425),
        (4.945, 52.295, 4.943, 52.422),
        (4.965, 52.296, 4.963, 52.420),
        (4.985, 52.295, 4.983, 52.415),  # East axis
        (5.000, 52.296, 4.998, 52.412),
    ]
    for (slng, slat, elng, elat) in ns_routes:
        drives.append(generate_route_points(slng, slat, elng, elat, spacing_deg=0.00030))
        drives.append(generate_route_points(elng + 0.001, elat, slng + 0.001, slat, spacing_deg=0.00030))

    # ── Canal ring (cobblestone centre) ──
    cx, cy, r = 4.895, 52.372, 0.022
    for start_angle_deg in range(0, 360, 18):
        a1 = math.radians(start_angle_deg)
        a2 = math.radians(start_angle_deg + 20)
        slng = cx + r * math.cos(a1)
        slat = cy + r * math.sin(a1) * 0.6
        elng = cx + r * math.cos(a2)
        elat = cy + r * math.sin(a2) * 0.6
        drives.append(generate_route_points(slng, slat, elng, elat, spacing_deg=0.00020))

    # ── A10 ring road (smooth asphalt) ──
    cx, cy, r = 4.895, 52.355, 0.055
    ring_points = []
    for deg in range(0, 365, 3):
        a = math.radians(deg)
        ring_points.append((cx + r * math.cos(a), cy + r * math.sin(a) * 0.65))
    # Split ring into 6 arc drives
    chunk = len(ring_points) // 6
    for i in range(6):
        segment = ring_points[i*chunk:(i+1)*chunk+1]
        drives.append(segment)

    # ── Diagonal routes across the city ──
    diagonals = [
        (4.77, 52.43, 5.01, 52.29),
        (4.77, 52.29, 5.01, 52.43),
        (4.77, 52.36, 5.01, 52.36),
        (4.89, 52.43, 4.89, 52.29),
        (4.80, 52.41, 4.97, 52.31),
        (4.80, 52.31, 4.97, 52.41),
    ]
    for (slng, slat, elng, elat) in diagonals:
        drives.append(generate_route_points(slng, slat, elng, elat, spacing_deg=0.00025))

    return drives

# ─── SQL generator ────────────────────────────────────────────────────────────

def main():
    drives = build_drives()
    total_points = sum(len(d) for d in drives)

    print(f"-- Amsterdam road surface seed data", file=sys.stderr)
    print(f"-- {len(drives)} drives, {total_points} points", file=sys.stderr)

    print("BEGIN;")
    print("DELETE FROM road_surface WHERE device_uuid LIKE 'ams-seed-%';")

    base_time = datetime(2026, 6, 20, 6, 0, 0)
    inserted = 0

    for drive_idx, points in enumerate(drives):
        device_uuid = f"ams-seed-{drive_idx:04d}"
        drive_start = base_time + timedelta(minutes=drive_idx * 3)

        # Bulk insert per drive using VALUES
        value_rows = []
        for pt_idx, (lng, lat) in enumerate(points):
            # Clamp to Amsterdam area
            if not (LNG_MIN <= lng <= LNG_MAX and LAT_MIN <= lat <= LAT_MAX):
                continue
            surface = classify_surface(lng, lat)
            confidence = random.randint(55, 95)
            recorded_at = drive_start + timedelta(seconds=pt_idx * 2)
            value_rows.append(
                f"  (ST_SetSRID(ST_Point({lng:.6f}, {lat:.6f}), 4326), "
                f"'{surface}', {confidence}, '{device_uuid}', "
                f"'{recorded_at.strftime('%Y-%m-%d %H:%M:%S')}')"
            )
            inserted += 1

        if value_rows:
            print(
                "INSERT INTO road_surface (location, surface_type, confidence, device_uuid, recorded_at) VALUES\n"
                + ",\n".join(value_rows) + ";"
            )

    print("COMMIT;")
    print(f"-- Inserted {inserted} surface readings across {len(drives)} drives", file=sys.stderr)

if __name__ == "__main__":
    main()
