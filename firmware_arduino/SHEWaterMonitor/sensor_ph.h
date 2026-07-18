#pragma once
#include <Arduino.h>

// ================================================================
// sensor_ph.h — Sensor pH Analog dengan Multi-layer Filtering
// ================================================================
namespace SensorPH {
    void  begin();
    void  update();    // Panggil tiap SENSOR_READ_INTERVAL
    float getValue();  // pH terfilter (2 desimal)
    float getVoltage();
}
