-- 1. Membuat tabel sensor_logs
CREATE TABLE sensor_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ph_avg FLOAT,
  water_level_avg FLOAT
);

-- 2. Mengaktifkan Row Level Security (RLS) pada tabel
ALTER TABLE sensor_logs ENABLE ROW LEVEL SECURITY;

-- 3. Membuat policy untuk anon role (agar API publik bisa digunakan)

-- a. Izinkan INSERT (untuk Node ESP32 menyimpan data)
CREATE POLICY "Allow anonymous INSERT" 
ON sensor_logs 
FOR INSERT 
TO anon 
WITH CHECK (true);

-- b. Izinkan SELECT (untuk Web Dashboard mengambil data)
CREATE POLICY "Allow anonymous SELECT" 
ON sensor_logs 
FOR SELECT 
TO anon 
USING (true);

-- 4. Membuat Data Dummy / Mock Data
-- Memasukkan 5.000 baris data dengan rentang waktu mundur 1 menit per baris (berurutan hingga saat ini)
INSERT INTO sensor_logs (created_at, ph_avg, water_level_avg)
SELECT 
  NOW() - ((5000 - i) * interval '1 minute'),
  -- Menghasilkan angka acak untuk pH antara 5.5 hingga 9.0 dengan 2 angka di belakang koma
  round((random() * (9.0 - 5.5) + 5.5)::numeric, 2)::FLOAT,
  -- Menghasilkan angka acak untuk water level antara 10 hingga 100
  floor(random() * (100 - 10 + 1) + 10)::INTEGER
FROM generate_series(1, 5000) AS s(i);

-- 4. Membuat Data Dummy / Mock Data (Bervariasi berdasarkan Hari dan Bulan)
-- Menggunakan Common Table Expression (CTE) untuk menghitung waktu terlebih dahulu
WITH data_series AS (
    SELECT 
        -- Diubah ke interval '1 hour' agar 5000 baris bisa mencakup rentang waktu ~7 bulan
        NOW() - ((5000 - i) * interval '1 hour') AS calc_time
    FROM generate_series(1, 5000) AS s(i)
)
INSERT INTO sensor_logs (created_at, ph_avg, water_level_avg)
SELECT 
    calc_time,
    
    -- ==========================================
    -- LOGIKA UNTUK NILAI pH (ph_avg)
    -- ==========================================
    CASE
        -- 1. Jika Hari Minggu (DOW = 0), asumsi aktivitas libur/maintenance, pH stabil (6.5 - 7.5)
        WHEN EXTRACT(DOW FROM calc_time) = 0 THEN 
            round((random() * (7.5 - 6.5) + 6.5)::numeric, 2)::FLOAT
            
        -- 2. Jika Musim Kemarau (Juli, Agustus, September), pH cenderung basa (7.5 - 9.0)
        WHEN EXTRACT(MONTH FROM calc_time) IN (7, 8, 9) THEN 
            round((random() * (9.0 - 7.5) + 7.5)::numeric, 2)::FLOAT
            
        -- 3. Jika Musim Hujan (Desember, Januari, Februari), pH cenderung asam (5.5 - 6.5)
        WHEN EXTRACT(MONTH FROM calc_time) IN (12, 1, 2) THEN 
            round((random() * (6.5 - 5.5) + 5.5)::numeric, 2)::FLOAT
            
        -- 4. Hari/Bulan Normal lainnya (6.0 - 8.0)
        ELSE 
            round((random() * (8.0 - 6.0) + 6.0)::numeric, 2)::FLOAT
    END AS ph_avg,
    
    -- ==========================================
    -- LOGIKA UNTUK KETINGGIAN AIR (water_level_avg)
    -- ==========================================
    CASE
        -- 1. Jika Hari Minggu (DOW = 0), level air dijaga di tengah-tengah (50 - 70)
        WHEN EXTRACT(DOW FROM calc_time) = 0 THEN 
            floor(random() * (70 - 50 + 1) + 50)::INTEGER
            
        -- 2. Jika Musim Kemarau, air sering surut (10 - 40)
        WHEN EXTRACT(MONTH FROM calc_time) IN (7, 8, 9) THEN 
            floor(random() * (40 - 10 + 1) + 10)::INTEGER
            
        -- 3. Jika Musim Hujan, debit air tinggi (70 - 100)
        WHEN EXTRACT(MONTH FROM calc_time) IN (12, 1, 2) THEN 
            floor(random() * (100 - 70 + 1) + 70)::INTEGER
            
        -- 4. Hari/Bulan Normal lainnya (40 - 80)
        ELSE 
            floor(random() * (80 - 40 + 1) + 40)::INTEGER
    END AS water_level_avg

FROM data_series;