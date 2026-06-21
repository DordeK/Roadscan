-- Amsterdam Road Segmentation Seed Data
-- Covers major routes across Amsterdam with realistic surface types:
--   smooth_asphalt  → A10 ring road, main arterials, suburbs
--   rough_asphalt   → secondary streets, outskirts
--   cobblestone     → city centre, Jordaan, canal rings, De Pijp
--   gravel          → park paths, Vondelpark edges, Noord waterfront

INSERT INTO road_surface (location, surface_type, confidence, device_uuid, recorded_at) VALUES

-- ─────────────────────────────────────────────
-- ROUTE 1: A10 Ring Road (West arc) — smooth_asphalt
-- ─────────────────────────────────────────────
(ST_SetSRID(ST_Point(4.8340, 52.3950), 4326), 'smooth_asphalt', 92, 'seed-device-01', NOW() - INTERVAL '2 hours'),
(ST_SetSRID(ST_Point(4.8320, 52.3900), 4326), 'smooth_asphalt', 94, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '10 seconds'),
(ST_SetSRID(ST_Point(4.8310, 52.3850), 4326), 'smooth_asphalt', 93, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '20 seconds'),
(ST_SetSRID(ST_Point(4.8310, 52.3800), 4326), 'smooth_asphalt', 91, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '30 seconds'),
(ST_SetSRID(ST_Point(4.8320, 52.3750), 4326), 'smooth_asphalt', 95, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '40 seconds'),
(ST_SetSRID(ST_Point(4.8340, 52.3700), 4326), 'smooth_asphalt', 96, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '50 seconds'),
(ST_SetSRID(ST_Point(4.8380, 52.3660), 4326), 'smooth_asphalt', 94, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '60 seconds'),
(ST_SetSRID(ST_Point(4.8430, 52.3630), 4326), 'smooth_asphalt', 92, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '70 seconds'),
(ST_SetSRID(ST_Point(4.8490, 52.3610), 4326), 'smooth_asphalt', 93, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '80 seconds'),
(ST_SetSRID(ST_Point(4.8550, 52.3600), 4326), 'smooth_asphalt', 95, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '90 seconds'),
(ST_SetSRID(ST_Point(4.8620, 52.3595), 4326), 'smooth_asphalt', 94, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '100 seconds'),
(ST_SetSRID(ST_Point(4.8700, 52.3592), 4326), 'smooth_asphalt', 96, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '110 seconds'),
(ST_SetSRID(ST_Point(4.8780, 52.3595), 4326), 'smooth_asphalt', 93, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '120 seconds'),
(ST_SetSRID(ST_Point(4.8860, 52.3600), 4326), 'smooth_asphalt', 95, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '130 seconds'),
(ST_SetSRID(ST_Point(4.8940, 52.3612), 4326), 'smooth_asphalt', 94, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '140 seconds'),
(ST_SetSRID(ST_Point(4.9010, 52.3630), 4326), 'smooth_asphalt', 92, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '150 seconds'),
(ST_SetSRID(ST_Point(4.9070, 52.3660), 4326), 'smooth_asphalt', 91, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '160 seconds'),
(ST_SetSRID(ST_Point(4.9110, 52.3700), 4326), 'smooth_asphalt', 93, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '170 seconds'),
(ST_SetSRID(ST_Point(4.9130, 52.3750), 4326), 'smooth_asphalt', 94, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '180 seconds'),
(ST_SetSRID(ST_Point(4.9130, 52.3800), 4326), 'smooth_asphalt', 95, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '190 seconds'),
(ST_SetSRID(ST_Point(4.9120, 52.3850), 4326), 'smooth_asphalt', 93, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '200 seconds'),
(ST_SetSRID(ST_Point(4.9100, 52.3900), 4326), 'smooth_asphalt', 92, 'seed-device-01', NOW() - INTERVAL '2 hours' + INTERVAL '210 seconds'),

-- ─────────────────────────────────────────────
-- ROUTE 2: Damrak / City Centre — cobblestone
-- ─────────────────────────────────────────────
(ST_SetSRID(ST_Point(4.8998, 52.3791), 4326), 'cobblestone', 88, 'seed-device-02', NOW() - INTERVAL '90 minutes'),
(ST_SetSRID(ST_Point(4.8990, 52.3780), 4326), 'cobblestone', 85, 'seed-device-02', NOW() - INTERVAL '90 minutes' + INTERVAL '8 seconds'),
(ST_SetSRID(ST_Point(4.8982, 52.3770), 4326), 'cobblestone', 87, 'seed-device-02', NOW() - INTERVAL '90 minutes' + INTERVAL '16 seconds'),
(ST_SetSRID(ST_Point(4.8975, 52.3760), 4326), 'cobblestone', 86, 'seed-device-02', NOW() - INTERVAL '90 minutes' + INTERVAL '24 seconds'),
(ST_SetSRID(ST_Point(4.8967, 52.3750), 4326), 'cobblestone', 89, 'seed-device-02', NOW() - INTERVAL '90 minutes' + INTERVAL '32 seconds'),
(ST_SetSRID(ST_Point(4.8958, 52.3741), 4326), 'cobblestone', 84, 'seed-device-02', NOW() - INTERVAL '90 minutes' + INTERVAL '40 seconds'),
(ST_SetSRID(ST_Point(4.8950, 52.3733), 4326), 'cobblestone', 87, 'seed-device-02', NOW() - INTERVAL '90 minutes' + INTERVAL '48 seconds'),
(ST_SetSRID(ST_Point(4.8941, 52.3725), 4326), 'cobblestone', 88, 'seed-device-02', NOW() - INTERVAL '90 minutes' + INTERVAL '56 seconds'),
(ST_SetSRID(ST_Point(4.8932, 52.3718), 4326), 'cobblestone', 86, 'seed-device-02', NOW() - INTERVAL '90 minutes' + INTERVAL '64 seconds'),
(ST_SetSRID(ST_Point(4.8926, 52.3731), 4326), 'cobblestone', 90, 'seed-device-02', NOW() - INTERVAL '90 minutes' + INTERVAL '72 seconds'),

-- ─────────────────────────────────────────────
-- ROUTE 3: Jordaan Neighbourhood — cobblestone + rough_asphalt
-- ─────────────────────────────────────────────
(ST_SetSRID(ST_Point(4.8820, 52.3760), 4326), 'cobblestone', 82, 'seed-device-03', NOW() - INTERVAL '80 minutes'),
(ST_SetSRID(ST_Point(4.8830, 52.3755), 4326), 'cobblestone', 84, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '10 seconds'),
(ST_SetSRID(ST_Point(4.8840, 52.3749), 4326), 'cobblestone', 81, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '20 seconds'),
(ST_SetSRID(ST_Point(4.8848, 52.3742), 4326), 'cobblestone', 83, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '30 seconds'),
(ST_SetSRID(ST_Point(4.8855, 52.3734), 4326), 'rough_asphalt', 72, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '40 seconds'),
(ST_SetSRID(ST_Point(4.8862, 52.3726), 4326), 'rough_asphalt', 74, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '50 seconds'),
(ST_SetSRID(ST_Point(4.8870, 52.3718), 4326), 'cobblestone', 85, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '60 seconds'),
(ST_SetSRID(ST_Point(4.8878, 52.3710), 4326), 'cobblestone', 83, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '70 seconds'),
(ST_SetSRID(ST_Point(4.8885, 52.3703), 4326), 'cobblestone', 86, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '80 seconds'),
(ST_SetSRID(ST_Point(4.8810, 52.3770), 4326), 'cobblestone', 80, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '90 seconds'),
(ST_SetSRID(ST_Point(4.8800, 52.3780), 4326), 'rough_asphalt', 70, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '100 seconds'),
(ST_SetSRID(ST_Point(4.8790, 52.3790), 4326), 'rough_asphalt', 68, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '110 seconds'),
(ST_SetSRID(ST_Point(4.8780, 52.3800), 4326), 'cobblestone', 78, 'seed-device-03', NOW() - INTERVAL '80 minutes' + INTERVAL '120 seconds'),

-- ─────────────────────────────────────────────
-- ROUTE 4: De Pijp neighbourhood — cobblestone + rough_asphalt
-- ─────────────────────────────────────────────
(ST_SetSRID(ST_Point(4.8970, 52.3530), 4326), 'cobblestone', 80, 'seed-device-04', NOW() - INTERVAL '70 minutes'),
(ST_SetSRID(ST_Point(4.8960, 52.3540), 4326), 'cobblestone', 82, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '10 seconds'),
(ST_SetSRID(ST_Point(4.8950, 52.3550), 4326), 'rough_asphalt', 71, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '20 seconds'),
(ST_SetSRID(ST_Point(4.8940, 52.3560), 4326), 'rough_asphalt', 73, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '30 seconds'),
(ST_SetSRID(ST_Point(4.8930, 52.3570), 4326), 'cobblestone', 79, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '40 seconds'),
(ST_SetSRID(ST_Point(4.8920, 52.3580), 4326), 'cobblestone', 81, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '50 seconds'),
(ST_SetSRID(ST_Point(4.8910, 52.3590), 4326), 'cobblestone', 83, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '60 seconds'),
(ST_SetSRID(ST_Point(4.8900, 52.3600), 4326), 'rough_asphalt', 69, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '70 seconds'),
(ST_SetSRID(ST_Point(4.8890, 52.3610), 4326), 'rough_asphalt', 67, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '80 seconds'),
(ST_SetSRID(ST_Point(4.8880, 52.3620), 4326), 'cobblestone', 77, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '90 seconds'),
(ST_SetSRID(ST_Point(4.8990, 52.3520), 4326), 'cobblestone', 84, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '100 seconds'),
(ST_SetSRID(ST_Point(4.9010, 52.3510), 4326), 'rough_asphalt', 70, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '110 seconds'),
(ST_SetSRID(ST_Point(4.9030, 52.3505), 4326), 'rough_asphalt', 72, 'seed-device-04', NOW() - INTERVAL '70 minutes' + INTERVAL '120 seconds'),

-- ─────────────────────────────────────────────
-- ROUTE 5: Vondelpark + Oud-Zuid — smooth_asphalt + gravel
-- ─────────────────────────────────────────────
(ST_SetSRID(ST_Point(4.8680, 52.3580), 4326), 'smooth_asphalt', 88, 'seed-device-05', NOW() - INTERVAL '60 minutes'),
(ST_SetSRID(ST_Point(4.8690, 52.3590), 4326), 'smooth_asphalt', 90, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '10 seconds'),
(ST_SetSRID(ST_Point(4.8700, 52.3600), 4326), 'gravel',         60, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '20 seconds'),
(ST_SetSRID(ST_Point(4.8710, 52.3610), 4326), 'gravel',         58, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '30 seconds'),
(ST_SetSRID(ST_Point(4.8720, 52.3620), 4326), 'gravel',         62, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '40 seconds'),
(ST_SetSRID(ST_Point(4.8730, 52.3630), 4326), 'smooth_asphalt', 87, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '50 seconds'),
(ST_SetSRID(ST_Point(4.8740, 52.3640), 4326), 'smooth_asphalt', 89, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '60 seconds'),
(ST_SetSRID(ST_Point(4.8750, 52.3650), 4326), 'smooth_asphalt', 91, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '70 seconds'),
(ST_SetSRID(ST_Point(4.8660, 52.3570), 4326), 'gravel',         55, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '80 seconds'),
(ST_SetSRID(ST_Point(4.8650, 52.3560), 4326), 'gravel',         57, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '90 seconds'),
(ST_SetSRID(ST_Point(4.8640, 52.3550), 4326), 'smooth_asphalt', 85, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '100 seconds'),
(ST_SetSRID(ST_Point(4.8760, 52.3660), 4326), 'smooth_asphalt', 86, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '110 seconds'),
(ST_SetSRID(ST_Point(4.8770, 52.3670), 4326), 'smooth_asphalt', 88, 'seed-device-05', NOW() - INTERVAL '60 minutes' + INTERVAL '120 seconds'),

-- ─────────────────────────────────────────────
-- ROUTE 6: Canal Ring (Prinsengracht / Keizersgracht) — cobblestone
-- ─────────────────────────────────────────────
(ST_SetSRID(ST_Point(4.8840, 52.3720), 4326), 'cobblestone', 88, 'seed-device-06', NOW() - INTERVAL '50 minutes'),
(ST_SetSRID(ST_Point(4.8845, 52.3710), 4326), 'cobblestone', 86, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '10 seconds'),
(ST_SetSRID(ST_Point(4.8850, 52.3700), 4326), 'cobblestone', 89, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '20 seconds'),
(ST_SetSRID(ST_Point(4.8855, 52.3690), 4326), 'cobblestone', 87, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '30 seconds'),
(ST_SetSRID(ST_Point(4.8860, 52.3680), 4326), 'cobblestone', 85, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '40 seconds'),
(ST_SetSRID(ST_Point(4.8865, 52.3670), 4326), 'cobblestone', 88, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '50 seconds'),
(ST_SetSRID(ST_Point(4.8870, 52.3660), 4326), 'cobblestone', 84, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '60 seconds'),
(ST_SetSRID(ST_Point(4.8875, 52.3650), 4326), 'cobblestone', 86, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '70 seconds'),
(ST_SetSRID(ST_Point(4.8880, 52.3640), 4326), 'cobblestone', 89, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '80 seconds'),
(ST_SetSRID(ST_Point(4.8870, 52.3730), 4326), 'cobblestone', 87, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '90 seconds'),
(ST_SetSRID(ST_Point(4.8860, 52.3740), 4326), 'cobblestone', 85, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '100 seconds'),
(ST_SetSRID(ST_Point(4.8850, 52.3750), 4326), 'cobblestone', 88, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '110 seconds'),
(ST_SetSRID(ST_Point(4.8840, 52.3760), 4326), 'cobblestone', 86, 'seed-device-06', NOW() - INTERVAL '50 minutes' + INTERVAL '120 seconds'),

-- ─────────────────────────────────────────────
-- ROUTE 7: Nieuw-West suburb — smooth_asphalt
-- ─────────────────────────────────────────────
(ST_SetSRID(ST_Point(4.8200, 52.3680), 4326), 'smooth_asphalt', 91, 'seed-device-07', NOW() - INTERVAL '40 minutes'),
(ST_SetSRID(ST_Point(4.8220, 52.3670), 4326), 'smooth_asphalt', 93, 'seed-device-07', NOW() - INTERVAL '40 minutes' + INTERVAL '10 seconds'),
(ST_SetSRID(ST_Point(4.8250, 52.3660), 4326), 'smooth_asphalt', 92, 'seed-device-07', NOW() - INTERVAL '40 minutes' + INTERVAL '20 seconds'),
(ST_SetSRID(ST_Point(4.8280, 52.3655), 4326), 'smooth_asphalt', 90, 'seed-device-07', NOW() - INTERVAL '40 minutes' + INTERVAL '30 seconds'),
(ST_SetSRID(ST_Point(4.8310, 52.3650), 4326), 'smooth_asphalt', 94, 'seed-device-07', NOW() - INTERVAL '40 minutes' + INTERVAL '40 seconds'),
(ST_SetSRID(ST_Point(4.8340, 52.3648), 4326), 'smooth_asphalt', 93, 'seed-device-07', NOW() - INTERVAL '40 minutes' + INTERVAL '50 seconds'),
(ST_SetSRID(ST_Point(4.8180, 52.3700), 4326), 'smooth_asphalt', 89, 'seed-device-07', NOW() - INTERVAL '40 minutes' + INTERVAL '60 seconds'),
(ST_SetSRID(ST_Point(4.8160, 52.3720), 4326), 'smooth_asphalt', 90, 'seed-device-07', NOW() - INTERVAL '40 minutes' + INTERVAL '70 seconds'),
(ST_SetSRID(ST_Point(4.8150, 52.3740), 4326), 'rough_asphalt',  68, 'seed-device-07', NOW() - INTERVAL '40 minutes' + INTERVAL '80 seconds'),
(ST_SetSRID(ST_Point(4.8155, 52.3760), 4326), 'rough_asphalt',  65, 'seed-device-07', NOW() - INTERVAL '40 minutes' + INTERVAL '90 seconds'),
(ST_SetSRID(ST_Point(4.8170, 52.3780), 4326), 'smooth_asphalt', 88, 'seed-device-07', NOW() - INTERVAL '40 minutes' + INTERVAL '100 seconds'),

-- ─────────────────────────────────────────────
-- ROUTE 8: Amsterdam Noord — rough_asphalt + gravel
-- ─────────────────────────────────────────────
(ST_SetSRID(ST_Point(4.9100, 52.3950), 4326), 'rough_asphalt', 70, 'seed-device-08', NOW() - INTERVAL '30 minutes'),
(ST_SetSRID(ST_Point(4.9080, 52.3940), 4326), 'rough_asphalt', 72, 'seed-device-08', NOW() - INTERVAL '30 minutes' + INTERVAL '10 seconds'),
(ST_SetSRID(ST_Point(4.9060, 52.3930), 4326), 'rough_asphalt', 69, 'seed-device-08', NOW() - INTERVAL '30 minutes' + INTERVAL '20 seconds'),
(ST_SetSRID(ST_Point(4.9040, 52.3920), 4326), 'gravel',        55, 'seed-device-08', NOW() - INTERVAL '30 minutes' + INTERVAL '30 seconds'),
(ST_SetSRID(ST_Point(4.9020, 52.3910), 4326), 'gravel',        58, 'seed-device-08', NOW() - INTERVAL '30 minutes' + INTERVAL '40 seconds'),
(ST_SetSRID(ST_Point(4.9000, 52.3905), 4326), 'gravel',        53, 'seed-device-08', NOW() - INTERVAL '30 minutes' + INTERVAL '50 seconds'),
(ST_SetSRID(ST_Point(4.8980, 52.3900), 4326), 'rough_asphalt', 67, 'seed-device-08', NOW() - INTERVAL '30 minutes' + INTERVAL '60 seconds'),
(ST_SetSRID(ST_Point(4.8960, 52.3895), 4326), 'rough_asphalt', 71, 'seed-device-08', NOW() - INTERVAL '30 minutes' + INTERVAL '70 seconds'),
(ST_SetSRID(ST_Point(4.8940, 52.3890), 4326), 'smooth_asphalt', 82, 'seed-device-08', NOW() - INTERVAL '30 minutes' + INTERVAL '80 seconds'),
(ST_SetSRID(ST_Point(4.8920, 52.3888), 4326), 'smooth_asphalt', 85, 'seed-device-08', NOW() - INTERVAL '30 minutes' + INTERVAL '90 seconds'),
(ST_SetSRID(ST_Point(4.9120, 52.3960), 4326), 'gravel',        50, 'seed-device-08', NOW() - INTERVAL '30 minutes' + INTERVAL '100 seconds'),
(ST_SetSRID(ST_Point(4.9140, 52.3970), 4326), 'gravel',        52, 'seed-device-08', NOW() - INTERVAL '30 minutes' + INTERVAL '110 seconds'),

-- ─────────────────────────────────────────────
-- ROUTE 9: Plantage / Oost — smooth_asphalt + cobblestone
-- ─────────────────────────────────────────────
(ST_SetSRID(ST_Point(4.9089, 52.3659), 4326), 'smooth_asphalt', 86, 'seed-device-09', NOW() - INTERVAL '20 minutes'),
(ST_SetSRID(ST_Point(4.9100, 52.3650), 4326), 'smooth_asphalt', 88, 'seed-device-09', NOW() - INTERVAL '20 minutes' + INTERVAL '10 seconds'),
(ST_SetSRID(ST_Point(4.9115, 52.3642), 4326), 'cobblestone',    78, 'seed-device-09', NOW() - INTERVAL '20 minutes' + INTERVAL '20 seconds'),
(ST_SetSRID(ST_Point(4.9130, 52.3635), 4326), 'cobblestone',    80, 'seed-device-09', NOW() - INTERVAL '20 minutes' + INTERVAL '30 seconds'),
(ST_SetSRID(ST_Point(4.9150, 52.3628), 4326), 'cobblestone',    77, 'seed-device-09', NOW() - INTERVAL '20 minutes' + INTERVAL '40 seconds'),
(ST_SetSRID(ST_Point(4.9170, 52.3620), 4326), 'smooth_asphalt', 84, 'seed-device-09', NOW() - INTERVAL '20 minutes' + INTERVAL '50 seconds'),
(ST_SetSRID(ST_Point(4.9200, 52.3615), 4326), 'smooth_asphalt', 87, 'seed-device-09', NOW() - INTERVAL '20 minutes' + INTERVAL '60 seconds'),
(ST_SetSRID(ST_Point(4.9230, 52.3612), 4326), 'smooth_asphalt', 89, 'seed-device-09', NOW() - INTERVAL '20 minutes' + INTERVAL '70 seconds'),
(ST_SetSRID(ST_Point(4.9260, 52.3610), 4326), 'rough_asphalt',  66, 'seed-device-09', NOW() - INTERVAL '20 minutes' + INTERVAL '80 seconds'),
(ST_SetSRID(ST_Point(4.9290, 52.3608), 4326), 'rough_asphalt',  64, 'seed-device-09', NOW() - INTERVAL '20 minutes' + INTERVAL '90 seconds'),
(ST_SetSRID(ST_Point(4.9070, 52.3665), 4326), 'cobblestone',    82, 'seed-device-09', NOW() - INTERVAL '20 minutes' + INTERVAL '100 seconds'),
(ST_SetSRID(ST_Point(4.9050, 52.3672), 4326), 'cobblestone',    80, 'seed-device-09', NOW() - INTERVAL '20 minutes' + INTERVAL '110 seconds'),

-- ─────────────────────────────────────────────
-- ROUTE 10: Leidseplein / Museumplein — cobblestone + smooth_asphalt
-- ─────────────────────────────────────────────
(ST_SetSRID(ST_Point(4.8827, 52.3643), 4326), 'cobblestone',    85, 'seed-device-10', NOW() - INTERVAL '15 minutes'),
(ST_SetSRID(ST_Point(4.8820, 52.3650), 4326), 'cobblestone',    83, 'seed-device-10', NOW() - INTERVAL '15 minutes' + INTERVAL '10 seconds'),
(ST_SetSRID(ST_Point(4.8810, 52.3658), 4326), 'cobblestone',    86, 'seed-device-10', NOW() - INTERVAL '15 minutes' + INTERVAL '20 seconds'),
(ST_SetSRID(ST_Point(4.8800, 52.3665), 4326), 'smooth_asphalt', 87, 'seed-device-10', NOW() - INTERVAL '15 minutes' + INTERVAL '30 seconds'),
(ST_SetSRID(ST_Point(4.8790, 52.3672), 4326), 'smooth_asphalt', 89, 'seed-device-10', NOW() - INTERVAL '15 minutes' + INTERVAL '40 seconds'),
(ST_SetSRID(ST_Point(4.8780, 52.3678), 4326), 'smooth_asphalt', 88, 'seed-device-10', NOW() - INTERVAL '15 minutes' + INTERVAL '50 seconds'),
(ST_SetSRID(ST_Point(4.8835, 52.3636), 4326), 'cobblestone',    84, 'seed-device-10', NOW() - INTERVAL '15 minutes' + INTERVAL '60 seconds'),
(ST_SetSRID(ST_Point(4.8845, 52.3628), 4326), 'cobblestone',    82, 'seed-device-10', NOW() - INTERVAL '15 minutes' + INTERVAL '70 seconds'),
(ST_SetSRID(ST_Point(4.8855, 52.3620), 4326), 'smooth_asphalt', 85, 'seed-device-10', NOW() - INTERVAL '15 minutes' + INTERVAL '80 seconds'),
(ST_SetSRID(ST_Point(4.8865, 52.3612), 4326), 'smooth_asphalt', 87, 'seed-device-10', NOW() - INTERVAL '15 minutes' + INTERVAL '90 seconds'),

-- ─────────────────────────────────────────────
-- ROUTE 11: Waterlooplein / Jewish Quarter — cobblestone
-- ─────────────────────────────────────────────
(ST_SetSRID(ST_Point(4.9010, 52.3680), 4326), 'cobblestone', 83, 'seed-device-11', NOW() - INTERVAL '10 minutes'),
(ST_SetSRID(ST_Point(4.9015, 52.3670), 4326), 'cobblestone', 85, 'seed-device-11', NOW() - INTERVAL '10 minutes' + INTERVAL '10 seconds'),
(ST_SetSRID(ST_Point(4.9020, 52.3660), 4326), 'cobblestone', 82, 'seed-device-11', NOW() - INTERVAL '10 minutes' + INTERVAL '20 seconds'),
(ST_SetSRID(ST_Point(4.9025, 52.3650), 4326), 'cobblestone', 84, 'seed-device-11', NOW() - INTERVAL '10 minutes' + INTERVAL '30 seconds'),
(ST_SetSRID(ST_Point(4.9030, 52.3640), 4326), 'rough_asphalt', 68, 'seed-device-11', NOW() - INTERVAL '10 minutes' + INTERVAL '40 seconds'),
(ST_SetSRID(ST_Point(4.9035, 52.3630), 4326), 'rough_asphalt', 70, 'seed-device-11', NOW() - INTERVAL '10 minutes' + INTERVAL '50 seconds'),
(ST_SetSRID(ST_Point(4.9005, 52.3690), 4326), 'cobblestone',   81, 'seed-device-11', NOW() - INTERVAL '10 minutes' + INTERVAL '60 seconds'),
(ST_SetSRID(ST_Point(4.9000, 52.3700), 4326), 'cobblestone',   83, 'seed-device-11', NOW() - INTERVAL '10 minutes' + INTERVAL '70 seconds'),
(ST_SetSRID(ST_Point(4.8995, 52.3710), 4326), 'cobblestone',   85, 'seed-device-11', NOW() - INTERVAL '10 minutes' + INTERVAL '80 seconds');
