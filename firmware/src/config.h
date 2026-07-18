#pragma once
// ================================================================
// config.h — Konfigurasi Sistem SHE Water Quality Monitor
// Ubah nilai di sini sesuai kebutuhan hardware Anda.
// ================================================================

// ----------------------------------------------------------------
// PIN GPIO ESP32
// ----------------------------------------------------------------
#define PH_ANALOG_PIN       34    // ADC1_CH6 — input only, pH Analog
#define FLOW_SENSOR_PIN     16    // Digital interrupt — YF-S201
#define TRIG_PIN            26    // HC-SR04 Trigger
#define ECHO_PIN            27    // HC-SR04 Echo
// LCD I2C: SDA=GPIO21, SCL=GPIO22 (default ESP32 Wire)
#define LCD_I2C_ADDR        0x27  // Ganti 0x3F jika LCD tidak muncul
#define LCD_COLS            16
#define LCD_ROWS            2
// SD Card SPI: MOSI=GPIO23, MISO=GPIO19, SCK=GPIO18 (default VSPI)
#define SD_CS_PIN           5     // Chip Select SD Card

// ----------------------------------------------------------------
// TIMER INTERVAL (milliseconds)
// ----------------------------------------------------------------
#define SENSOR_READ_INTERVAL      1000UL    // Baca sensor: 1 detik
#define LCD_DISPLAY_DURATION      7000UL    // Backlight nyala: 7 detik
#define LCD_PAGE_INTERVAL         2500UL    // Ganti halaman LCD: 2.5 detik
#define LCD_WAKE_CYCLE            15000UL   // Nyalakan LCD setiap 15 detik
#define UPLOAD_INTERVAL           300000UL  // Kirim Supabase: 5 menit
#define WIFI_RETRY_INTERVAL       30000UL   // Retry WiFi: 30 detik
#define PENDING_RETRY_INTERVAL    65000UL   // Retry pending: 65 detik

// ----------------------------------------------------------------
// KONFIGURASI TANGKI AIR
// ----------------------------------------------------------------
#define TANK_HEIGHT_CM      40.0f   // Tinggi total tangki (cm)
#define SENSOR_OFFSET_CM    0.0f    // Jarak sensor dari tepi atas tangki (cm)

// ----------------------------------------------------------------
// KONFIGURASI SENSOR pH
// ----------------------------------------------------------------
#define PH_MOVING_AVG_SIZE  16    // Ukuran buffer moving average
#define PH_MEDIAN_SIZE      9     // Ukuran buffer median filter (harus ganjil)
#define PH_ADC_VREF         3.3f  // Tegangan referensi ADC (V)
#define PH_ADC_MAX          4095  // Resolusi 12-bit
// Kalibrasi dua titik (ukur dengan buffer pH 4.0 dan 7.0)
#define PH_CAL_VOLT_AT_7    2.50f // Tegangan output saat pH = 7.0
#define PH_CAL_SLOPE        0.18f // Volt per satuan pH (positif = slope turun)

// ----------------------------------------------------------------
// KONFIGURASI WATER FLOW YF-S201
// ----------------------------------------------------------------
// Flow (L/min) = Pulse/detik / K_FACTOR
#define FLOW_K_FACTOR       7.5f  // Default YF-S201 (lihat datasheet)

// ----------------------------------------------------------------
// KONFIGURASI HC-SR04
// ----------------------------------------------------------------
#define ULTRASONIC_AVG_SIZE   5       // Ukuran buffer moving average
#define ULTRASONIC_TIMEOUT_US 30000   // Timeout pulseIn (us) = ~5 meter

// ----------------------------------------------------------------
// KONFIGURASI SD CARD
// ----------------------------------------------------------------
#define LOG_FILENAME          "/sensor_log.csv"
#define PENDING_FILENAME      "/pending.csv"

// ----------------------------------------------------------------
// KONFIGURASI SUPABASE
// ----------------------------------------------------------------
#define SUPABASE_TABLE        "sensor_logs"
#define HTTP_TIMEOUT_MS       10000   // 10 detik

// ----------------------------------------------------------------
// KONFIGURASI SERIAL
// ----------------------------------------------------------------
#define SERIAL_BAUD           115200
