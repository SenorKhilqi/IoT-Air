# 💧 SHE Water Quality Monitor

Sistem pemantauan kualitas air *end-to-end* berbasis **ESP32** yang mengukur pH, debit air, dan level tangki secara real-time. Data dikirimkan ke **Supabase** dan divisualisasikan melalui **dashboard web Next.js 16** yang di-*deploy* di **Vercel**.

🔗 **Live Dashboard:** [iot-air-web.vercel.app](https://iot-air-web.vercel.app)

---

## 🗂️ Struktur Proyek

```
IoT-Air/
├── firmware_arduino/
│   └── SHEWaterMonitor/
│       ├── SHEWaterMonitor.ino   ← File utama Arduino
│       ├── config.h              ← ⚙️ Konfigurasi pin, timer, kalibrasi
│       ├── secrets.h             ← 🔑 WiFi & Supabase credentials (JANGAN di-commit!)
│       ├── sensor_ph.h/.cpp      ← Modul sensor pH analog
│       ├── waterflow.h/.cpp      ← Modul sensor aliran air YF-S201
│       ├── ultrasonic.h/.cpp     ← Modul sensor level air HC-SR04
│       ├── lcd_display.h/.cpp    ← Modul LCD I2C 16x2 (3 halaman rotasi)
│       ├── sdcard.h/.cpp         ← Modul logging CSV ke SD Card + retry
│       ├── wifi_manager.h/.cpp   ← Modul manajemen WiFi + auto-reconnect
│       └── supabase.h/.cpp       ← Modul POST JSON ke Supabase REST API
├── app/
│   ├── page.tsx                  ← Dashboard utama (4 kartu sensor real-time)
│   ├── statistics/page.tsx       ← Grafik tren historis (1D/1W/1M)
│   ├── history/page.tsx          ← Tabel riwayat data mentah + export Excel
│   └── globals.css               ← Desain glassmorphism premium
├── components/
│   └── Navbar.tsx                ← Navigasi bawah (Dashboard/Statistics/History)
├── lib/
│   └── supabaseClient.ts         ← Singleton Supabase client
├── schema_water.sql              ← Skema database PostgreSQL (jalankan di Supabase)
├── proxy.ts                      ← Next.js 16 middleware
└── .env.local                    ← Environment variables lokal (jangan di-commit!)
```

---

## 🔌 Wiring — Koneksi Hardware ke ESP32

### Tabel Koneksi Lengkap

| Komponen | Pin Komponen | Pin ESP32 | Catatan |
|---|---|---|---|
| **Sensor pH (Analog)** | OUT | `GPIO 34` | ADC1_CH6 — input-only |
| **Sensor pH** | VCC | `3.3V` atau `5V` | Cek datasheet modul |
| **Sensor pH** | GND | `GND` | |
| **YF-S201 (Flow Meter)** | Signal (kuning) | `GPIO 16` | Hardware interrupt |
| **YF-S201** | VCC (merah) | `5V` | |
| **YF-S201** | GND (hitam) | `GND` | |
| **HC-SR04 (Ultrasonic)** | Trig | `GPIO 26` | |
| **HC-SR04** | Echo | `GPIO 27` | |
| **HC-SR04** | VCC | `5V` | |
| **HC-SR04** | GND | `GND` | |
| **LCD I2C 16x2** | SDA | `GPIO 21` | Default Wire ESP32 |
| **LCD I2C** | SCL | `GPIO 22` | Default Wire ESP32 |
| **LCD I2C** | VCC | `5V` | |
| **LCD I2C** | GND | `GND` | |
| **Modul SD Card** | MOSI | `GPIO 23` | SPI VSPI |
| **Modul SD Card** | MISO | `GPIO 19` | SPI VSPI |
| **Modul SD Card** | SCK | `GPIO 18` | SPI VSPI |
| **Modul SD Card** | CS | `GPIO 5` | Chip Select |
| **Modul SD Card** | VCC | `3.3V` | |
| **Modul SD Card** | GND | `GND` | |

### Diagram ASCII

```
                         ┌───────────────────┐
                         │      ESP32         │
                         │                   │
  Sensor pH Analog ──────┤ GPIO34 (ADC)       │
  YF-S201 Signal   ──────┤ GPIO16 (INT)       │
  HC-SR04 Trig     ──────┤ GPIO26             │
  HC-SR04 Echo     ──────┤ GPIO27             │
  LCD I2C SDA      ──────┤ GPIO21             │
  LCD I2C SCL      ──────┤ GPIO22             │
  SD Card MOSI     ──────┤ GPIO23 (VSPI MOSI) │
  SD Card MISO     ──────┤ GPIO19 (VSPI MISO) │
  SD Card SCK      ──────┤ GPIO18 (VSPI CLK)  │
  SD Card CS       ──────┤ GPIO5              │
                         │                   │
  GND (semua)      ──────┤ GND               │
  5V (YF, HC, LCD) ──────┤ 5V / VIN           │
  3.3V (pH, SD)    ──────┤ 3.3V              │
                         └───────────────────┘
```

> **Catatan:** GPIO34 adalah **input-only** — tidak ada pull-up/down internal. LCD tidak tampil? Coba ganti alamat I2C dari `0x27` ke `0x3F` di `config.h`.

---

## 📦 Library yang Diperlukan (Arduino IDE)

Install via **Tools → Manage Libraries**:

| Library | Author | Versi |
|---|---|---|
| `LiquidCrystal I2C` | Frank de Brabander | Latest |
| `ArduinoJson` | Benoit Blanchon | **v7.x** |

Install board ESP32 via **File → Preferences → Additional Boards Manager URLs**:
```
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```
Lalu **Tools → Board → Boards Manager** → cari `esp32` by Espressif → Install.

---

## 🔑 Konfigurasi Wajib: `secrets.h`

Buka `firmware_arduino/SHEWaterMonitor/secrets.h` dan isi:

```c
// WiFi
#define WIFI_SSID       "Nama_WiFi_Anda"
#define WIFI_PASSWORD   "Password_WiFi_Anda"

// Supabase — Project Settings → API di Supabase Dashboard
#define SUPABASE_URL      "https://dvgjtcobaleolvkarcbb.supabase.co"
#define SUPABASE_ANON_KEY "sb_publishable_NEB9nY9Su_oVintckWJEzA_2DSg8eE6"
```

> ⚠️ File `secrets.h` sudah ada di `.gitignore`. **Jangan pernah commit file ini ke repository publik.**

---

## ⚙️ Konfigurasi Sistem: `config.h`

Sesuaikan dengan kondisi fisik hardware:

```c
// PIN GPIO
#define PH_ANALOG_PIN       34    // Sensor pH
#define FLOW_SENSOR_PIN     16    // YF-S201
#define TRIG_PIN            26    // HC-SR04 Trigger
#define ECHO_PIN            27    // HC-SR04 Echo
#define LCD_I2C_ADDR        0x27  // Ganti 0x3F jika LCD tidak tampil
#define SD_CS_PIN           5     // SD Card Chip Select

// TANGKI AIR ← Wajib diukur secara fisik
#define TANK_HEIGHT_CM      40.0f  // Tinggi total tangki (cm)
#define SENSOR_OFFSET_CM    0.0f   // Offset jika sensor tidak di tepi atas

// KALIBRASI pH ← Diisi setelah kalibrasi (lihat panduan di bawah)
#define PH_CAL_VOLT_AT_7    2.50f  // Tegangan saat pH = 7.0
#define PH_CAL_SLOPE        0.18f  // |Volt per satuan pH|

// INTERVAL
#define UPLOAD_INTERVAL     300000UL  // Kirim ke Supabase: setiap 5 menit
```

---

## 📐 Panduan Kalibrasi Sensor pH

Firmware menggunakan formula:
```
pH = 7.0 - (Tegangan_ukur - PH_CAL_VOLT_AT_7) / PH_CAL_SLOPE
```

### Alat yang Dibutuhkan
- Larutan buffer **pH 7.0** (wajib)
- Larutan buffer **pH 4.0** atau **pH 10.0** (untuk slope)
- Air bersih untuk bilas antar pengukuran

### Langkah 1 — Aktifkan Output Tegangan (sementara)

Di `SHEWaterMonitor.ino`, di dalam blok `SENSOR_READ_INTERVAL`, tambahkan:
```cpp
Serial.printf("[RAW] Voltage=%.4fV\n", SensorPH::getVoltage());
```
Upload firmware, buka **Serial Monitor** di baud `115200`.

### Langkah 2 — Kalibrasi `PH_CAL_VOLT_AT_7`
1. Celupkan probe ke larutan **buffer pH 7.0**
2. Tunggu 1–2 menit hingga nilai stabil
3. Catat tegangan yang muncul (contoh: `2.47V`)
4. Set di `config.h`: `#define PH_CAL_VOLT_AT_7  2.47f`

### Langkah 3 — Hitung `PH_CAL_SLOPE`
1. Bilas probe, celupkan ke larutan **buffer pH 4.0**, tunggu stabil
2. Catat tegangan (contoh: `3.02V`)
3. Hitung:
   ```
   slope = |Tegangan_pH4 - Tegangan_pH7| / |4.0 - 7.0|
         = |3.02 - 2.47| / 3.0
         = 0.55 / 3.0 = 0.183
   ```
4. Set di `config.h`: `#define PH_CAL_SLOPE  0.183f`

### Langkah 4 — Kalibrasi Tangki
Ukur tinggi fisik tangki (dasar → titik penuh) dengan meteran:
```c
#define TANK_HEIGHT_CM  35.0f  // Sesuaikan
```

### Langkah 5 — Bersihkan & Upload Ulang
Hapus baris debug tegangan yang ditambahkan di Langkah 1, lalu upload ulang firmware.

---

## 💾 Cara Upload Firmware ke ESP32

1. Buka **Arduino IDE**
2. Buka: `firmware_arduino/SHEWaterMonitor/SHEWaterMonitor.ino`
3. Isi `secrets.h` dan sesuaikan `config.h`
4. `Tools → Board → ESP32 Arduino → ESP32 Dev Module`
5. `Tools → Port` → pilih COM port ESP32 Anda
6. `Tools → Upload Speed → 921600`
7. Klik **Upload** (→)

### Output Serial Saat Boot (Normal):
```
=========================================
  SHE Water Quality Monitor — ESP32
=========================================
[LCD] Siap. Addr=0x27
[WiFi] Menghubungkan ke "NamaWiFi"...
[WiFi] Terhubung! IP: 192.168.1.100
[pH] Sensor siap. V@7=2.47V  Slope=0.183
[Flow] YF-S201 siap. GPIO=16
[Ultrasonic] HC-SR04 siap. TRIG=26 ECHO=27 TANK=40cm
[Main] Setup selesai. Loop berjalan.
[Data] pH=7.12 | Flow=0.00L/m | Total=0.00L | Level=18.0cm (45%) | Online
```

---

## 🗄️ Database Supabase

### Skema Tabel `sensor_logs`

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | UUID | Primary key (auto-generated) |
| `created_at` | TIMESTAMPTZ | Waktu data masuk (auto-fill, timezone-aware) |
| `ph` | FLOAT | Nilai pH (0–14) |
| `flow` | FLOAT | Debit air (L/menit) |
| `total_liter` | FLOAT | Total akumulasi volume (Liter) |
| `water_level` | FLOAT | Tinggi air dari dasar tangki (cm) |
| `water_percent` | INTEGER | Persentase isi tangki (0–100%) |
| `wifi_status` | VARCHAR(20) | Status koneksi WiFi ESP32 |

### Inisialisasi Database
Di **Supabase Dashboard → SQL Editor**, jalankan isi file `schema_water.sql`. Skrip ini sudah aman dijalankan berulang kali (idempoten) karena menggunakan `DROP TABLE IF EXISTS CASCADE` di awal.

### Row Level Security (RLS)
Sudah dikonfigurasi — `anon` role hanya diizinkan:
- `INSERT` (ESP32 mengirim data)
- `SELECT` (Dashboard membaca data)

---

## 🌐 Web Dashboard

### Fitur Halaman

| Halaman | URL | Fitur |
|---|---|---|
| **Dashboard** | `/` | 4 kartu real-time: pH, Level Air, Debit, Total Volume. Auto-refresh 5 detik. |
| **Statistik** | `/statistics` | Grafik area historis (1D / 1W / 1M) dengan agregasi per jam/hari. |
| **Riwayat** | `/history` | Tabel data mentah berurutan, load-more pagination, export Excel (5000 baris). |

### Setup Lokal
```bash
# Clone & install
npm install

# Isi environment variables
# Edit .env.local:
# NEXT_PUBLIC_SUPABASE_URL=https://dvgjtcobaleolvkarcbb.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_NEB9nY9Su_oVintckWJEzA_2DSg8eE6

# Jalankan dev server
npm run dev
# Buka: http://localhost:3000
```

### Deploy ke Vercel
```bash
npx vercel --prod --yes
```
> Jika deployment otomatis dari GitHub gagal, **selalu gunakan perintah di atas** untuk deploy manual langsung dari mesin lokal.

### Dependensi Utama Web
| Package | Fungsi |
|---|---|
| `next@16.2.9` | Framework web |
| `@supabase/ssr` | Supabase client |
| `recharts` | Grafik area |
| `framer-motion` | Animasi premium |
| `lucide-react` | Ikon |
| `xlsx` | Export Excel |

---

## 🔁 Alur Sistem End-to-End

```
[Sensor Fisik]
pH Analog + YF-S201 + HC-SR04
        │
        ▼ setiap 1 detik (baca & filter)
[ESP32 Firmware]
Moving Average + Median Filter
        │
        ▼ setiap 5 menit (POST JSON)
[Supabase REST API]
PostgreSQL Database
        │
        ▼ setiap 5 detik (polling)
[Next.js Web Dashboard]
Vercel — CDN Global
        │
        ├── / (Dashboard — 4 kartu)
        ├── /statistics (Grafik tren)
        └── /history (Tabel riwayat)
```

---

## 🛠️ Troubleshooting

| Masalah | Kemungkinan Penyebab | Solusi |
|---|---|---|
| LCD tidak tampil | Alamat I2C salah | Ganti `LCD_I2C_ADDR` dari `0x27` ke `0x3F` |
| pH = 0.00 atau 14.00 | Kalibrasi salah / kabel lepas | Cek kabel GPIO34, ulangi kalibrasi |
| Flow selalu 0.00 L/m | Sensor tidak terpasang | Cek kabel GPIO16, pastikan ada aliran air |
| Upload Supabase HTTP 401 | API Key salah | Periksa `SUPABASE_ANON_KEY` di `secrets.h` |
| Upload Supabase HTTP 400 | Nama kolom tidak cocok | Jalankan ulang `schema_water.sql` di Supabase |
| WiFi tidak terhubung | SSID/Password salah | Cek `WIFI_SSID` dan `WIFI_PASSWORD` di `secrets.h` |
| SD Card gagal init | Tidak terformat FAT32 | Format ulang SD Card ke FAT32 |
| Dashboard web semua 0 | Database baru / kosong | Nyalakan ESP32, data masuk dalam ≤ 5 menit |
| Grafik kosong | Belum ada data di periode tersebut | Pilih rentang 1W atau 1M |
| Build Vercel gagal | Error TypeScript | Jalankan `npm run build` lokal untuk debug |

---

## 🔒 Keamanan

- `secrets.h` dan `.env.local` ada di `.gitignore` — **tidak pernah di-commit**
- RLS (Row Level Security) aktif di Supabase — data tidak bisa dihapus dari browser
- `ANON_KEY` yang digunakan adalah *publishable key*, **bukan** Service Role Key

---

## ✅ Checklist Sebelum Gunakan

- [ ] `secrets.h` sudah diisi WiFi SSID + password + Supabase credentials
- [ ] `TANK_HEIGHT_CM` diukur dari fisik tangki
- [ ] Kalibrasi pH sudah dilakukan (isi `PH_CAL_VOLT_AT_7` dan `PH_CAL_SLOPE`)
- [ ] SD Card dimasukkan dan terformat FAT32
- [ ] `schema_water.sql` sudah dijalankan di Supabase SQL Editor
- [ ] Firmware berhasil di-upload dan Serial Monitor menampilkan data sensor
- [ ] Website Vercel memperlihatkan data real-time dari ESP32
