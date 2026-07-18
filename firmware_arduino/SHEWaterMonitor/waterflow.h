#pragma once
#include <Arduino.h>

// ================================================================
// waterflow.h — YF-S201 Water Flow Sensor
// ================================================================
namespace WaterFlow {
    void  begin();
    void  loop();           // Panggil di loop() setiap saat
    float getFlowRate();    // Debit (Liter/Menit)
    float getTotalLiter();  // Total volume (Liter)
    void  resetTotal();
}
