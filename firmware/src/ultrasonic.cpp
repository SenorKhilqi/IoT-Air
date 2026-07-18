#include "ultrasonic.h"
#include "config.h"

// ================================================================
// ultrasonic.cpp — HC-SR04 Water Level Sensor
// Kecepatan suara: 343 m/s → 0.0343 cm/us → jarak = duration*0.0343/2
// ================================================================
namespace Ultrasonic {

static float _avgBuffer[ULTRASONIC_AVG_SIZE];
static uint8_t _avgIdx    = 0;
static bool    _avgFull   = false;
static float   _distCm    = 0.0f;

void begin() {
    pinMode(TRIG_PIN, OUTPUT);
    pinMode(ECHO_PIN, INPUT);
    digitalWrite(TRIG_PIN, LOW);
    // Isi buffer dengan nilai tengah
    float initDist = TANK_HEIGHT_CM * 0.5f;
    for (uint8_t i = 0; i < ULTRASONIC_AVG_SIZE; i++) _avgBuffer[i] = initDist;
    _distCm = initDist;
    Serial.printf("[Ultrasonic] HC-SR04 siap. TRIG=%d ECHO=%d TANK=%.0fcm\n",
                  TRIG_PIN, ECHO_PIN, TANK_HEIGHT_CM);
}

static float measureOnce() {
    // Trigger pulse 10us
    digitalWrite(TRIG_PIN, LOW);
    delayMicroseconds(2);
    digitalWrite(TRIG_PIN, HIGH);
    delayMicroseconds(10);
    digitalWrite(TRIG_PIN, LOW);

    long dur = pulseIn(ECHO_PIN, HIGH, ULTRASONIC_TIMEOUT_US);
    if (dur == 0) return -1.0f;  // Timeout/error

    return (dur * 0.0343f) / 2.0f;
}

void update() {
    float raw = measureOnce();
    if (raw < 0.0f) {
        Serial.println(F("[Ultrasonic] WARN: Pembacaan timeout."));
        return;
    }

    // Clamp ke rentang tangki
    float maxDist = TANK_HEIGHT_CM + SENSOR_OFFSET_CM;
    raw = constrain(raw, 0.0f, maxDist);

    // Moving average
    _avgBuffer[_avgIdx] = raw;
    _avgIdx = (_avgIdx + 1) % ULTRASONIC_AVG_SIZE;
    if (_avgIdx == 0) _avgFull = true;

    uint8_t n = _avgFull ? ULTRASONIC_AVG_SIZE : _avgIdx;
    float sum = 0;
    for (uint8_t i = 0; i < n; i++) sum += _avgBuffer[i];
    _distCm = sum / n;
}

float getDistanceCm() { return _distCm; }

float getWaterLevelCm() {
    float level = (TANK_HEIGHT_CM + SENSOR_OFFSET_CM) - _distCm;
    return constrain(level, 0.0f, TANK_HEIGHT_CM);
}

float getWaterPercent() {
    if (TANK_HEIGHT_CM <= 0) return 0.0f;
    return constrain((getWaterLevelCm() / TANK_HEIGHT_CM) * 100.0f, 0.0f, 100.0f);
}

} // namespace Ultrasonic
