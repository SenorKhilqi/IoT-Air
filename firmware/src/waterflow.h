#pragma once
#include <Arduino.h>

// ================================================================
// waterflow.h — Sensor Debit Air YF-S201
// Menggunakan hardware interrupt ESP32 (IRAM_ATTR)
// ================================================================
namespace WaterFlow {
    void begin();           // Inisialisasi pin + attach interrupt
    void loop();            // Hitung flow rate per detik (millis-based)
    float getFlowRate();    // Debit air (Liter/Menit)
    float getTotalLiter();  // Total air mengalir sejak boot (Liter)
    void  resetTotal();     // Reset akumulasi total liter
}
