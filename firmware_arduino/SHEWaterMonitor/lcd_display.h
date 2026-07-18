#pragma once
#include <Arduino.h>

// ================================================================
// lcd_display.h — LCD I2C 16x2, 3 Halaman, Timer Backlight
// ================================================================
namespace LCDDisplay {

  struct SensorData {
    float  ph           = 7.0f;
    float  flowRate     = 0.0f;
    float  totalLiter   = 0.0f;
    float  waterLevelCm = 0.0f;
    float  waterPercent = 0.0f;
    String wifiStatus   = "Offline";
    String supaStatus   = "Menunggu";
  };

  void begin();
  void loop();
  void setData(const SensorData& d);
  void wake();
  void showStartupMsg(const char* line1, const char* line2);
}
