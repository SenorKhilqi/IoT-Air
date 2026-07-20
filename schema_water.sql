-- ================================================================
-- schema_water.sql — Database Schema: Water Quality Monitor
-- Jalankan di Supabase SQL Editor
-- ================================================================

-- 0. Hapus tabel lama beserta policy jika ada (Mencegah konflik)
DROP TABLE IF EXISTS sensor_logs CASCADE;

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
DROP POLICY IF EXISTS "Allow anon INSERT" ON sensor_logs;
CREATE POLICY "Allow anon INSERT"
    ON sensor_logs FOR INSERT
    TO anon
    WITH CHECK (true);

-- 5. Policy: Izinkan SELECT untuk dashboard web (anon key)
DROP POLICY IF EXISTS "Allow anon SELECT" ON sensor_logs;
CREATE POLICY "Allow anon SELECT"
    ON sensor_logs FOR SELECT
    TO anon
    USING (true);

-- ================================================================
-- Schema siap digunakan.
-- Jalankan file ini di Supabase SQL Editor untuk inisialisasi database.
-- Data dummy telah dihapus — tabel akan diisi oleh perangkat ESP32.
-- ================================================================
