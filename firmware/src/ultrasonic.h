#pragma once
#include <Arduino.h>

// ================================================================
// ultrasonic.h — Sensor Jarak HC-SR04
// Konversi: jarak → level air → persentase
// ================================================================
namespace Ultrasonic {
    void  begin();
    void  update();             // Panggil tiap SENSOR_READ_INTERVAL
    float getDistanceCm();      // Jarak sensor ke permukaan air (cm)
    float getWaterLevelCm();    // Tinggi air dari dasar tangki (cm)
    float getWaterPercent();    // Persentase isi tangki (0–100)
}
