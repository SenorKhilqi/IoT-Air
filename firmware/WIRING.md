# Diagram Wiring — SHE Water Quality Monitor

## GPIO Mapping ESP32 DevKit V1

| Komponen | Pin Komponen | Pin ESP32 | Fungsi |
|---|---|---|---|
| **pH Sensor (PH-4502C)** | VCC | 5V | Power |
| | GND | GND | Ground |
| | PO (Signal) | GPIO 34 | Analog ADC1_CH6 |
| **Water Flow YF-S201** | VCC (merah) | 5V | Power |
| | GND (hitam) | GND | Ground |
| | Signal (kuning) | GPIO 16 | Interrupt Digital |
| **HC-SR04 Ultrasonic** | VCC | 5V | Power |
| | GND | GND | Ground |
| | TRIG | GPIO 26 | Digital Output |
| | ECHO | GPIO 27 | Digital Input |
| **LCD I2C 16x2** | VCC | 5V | Power |
| | GND | GND | Ground |
| | SDA | GPIO 21 | I2C SDA |
| | SCL | GPIO 22 | I2C SCL |
| **SD Card Module** | VCC | 3.3V | Power (3.3V!) |
| | GND | GND | Ground |
| | CS | GPIO 5 | SPI Chip Select |
| | MOSI | GPIO 23 | SPI MOSI |
| | MISO | GPIO 19 | SPI MISO |
| | SCK | GPIO 18 | SPI Clock |

> ⚠️ **PENTING:** SD Card Module menggunakan tegangan **3.3V**, bukan 5V!

---

## Diagram Koneksi ASCII

```
                    ┌─────────────────────────────┐
                    │       ESP32 DevKit V1        │
                    │                             │
  pH Sensor ────────┤ GPIO34 (ADC)                │
  YF-S201  ─────────┤ GPIO16 (INT)                │
  HC-SR04 TRIG ─────┤ GPIO26 (OUT)                │
  HC-SR04 ECHO ─────┤ GPIO27 (IN)                 │
  LCD SDA ──────────┤ GPIO21 (I2C SDA)            │
  LCD SCL ──────────┤ GPIO22 (I2C SCL)            │
  SD CS ────────────┤ GPIO5  (SPI CS)             │
  SD MOSI ──────────┤ GPIO23 (SPI MOSI)           │
  SD MISO ──────────┤ GPIO19 (SPI MISO)           │
  SD SCK ───────────┤ GPIO18 (SPI CLK)            │
                    │                             │
  5V Rail ──────────┤ 5V  ──── VIN               │
  3.3V Rail ────────┤ 3V3 ──── 3V3               │
  GND ──────────────┤ GND                         │
                    └─────────────────────────────┘
```

---

## Diagram Power Rails

```
Adaptor DC 5V 3A
       │
       ├── (+) ──→ ESP32 VIN (atau USB)
       │
       ├── (+) ──→ pH Sensor VCC
       ├── (+) ──→ YF-S201 VCC  
       ├── (+) ──→ HC-SR04 VCC
       ├── (+) ──→ LCD VCC
       │
       └── (─) ──→ GND (semua komponen)

ESP32 3.3V PIN:
       └──→ SD Card VCC (modul SD card — HARUS 3.3V)
```

---

## Catatan Penting

### pH Sensor (PH-4502C / Gravity)
- Output analog 0–3.3V (atau 0–5V tergantung modul)
- Jika output maksimum 5V: **WAJIB pasang voltage divider** sebelum GPIO 34
  - R1 = 10kΩ (dari sinyal ke GPIO)
  - R2 = 10kΩ (dari GPIO ke GND)
  - Ini menurunkan 0–5V menjadi 0–2.5V (aman untuk ESP32)
- GPIO 34 adalah **input-only** (tidak bisa dipakai sebagai output) ✓

### Water Flow YF-S201
- Frekuensi sinyal: 1 Hz per 7.5 mL/detik (K-factor = 7.5)
- Gunakan `INPUT_PULLUP` pada GPIO 16
- Pastikan ESP32 dan sensor share **GND yang sama**

### HC-SR04
- Jarak kerja: 2 cm – 400 cm
- Posisikan sensor tepat di **atas permukaan air**, tegak lurus
- Hindari turbulensi air di bawah sensor saat pengukuran

### LCD I2C
- Alamat default: `0x27` (PCF8574) atau `0x3F` (PCF8574A)
- Scan dengan sketch I2C Scanner jika LCD tidak muncul
- Sesuaikan `LCD_I2C_ADDR` di `config.h`

### SD Card Module
- Gunakan SD card **Class 10** untuk kecepatan tulis yang baik
- Format: **FAT32**
- Ukuran: 4GB – 32GB (lebih dari cukup)
- Pastikan tidak ada konflik SPI — hanya 1 device SPI aktif per CS
