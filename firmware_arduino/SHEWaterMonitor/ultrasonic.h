#pragma once
#include <Arduino.h>

// ================================================================
// ultrasonic.h — HC-SR04 Water Level Sensor
// ================================================================
namespace Ultrasonic {
    void  begin();
    void  update();
    float getDistanceCm();    // Jarak sensor → permukaan air (cm)
    float getWaterLevelCm();  // Tinggi air dari dasar (cm)
    float getWaterPercent();  // Persentase isi tangki (0–100)
}
