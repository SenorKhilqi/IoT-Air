-- ================================================================
-- schema_water.sql — Database Schema: Water Quality Monitor
-- Jalankan di Supabase SQL Editor
-- ================================================================

-- 1. Buat tabel sensor_logs
CREATE TABLE IF NOT EXISTS sensor_logs (
    id            UUID                     DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()              NOT NULL,
    ph            FLOAT,          -- Nilai pH (0–14)
    flow          FLOAT,          -- Debit air (Liter/Menit)
    total_liter   FLOAT,          -- Total akumulasi air (Liter)
    water_level   FLOAT,          -- Tinggi air dari dasar tangki (cm)
    water_percent INTEGER,        -- Persentase isi tangki (0–100%)
    wifi_status   VARCHAR(20)     DEFAULT 'Unknown'
);

-- 2. Index untuk query berdasarkan waktu (penting untuk dashboard)
CREATE INDEX IF NOT EXISTS idx_sensor_logs_created_at
    ON sensor_logs (created_at DESC);

-- 3. Aktifkan Row Level Security
ALTER TABLE sensor_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Izinkan INSERT dari ESP32 (anon key)
CREATE POLICY "Allow anon INSERT"
    ON sensor_logs FOR INSERT
    TO anon
    WITH CHECK (true);

-- 5. Policy: Izinkan SELECT untuk dashboard web (anon key)
CREATE POLICY "Allow anon SELECT"
    ON sensor_logs FOR SELECT
    TO anon
    USING (true);

-- ================================================================
-- Data Dummy untuk Testing Dashboard
-- 1000 baris mundur 5 menit per baris (~3.5 hari)
-- ================================================================
INSERT INTO sensor_logs (created_at, ph, flow, total_liter, water_level, water_percent, wifi_status)
SELECT
    NOW() - ((1000 - i) * interval '5 minutes') AS created_at,
    -- pH: 6.0 - 8.5 dengan variasi diurnal
    round((
        7.0
        + sin(i * 0.15) * 0.8
        + (random() - 0.5) * 0.3
    )::numeric, 2)::FLOAT AS ph,
    -- Flow: 0 - 8 L/min (0 saat malam)
    CASE
        WHEN (i % 288) BETWEEN 72 AND 216 -- Siang hari (jam 6 - 18)
        THEN round((random() * 7.5 + 0.5)::numeric, 2)::FLOAT
        ELSE 0.0
    END AS flow,
    -- Total Liter akumulasi
    round((i * random() * 0.5)::numeric, 2)::FLOAT AS total_liter,
    -- Water Level: 5 - 40 cm
    round((20 + sin(i * 0.02) * 15 + (random() - 0.5) * 2)::numeric, 1)::FLOAT AS water_level,
    -- Water Percent
    LEAST(100, GREATEST(0,
        ROUND((20 + sin(i * 0.02) * 15 + (random()-0.5)*2) / 40 * 100)
    ))::INTEGER AS water_percent,
    'Online' AS wifi_status
FROM generate_series(1, 1000) AS s(i);
