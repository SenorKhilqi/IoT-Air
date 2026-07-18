# SHE Water Quality Monitor — Firmware ESP32

Sistem monitoring kualitas air berbasis IoT menggunakan ESP32 DevKit V1 dengan tiga sensor utama (pH, Water Flow, Water Level), logging ke SD Card, dan pengiriman data ke Supabase setiap 5 menit dengan mekanisme retry otomatis.

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                     ESP32 DevKit V1                      │
│                                                         │
│  Sensors          Core Modules         Output           │
│  ─────────        ────────────         ──────           │
│  pH Sensor  ──→  sensor_ph            LCD I2C          │
│  YF-S201    ──→  waterflow      ──→   SD Card          │
│  HC-SR04    ──→  ultrasonic           Supabase API     │
│                                                         │
│  Support Modules:                                       │
│  wifi_manager | lcd_display | sdcard | supabase        │
└─────────────────────────────────────────────────────────┘
                              │
                    REST API (HTTPS)
                              │
                    ┌─────────────────┐
                    │   Supabase DB   │
                    │  sensor_logs    │
                    └─────────────────┘
                              │
                    ┌─────────────────┐
                    │  Dashboard Web  │
                    │  (HTML Static)  │
                    └─────────────────┘
```

---

## Flowchart Sistem

```
START
  │
  ▼
[SETUP]
  ├── LCD Init → Splash Screen
  ├── WiFi Connect (timeout 15s)
  ├── SD Card Init
  ├── Sensor pH Init
  ├── Water Flow Init (attach interrupt)
  └── Ultrasonic Init
  │
  ▼
[LOOP — berjalan terus menerus]
  │
  ├── WiFiMgr::loop()        ← Reconnect jika putus (interval 30s)
  ├── WaterFlow::loop()      ← Hitung flow rate dari pulse count (interval 1s)
  │
  ├── [1 DETIK] ─────────────────────────────────────
  │     ├── SensorPH::update()    → ADC → Median → MovAvg
  │     ├── Ultrasonic::update()  → Trigger → Echo → MovAvg
  │     └── LCDDisplay::setData() → Update buffer data LCD
  │
  ├── LCDDisplay::loop()     ← Rotasi halaman + timer backlight
  │
  ├── [5 MENIT] ─────────────────────────────────────
  │     ├── Kumpulkan payload semua sensor
  │     ├── Supabase::send(payload)
  │     │     ├── OK  → SDCard::writeLog(status=Sent)
  │     │     └── FAIL→ SDCard::writeLog(status=Pending)
  │     └── LCDDisplay::wake()
  │
  └── [65 DETIK] ─────────────────────────────────────
        ├── Cek SDCard::getPendingCount()
        ├── Jika ada pending & WiFi OK:
        │     ├── SDCard::processPending()
        │     └── Supabase::send() untuk setiap entri
        └── Update status Supabase
```

---

## Struktur Folder

```
firmware/
├── platformio.ini          ← Konfigurasi build & library
├── src/
│   ├── main.cpp            ← Program utama (state machine millis)
│   ├── config.h            ← Semua konstanta & pin mapping
│   ├── secrets.h           ← WiFi + Supabase credentials (GITIGNORE!)
│   ├── wifi_manager.h/.cpp ← Koneksi & reconnect WiFi
│   ├── sensor_ph.h/.cpp    ← pH Analog + filtering
│   ├── waterflow.h/.cpp    ← YF-S201 interrupt + liter
│   ├── ultrasonic.h/.cpp   ← HC-SR04 + level tangki
│   ├── lcd_display.h/.cpp  ← LCD 16x2 rotasi + backlight timer
│   ├── sdcard.h/.cpp       ← Logging CSV + retry pending
│   └── supabase.h/.cpp     ← REST API POST ke Supabase
├── dashboard/
│   └── index.html          ← Dashboard web standalone
├── WIRING.md               ← Diagram wiring & pin mapping
└── README.md               ← Dokumentasi ini
```

---

## Prasyarat

### Software
- [VS Code](https://code.visualstudio.com/) + Extension **PlatformIO IDE**
- Atau **PlatformIO CLI**: `pip install platformio`

### Library (otomatis diinstall oleh PlatformIO)
- `marcoschwartz/LiquidCrystal_I2C`
- `bblanchon/ArduinoJson`
- Built-in ESP32: `WiFi`, `HTTPClient`, `SD`, `SPI`, `Wire`

---

## Langkah Instalasi

### 1. Clone / Download Project

```bash
git clone <repo-url>
cd IoT-Air/firmware
```

### 2. Konfigurasi Secrets

Edit file `src/secrets.h`:

```cpp
#define WIFI_SSID       "NamaWiFiAnda"
#define WIFI_PASSWORD   "PasswordWiFiAnda"
#define SUPABASE_URL    "https://xxxx.supabase.co"
#define SUPABASE_ANON_KEY "eyJhbGci..."
```

### 3. Konfigurasi Hardware (opsional)

Edit `src/config.h` sesuai hardware:

```cpp
#define TANK_HEIGHT_CM   40.0f   // Ubah sesuai tinggi tangki Anda
#define LCD_I2C_ADDR     0x27   // Ubah ke 0x3F jika LCD tidak muncul
#define PH_CAL_VOLT_AT_7 2.50f  // Ukur tegangan saat sensor di pH 7.0
```

### 4. Setup Database Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Buat project baru
3. Buka **SQL Editor**
4. Paste isi file `../schema_water.sql`
5. Klik **Run**

### 5. Upload Firmware

```bash
# Build
pio run

# Upload ke ESP32
pio run --target upload

# Monitor Serial
pio device monitor --baud 115200
```

Atau via VS Code: klik tombol **→ Upload** di toolbar PlatformIO.

---

## Setup Dashboard Web

Dashboard adalah file HTML standalone — tidak perlu server.

1. Buka `firmware/dashboard/index.html` di browser
2. Isi **Supabase URL** dan **Anon Key** di form konfigurasi
3. Klik **Hubungkan**
4. Data otomatis refresh setiap 30 detik

---

## Kalibrasi Sensor pH

### Langkah Kalibrasi 2-Titik

1. Siapkan larutan buffer pH 7.0 dan pH 4.0
2. Celupkan sensor ke buffer **pH 7.0**
3. Ukur tegangan output dengan multimeter → catat nilainya
4. Update `PH_CAL_VOLT_AT_7` di `config.h` dengan nilai tersebut
5. Celupkan sensor ke buffer **pH 4.0**
6. Hitung slope: `slope = (volt_at_7 - volt_at_4) / (7.0 - 4.0)`
7. Update `PH_CAL_SLOPE` di `config.h`

Contoh:
```
Volt di pH 7.0 = 2.50V
Volt di pH 4.0 = 3.04V
Slope = (2.50 - 3.04) / (7.0 - 4.0) = -0.18 V/pH
```
> Gunakan nilai absolut: `PH_CAL_SLOPE = 0.18f`

---

## Format Data SD Card

File: `/sensor_log.csv`

```
Timestamp,pH,Flow_Lpm,TotalLiter,WaterLevel_cm,WaterPercent,Status
UP+00:05:00,7.12,3.45,15.23,28.4,71,Sent
UP+00:10:00,7.08,3.12,16.05,27.9,70,Pending
UP+00:15:00,7.15,3.67,17.12,28.1,70,Sent
```

- **Status = Sent**: Data berhasil dikirim ke Supabase
- **Status = Pending**: Gagal kirim, akan dicoba ulang

---

## Troubleshooting

| Masalah | Kemungkinan Penyebab | Solusi |
|---|---|---|
| LCD tidak menyala | Alamat I2C salah | Jalankan I2C Scanner, cek `LCD_I2C_ADDR` di `config.h` |
| pH selalu 0 / 14 | ADC tidak terbaca | Cek wiring GPIO34, pastikan pakai `ADC_11db` |
| Flow selalu 0 | Interrupt tidak aktif | Cek wiring GPIO16, cek power sensor |
| SD Card gagal init | Wiring SPI salah / voltase | Cek pin CS, pastikan 3.3V |
| Supabase HTTP 401 | API Key salah | Periksa `SUPABASE_ANON_KEY` di `secrets.h` |
| Supabase HTTP 404 | Tabel tidak ada | Jalankan ulang `schema_water.sql` |
| WiFi tidak terhubung | SSID/Password salah | Cek `secrets.h`, restart ESP32 |
| HC-SR04 timeout | Jarak > 4m atau tidak ada objek | Periksa posisi sensor, cek wiring |

### Serial Monitor Debug

Setiap 1 detik akan muncul:
```
[Data] pH=7.12 | Flow=3.45L/m | Total=15.23L | Level=28.4cm (71%) | Online
```

Saat upload berhasil:
```
[Supabase] POST → {"ph":7.12,"flow":3.45,...}
[Supabase] Berhasil. HTTP 201
[Main] Upload berhasil.
```

Saat upload gagal:
```
[Supabase] Gagal. HTTP 0
[Main] Gagal kirim — disimpan sebagai Pending.
```

Saat retry pending:
```
[Main] Ditemukan 3 data pending. Mengirim ulang...
[Main] Retry selesai: 3/3 berhasil.
```

---

## Konsumsi Daya

| Mode | Estimasi |
|---|---|
| Normal (WiFi aktif) | ~150–200 mA @ 5V |
| Upload Supabase | ~250 mA @ 5V (sesaat) |
| Adaptor yang direkomendasikan | **5V 2A minimum** (3A lebih aman) |

---

## Lisensi

Proyek ini dikembangkan untuk keperluan monitoring kualitas air di lingkungan SHE (Safety, Health & Environment).
