#include "waterflow.h"
#include "config.h"

// ================================================================
// waterflow.cpp — Implementasi YF-S201
// Rumus: Flow (L/min) = pulseCount / K_FACTOR
// YF-S201 default: 1 L/min = 7.5 pulsa/detik
// ================================================================
namespace WaterFlow {

static volatile uint32_t _pulseCount  = 0;
static unsigned long     _lastCalcMs  = 0;
static float             _flowRate    = 0.0f;  // L/min
static float             _totalLiter  = 0.0f;

// ISR — harus di IRAM agar cepat
static void IRAM_ATTR onPulse() {
    _pulseCount++;
}

void begin() {
    pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), onPulse, RISING);
    _lastCalcMs = millis();
    Serial.print(F("[Flow] YF-S201 siap. GPIO="));
    Serial.println(FLOW_SENSOR_PIN);
}

void loop() {
    unsigned long now     = millis();
    unsigned long elapsed = now - _lastCalcMs;

    if (elapsed < 1000UL) return;  // Hitung setiap 1 detik

    // Baca dan reset counter secara atomik
    noInterrupts();
    uint32_t count = _pulseCount;
    _pulseCount = 0;
    interrupts();

    float seconds  = elapsed / 1000.0f;

    // Flow rate dalam L/min
    // count pulsa / K_FACTOR = L/min
    _flowRate = (count / FLOW_K_FACTOR);

    // Akumulasi total liter: L/min → L/s → L
    _totalLiter += (_flowRate / 60.0f) * seconds;

    _lastCalcMs = now;
}

float getFlowRate()   { return _flowRate; }
float getTotalLiter() { return _totalLiter; }
void  resetTotal()    { _totalLiter = 0.0f; }

} // namespace WaterFlow
