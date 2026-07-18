#include <Arduino.h>
#include "waterflow.h"
#include "config.h"

// ================================================================
// waterflow.cpp — YF-S201 menggunakan hardware interrupt
// Rumus: Flow (L/min) = pulseCount / K_FACTOR
// ================================================================
namespace WaterFlow {

static volatile uint32_t _pulseCount = 0;
static unsigned long     _lastCalcMs = 0;
static float             _flowRate   = 0.0f;
static float             _totalLiter = 0.0f;

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
  if (elapsed < 1000UL) return;

  // Baca dan reset counter secara atomik
  noInterrupts();
  uint32_t count = _pulseCount;
  _pulseCount    = 0;
  interrupts();

  float seconds   = elapsed / 1000.0f;
  _flowRate       = count / FLOW_K_FACTOR;               // L/min
  _totalLiter    += (_flowRate / 60.0f) * seconds;       // Akumulasi
  _lastCalcMs     = now;
}

float getFlowRate()   { return _flowRate;   }
float getTotalLiter() { return _totalLiter; }
void  resetTotal()    { _totalLiter = 0.0f; }

} // namespace WaterFlow
