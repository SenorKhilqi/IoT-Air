#pragma once
#include <Arduino.h>

// ================================================================
// wifi_manager.h — Manajemen Koneksi WiFi
// ================================================================
namespace WiFiMgr {
    void begin();           // Panggil di setup() — blocking max 15 detik
    void loop();            // Panggil di loop() — handle reconnect millis-based
    bool isConnected();     // true jika WiFi terhubung
    String getStatusStr();  // "Online" atau "Offline"
}
