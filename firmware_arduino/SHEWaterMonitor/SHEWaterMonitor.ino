// ================================================================
// SHEWaterMonitor.ino — Arduino IDE Version
// SHE Water Quality Monitor | ESP32 | Modular | millis()-based
//
// Struktur folder:
//   SHEWaterMonitor/
//   ├── SHEWaterMonitor.ino  ← File ini
//   ├── config.h
//   ├── secrets.h
//   ├── wifi_manager.h/.cpp
//   ├── sensor_ph.h/.cpp
//   ├── waterflow.h/.cpp
//   ├── ultrasonic.h/.cpp
//   ├── lcd_display.h/.cpp
//   ├── sdcard.h/.cpp
//   └── supabase.h/.cpp
//
// Library yang perlu diinstall via Library Manager:
//   1. "LiquidCrystal I2C" by Frank de Brabander
//   2. "ArduinoJson" by Benoit Blanchon (v7.x)
//
// Board: ESP32 Dev Module
// Upload Speed: 921600
// Monitor Speed: 115200
// ================================================================

#include "config.h"
#include "wifi_manager.h"
#include "sensor_ph.h"
#include "waterflow.h"
#include "ultrasonic.h"
#include "lcd_display.h"
#include "sdcard.h"
#include "supabase.h"

// ----------------------------------------------------------------
// Timers
// ----------------------------------------------------------------
static unsigned long _lastSensorMs  = 0;
static unsigned long _lastUploadMs  = 0;
static unsigned long _lastRetryMs   = 0;
static unsigned long _lastLCDWakeMs = 0;

// ----------------------------------------------------------------
// Status Global
// ----------------------------------------------------------------
static bool   _sdReady    = false;
static String _supaStatus = "Menunggu";

// ----------------------------------------------------------------
// Helper: Kumpulkan payload semua sensor
// ----------------------------------------------------------------
Supabase::Payload collectPayload() {
  Supabase::Payload p;
  p.ph          = SensorPH::getValue();
  p.flow        = WaterFlow::getFlowRate();
  p.totalLiter  = WaterFlow::getTotalLiter();
  p.waterLevel  = Ultrasonic::getWaterLevelCm();
  p.waterPercent = Ultrasonic::getWaterPercent();
  p.wifiStatus  = WiFiMgr::getStatusStr();
  return p;
}

SDCard::LogEntry payloadToLog(const Supabase::Payload& p, bool pending) {
  SDCard::LogEntry e;
  e.timestamp    = "";
  e.ph           = p.ph;
  e.flow         = p.flow;
  e.totalLiter   = p.totalLiter;
  e.waterLevel   = p.waterLevel;
  e.waterPercent = p.waterPercent;
  e.pending      = pending;
  return e;
}

// ================================================================
void setup() {
  Serial.begin(SERIAL_BAUD);
  delay(300);
  Serial.println(F("\n========================================="));
  Serial.println(F("  SHE Water Quality Monitor — ESP32"));
  Serial.println(F("========================================="));

  // 1. LCD pertama — splash screen saat inisialisasi
  LCDDisplay::begin();
  LCDDisplay::showStartupMsg("SHE Water Mon.", "Menghubungkan...");

  // 2. WiFi
  WiFiMgr::begin();

  // 3. SD Card
  LCDDisplay::showStartupMsg("Init SD Card...", "");
  _sdReady = SDCard::begin();
  if (!_sdReady) {
    LCDDisplay::showStartupMsg("SD Card GAGAL!", "Mode tanpa SD");
    delay(2000);
  }

  // 4. Sensor pH
  LCDDisplay::showStartupMsg("Init Sensor...", "pH");
  SensorPH::begin();

  // 5. Water Flow
  LCDDisplay::showStartupMsg("Init Sensor...", "Flow");
  WaterFlow::begin();

  // 6. Ultrasonic
  LCDDisplay::showStartupMsg("Init Sensor...", "Ultrasonic");
  Ultrasonic::begin();

  // Selesai
  LCDDisplay::showStartupMsg("Sistem Siap!", WiFiMgr::getStatusStr().c_str());
  delay(1500);
  LCDDisplay::wake();

  // Init timer — upload pertama 10 detik setelah boot
  _lastSensorMs  = millis();
  _lastUploadMs  = millis() - UPLOAD_INTERVAL + 10000UL;
  _lastRetryMs   = millis();
  _lastLCDWakeMs = millis();

  Serial.println(F("[Main] Setup selesai. Loop berjalan."));
}

// ================================================================
void loop() {
  unsigned long now = millis();

  // 1. WiFi reconnect (millis-based, setiap 30 detik)
  WiFiMgr::loop();

  // 2. Water Flow — hitung L/min setiap 1 detik dari pulse count
  WaterFlow::loop();

  // 3. Baca semua sensor setiap 1 detik
  if (now - _lastSensorMs >= SENSOR_READ_INTERVAL) {
    _lastSensorMs = now;

    SensorPH::update();
    Ultrasonic::update();

    // Update buffer data LCD
    LCDDisplay::SensorData lcdData;
    lcdData.ph           = SensorPH::getValue();
    lcdData.flowRate     = WaterFlow::getFlowRate();
    lcdData.totalLiter   = WaterFlow::getTotalLiter();
    lcdData.waterLevelCm = Ultrasonic::getWaterLevelCm();
    lcdData.waterPercent = Ultrasonic::getWaterPercent();
    lcdData.wifiStatus   = WiFiMgr::getStatusStr();
    lcdData.supaStatus   = _supaStatus;
    LCDDisplay::setData(lcdData);

    // Debug Serial
    Serial.printf("[Data] pH=%.2f | Flow=%.2fL/m | Total=%.2fL | Level=%.1fcm (%.0f%%) | %s\n",
      lcdData.ph, lcdData.flowRate, lcdData.totalLiter,
      lcdData.waterLevelCm, lcdData.waterPercent,
      WiFiMgr::getStatusStr().c_str());
  }

  // 4. LCD loop — timer backlight + rotasi halaman
  LCDDisplay::loop();

  // Nyalakan LCD secara berkala
  if (now - _lastLCDWakeMs >= LCD_WAKE_CYCLE) {
    _lastLCDWakeMs = now;
    LCDDisplay::wake();
  }

  // 5. Upload ke Supabase setiap 5 menit
  if (now - _lastUploadMs >= UPLOAD_INTERVAL) {
    _lastUploadMs = now;

    Supabase::Payload payload = collectPayload();
    bool uploadOK = Supabase::send(payload);

    // Simpan ke SD Card (Sent / Pending)
    if (_sdReady) {
      SDCard::LogEntry logEntry = payloadToLog(payload, !uploadOK);
      SDCard::writeLog(logEntry);
    }

    if (uploadOK) {
      _supaStatus = "Connected";
      Serial.println(F("[Main] Upload berhasil ke Supabase."));
    } else {
      _supaStatus = "Error/Pending";
      Serial.println(F("[Main] Upload gagal — disimpan sebagai Pending."));
    }

    LCDDisplay::wake();
  }

  // 6. Retry pending data (setiap 65 detik)
  if (now - _lastRetryMs >= PENDING_RETRY_INTERVAL) {
    _lastRetryMs = now;

    if (!WiFiMgr::isConnected() || !_sdReady) return;

    int pendingN = SDCard::getPendingCount();
    if (pendingN == 0) return;

    Serial.printf("[Main] %d data pending ditemukan. Mengirim ulang...\n", pendingN);

    SDCard::LogEntry buf[20];
    int got = 0;
    if (SDCard::processPending(buf, 20, got)) {
      int sentCount = 0;
      for (int i = 0; i < got; i++) {
        Supabase::Payload p;
        p.ph           = buf[i].ph;
        p.flow         = buf[i].flow;
        p.totalLiter   = buf[i].totalLiter;
        p.waterLevel   = buf[i].waterLevel;
        p.waterPercent = buf[i].waterPercent;
        p.wifiStatus   = "Recovered";
        if (Supabase::send(p)) sentCount++;
        delay(300);
      }
      Serial.printf("[Main] Retry selesai: %d/%d berhasil.\n", sentCount, got);
      if (sentCount == got) _supaStatus = "Connected";
    }
  }
}
