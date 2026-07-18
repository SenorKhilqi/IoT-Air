#pragma once
#include <Arduino.h>

// ================================================================
// lcd_display.h — LCD I2C 16x2 dengan Rotasi Halaman & Timer Backlight
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

    void begin();                   // Inisialisasi LCD, tampil splash screen
    void loop();                    // Timer backlight + rotasi halaman
    void setData(const SensorData& d); // Update data yang akan ditampilkan
    void wake();                    // Nyalakan backlight + reset timer
    void showStartupMsg(const char* line1, const char* line2); // Pesan saat init
}
