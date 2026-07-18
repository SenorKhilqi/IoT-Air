#pragma once
#include <Arduino.h>

// ================================================================
// sensor_ph.h — Sensor pH Analog (PH-4502C / Gravity)
// Fitur: Moving Average, Median Filter, Kalibrasi 2-titik
// ================================================================
namespace SensorPH {
    void begin();       // Inisialisasi ADC
    void update();      // Baca dan filter — panggil tiap SENSOR_READ_INTERVAL
    float getValue();   // Nilai pH terfilter (2 desimal)
    float getVoltage(); // Tegangan ADC mentah (V)
}
