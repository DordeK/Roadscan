#!/usr/bin/env python3
"""
Generate synthetic labeled accelerometer training data for pothole detection.

Simulates 6 driving scenarios with different road types. Each sample matches
the app's RecordScreen CSV export format, with an extra 'session_id' column.

Output columns:
  session_id       — driving scenario name
  t                — Unix timestamp in ms
  ax_g, ay_g, az_g — raw accelerometer in G units (as returned by expo-sensors)
  vert_accel_ms2   — gravity-corrected vertical acceleration (m/s²)
  delta_ms2        — change in vert_accel between consecutive samples (m/s²)
  pothole_label    — 1 within ±8 samples of a pothole mark, else 0
  event_type       — human-readable: 'pothole', 'speed_bump', 'braking', 'normal'

Usage:
  python3 ml/generate_training_data.py
  python3 ml/generate_training_data.py --out ml/my_data.csv
"""

import csv
import math
import random
import argparse
import os

SAMPLE_HZ = 20
SAMPLE_INTERVAL_MS = 50
GRAVITY_ALPHA = 0.8         # must match mobile/src/constants/detection.js
LABEL_HALF_WIN = 8          # samples each side of pothole centre that get label=1
MIN_POTHOLE_SPACING = 40    # minimum samples between two potholes (~2 s)

# ─── Road scenarios ───────────────────────────────────────────────────────────
# ppm = potholes per minute
SESSIONS = [
    {"id": "highway",      "duration_s": 300, "ppm": 0.5, "lateral": 0.03, "road": 0.10, "surface": "smooth_asphalt",  "cobble_hz": 0},
    {"id": "parking_lot",  "duration_s": 120, "ppm": 1.0, "lateral": 0.04, "road": 0.12, "surface": "smooth_asphalt",  "cobble_hz": 0},
    {"id": "city_smooth",  "duration_s": 240, "ppm": 2.0, "lateral": 0.06, "road": 0.18, "surface": "rough_asphalt",   "cobble_hz": 0},
    {"id": "country_road", "duration_s": 180, "ppm": 3.0, "lateral": 0.07, "road": 0.22, "surface": "rough_asphalt",   "cobble_hz": 0},
    {"id": "city_rough",   "duration_s": 300, "ppm": 6.0, "lateral": 0.10, "road": 0.28, "surface": "rough_asphalt",   "cobble_hz": 0},
    # Cobblestone: moderate noise + periodic oscillation at ~2.5 Hz (stone spacing)
    {"id": "cobblestone",  "duration_s": 180, "ppm": 2.0, "lateral": 0.08, "road": 0.14, "surface": "cobblestone",    "cobble_hz": 2.5},
    {"id": "bad_road",     "duration_s": 180, "ppm": 9.0, "lateral": 0.12, "road": 0.42, "surface": "gravel",          "cobble_hz": 0},
]


# ─── Event profile generators ─────────────────────────────────────────────────

def pothole_profile():
    """
    V-spike for a pothole: sharp downward delta followed by upward delta.
    Returns list of z-axis m/s² additions for ~7 samples.
    The detection algorithm triggers on prevDelta < -1.5 AND delta > 1.0.
    """
    sev = random.choices(["low", "medium", "high"], weights=[0.4, 0.4, 0.2])[0]
    mag = {"low": random.uniform(2.5, 5.0),
           "medium": random.uniform(5.0, 8.5),
           "high": random.uniform(8.5, 14.0)}[sev]
    d = random.uniform(0.28, 0.55)  # damping ratio
    j = lambda: random.uniform(0.88, 1.0)
    return (sev, [
        mag * 0.12 * j(),          # pre-bump (wheel hits lip)
        -mag * j(),                 # DOWN spike  ← wheel drops
        mag * random.uniform(0.72, 0.96),  # UP spike   ← wheel climbs out
        -mag * d,                   # ring-down
         mag * d * 0.48,
        -mag * d * 0.22,
         mag * d * 0.08,
    ])


def speed_bump_profile():
    """
    Symmetric hump: slow approach → gradual up → gradual down.
    NOT a pothole — the down-spike comes BEFORE the up-spike (opposite phase).
    Label = 0.
    """
    mag = random.uniform(3.0, 7.0)
    d = random.uniform(0.4, 0.6)
    return [
         mag * 0.20,   # front wheel rising
         mag * 0.75,   # peak up (front)
         mag * 0.30,   # settling
        -mag * 0.20,   # front drops off back
        -mag * 0.10,
         mag * 0.40,   # rear wheel rises
         mag * 0.65,
         mag * 0.20,
        -mag * 0.25,   # rear drops off
        -mag * 0.10,
    ]


def braking_profile(lateral_std):
    """
    Hard braking: forward deceleration (ay spike) with minimal vertical effect.
    Returns (ay_add list, az_add list) each ~8 samples long. Label = 0.
    """
    mag = random.uniform(3.0, 6.0)   # m/s² deceleration
    profile_y = [-mag * f for f in [0.3, 0.7, 1.0, 0.9, 0.7, 0.4, 0.2, 0.05]]
    profile_z = [random.gauss(0, 0.3) * 9.81 for _ in profile_y]
    return profile_y, profile_z


# ─── Session generator ────────────────────────────────────────────────────────

def generate_session(cfg, seed):
    random.seed(seed)
    n = int(cfg["duration_s"] * SAMPLE_HZ)
    lat_std = cfg["lateral"] * 9.81   # m/s²
    road_std = cfg["road"] * 9.81     # m/s²

    # Place potholes
    n_potholes = max(1, round(cfg["ppm"] * cfg["duration_s"] / 60))
    margin = int(n * 0.05)
    centres = []
    for _ in range(n_potholes * 20):
        if len(centres) >= n_potholes:
            break
        idx = random.randint(margin, n - margin)
        if all(abs(idx - p) > MIN_POTHOLE_SPACING for p in centres):
            centres.append(idx)
    centres.sort()

    # Place speed bumps (~1 per 2 min on average)
    n_bumps = max(0, int(cfg["duration_s"] / 120 * random.uniform(0.5, 2.0)))
    bump_centres = []
    for _ in range(n_bumps * 10):
        if len(bump_centres) >= n_bumps:
            break
        idx = random.randint(margin, n - margin)
        if all(abs(idx - p) > 30 for p in centres + bump_centres):
            bump_centres.append(idx)

    # Place braking events (~1 per 90 s)
    n_brakes = max(0, int(cfg["duration_s"] / 90 * random.uniform(0.5, 1.5)))
    brake_centres = []
    for _ in range(n_brakes * 10):
        if len(brake_centres) >= n_brakes:
            break
        idx = random.randint(margin, n - margin)
        if all(abs(idx - p) > 20 for p in centres + bump_centres + brake_centres):
            brake_centres.append(idx)

    # Build az_overlay and ay_overlay dicts (sample_index → m/s² addition)
    az_overlay = {}
    ay_overlay = {}
    pothole_sevs = {}

    for c in centres:
        sev, profile = pothole_profile()
        pothole_sevs[c] = sev
        start = c - 1
        for off, val in enumerate(profile):
            az_overlay[start + off] = az_overlay.get(start + off, 0.0) + val

    for c in bump_centres:
        profile = speed_bump_profile()
        start = c - len(profile) // 2
        for off, val in enumerate(profile):
            az_overlay[start + off] = az_overlay.get(start + off, 0.0) + val

    for c in brake_centres:
        p_y, p_z = braking_profile(lat_std)
        for off, (vy, vz) in enumerate(zip(p_y, p_z)):
            ay_overlay[c + off] = ay_overlay.get(c + off, 0.0) + vy
            az_overlay[c + off] = az_overlay.get(c + off, 0.0) + vz

    # Build label set and event_type map
    label_set = set()
    event_map = {}  # sample_index → event_type string
    for c in centres:
        for i in range(max(0, c - LABEL_HALF_WIN), min(n, c + LABEL_HALF_WIN + 1)):
            label_set.add(i)
            event_map[i] = "pothole"
    for c in bump_centres:
        p_len = len(speed_bump_profile())
        for i in range(max(0, c - p_len // 2), min(n, c + p_len // 2 + 1)):
            if i not in label_set:
                event_map[i] = "speed_bump"
    for c in brake_centres:
        for i in range(c, min(n, c + 8)):
            if i not in label_set:
                event_map[i] = "braking"

    # ── Simulate with gravity filter ──────────────────────────────────────────
    grav_x, grav_y, grav_z = 0.0, 0.0, -9.81
    prev_vert = None
    rows = []
    t = 1_750_000_000_000  # epoch start (ms)

    cobble_hz = cfg.get("cobble_hz", 0)
    cobble_amp = road_std * 1.8  # cobblestone peak amplitude

    for i in range(n):
        ax = random.gauss(0, lat_std)
        ay = random.gauss(0, lat_std) + ay_overlay.get(i, 0.0)
        # Cobblestone: add sinusoidal oscillation on top of base noise
        cobble = cobble_amp * math.sin(2 * math.pi * cobble_hz * i / SAMPLE_HZ) if cobble_hz else 0.0
        az = -9.81 + random.gauss(0, road_std) + cobble + az_overlay.get(i, 0.0)

        grav_x = GRAVITY_ALPHA * grav_x + (1 - GRAVITY_ALPHA) * ax
        grav_y = GRAVITY_ALPHA * grav_y + (1 - GRAVITY_ALPHA) * ay
        grav_z = GRAVITY_ALPHA * grav_z + (1 - GRAVITY_ALPHA) * az
        grav_mag = math.sqrt(grav_x**2 + grav_y**2 + grav_z**2)
        if grav_mag < 1e-9:
            t += SAMPLE_INTERVAL_MS
            continue

        gu = (grav_x / grav_mag, grav_y / grav_mag, grav_z / grav_mag)
        vert_accel = ax * gu[0] + ay * gu[1] + az * gu[2] - grav_mag
        delta = (vert_accel - prev_vert) if prev_vert is not None else 0.0
        prev_vert = vert_accel

        rows.append({
            "session_id":      cfg["id"],
            "surface_type":    cfg["surface"],
            "t":               t,
            "ax_g":            round(ax / 9.81, 5),
            "ay_g":            round(ay / 9.81, 5),
            "az_g":            round(az / 9.81, 5),
            "vert_accel_ms2":  round(vert_accel, 4),
            "delta_ms2":       round(delta, 4),
            "pothole_label":   1 if i in label_set else 0,
            "event_type":      event_map.get(i, "normal"),
        })
        t += SAMPLE_INTERVAL_MS

    return rows, len(centres), len(bump_centres), len(brake_centres)


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "training_data.csv"))
    args = parser.parse_args()

    fieldnames = [
        "session_id", "surface_type", "t", "ax_g", "ay_g", "az_g",
        "vert_accel_ms2", "delta_ms2", "pothole_label", "event_type",
    ]

    total_samples = total_potholes = total_pos_labels = 0

    print(f"\nGenerating training data → {args.out}\n")
    print(f"  {'session':20s}  {'samples':>8}  {'potholes':>9}  {'bumps':>6}  {'brakes':>7}")
    print("  " + "-" * 58)

    with open(args.out, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for seed, cfg in enumerate(SESSIONS):
            rows, n_ph, n_bmp, n_brk = generate_session(cfg, seed=seed * 137 + 7)
            writer.writerows(rows)
            pos = sum(1 for r in rows if r["pothole_label"] == 1)
            total_samples  += len(rows)
            total_potholes += n_ph
            total_pos_labels += pos
            print(f"  {cfg['id']:20s}  {len(rows):8,}  {n_ph:9d}  {n_bmp:6d}  {n_brk:7d}")

    neg = total_samples - total_pos_labels
    print(f"\n  {'TOTAL':20s}  {total_samples:8,}  {total_potholes:9d}")
    print(f"\nLabel distribution:")
    print(f"  positive (pothole) : {total_pos_labels:7,}  ({100 * total_pos_labels / total_samples:.1f}%)")
    print(f"  negative (no hole) : {neg:7,}  ({100 * neg / total_samples:.1f}%)")
    print(f"\nDone. Wrote {args.out}")


if __name__ == "__main__":
    main()
