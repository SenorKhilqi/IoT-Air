#include "sensor_ph.h"
#include "config.h"

// ================================================================
// sensor_ph.cpp — Pembacaan, Filter, dan Kalibrasi pH
// ================================================================
namespace SensorPH {

// --- Buffer Moving Average ---
static float _maBuffer[PH_MOVING_AVG_SIZE];
static uint8_t _maIdx    = 0;
static bool    _maFull   = false;

// --- Buffer Median Filter ---
static float _medBuffer[PH_MEDIAN_SIZE];
static uint8_t _medIdx   = 0;

// --- Nilai terakhir ---
static float _filteredPH  = 7.0f;
static float _rawVoltage  = 0.0f;

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------
static float adcToVoltage(int raw) {
    return (raw * PH_ADC_VREF) / (float)PH_ADC_MAX;
}

static float voltageToPH(float v) {
    // Formula kalibrasi linear:
    // pH = 7.0 - (V - V_at_7) / slope
    return 7.0f - ((v - PH_CAL_VOLT_AT_7) / PH_CAL_SLOPE);
}

static float pushMedian(float val) {
    _medBuffer[_medIdx] = val;
    _medIdx = (_medIdx + 1) % PH_MEDIAN_SIZE;

    // Salin dan urutkan (bubble sort, array kecil = OK)
    float s[PH_MEDIAN_SIZE];
    memcpy(s, _medBuffer, sizeof(s));
    for (int i = 0; i < PH_MEDIAN_SIZE - 1; i++)
        for (int j = 0; j < PH_MEDIAN_SIZE - 1 - i; j++)
            if (s[j] > s[j+1]) { float t = s[j]; s[j] = s[j+1]; s[j+1] = t; }
    return s[PH_MEDIAN_SIZE / 2];
}

static float pushMovingAvg(float val) {
    _maBuffer[_maIdx] = val;
    _maIdx = (_maIdx + 1) % PH_MOVING_AVG_SIZE;
    if (_maIdx == 0) _maFull = true;

    uint8_t n = _maFull ? PH_MOVING_AVG_SIZE : _maIdx;
    float sum = 0;
    for (uint8_t i = 0; i < n; i++) sum += _maBuffer[i];
    return sum / n;
}

// ----------------------------------------------------------------
// API Publik
// ----------------------------------------------------------------
void begin() {
    analogSetAttenuation(ADC_11db);  // Range 0–3.3V
    analogReadResolution(12);
    // Isi buffer awal dengan pembacaan dummy
    for (uint8_t i = 0; i < PH_MEDIAN_SIZE; i++) _medBuffer[i] = 7.0f;
    for (uint8_t i = 0; i < PH_MOVING_AVG_SIZE; i++) _maBuffer[i] = 7.0f;
    Serial.println(F("[pH] Sensor siap. Kalibrasi: Volt@7=" STR(PH_CAL_VOLT_AT_7) " Slope=" STR(PH_CAL_SLOPE)));
}

void update() {
    // Hardware noise reduction: rata-rata 10 sampel ADC
    long adcSum = 0;
    for (uint8_t i = 0; i < 10; i++) {
        adcSum += analogRead(PH_ANALOG_PIN);
        delayMicroseconds(200);
    }
    int adcAvg = adcSum / 10;

    _rawVoltage    = adcToVoltage(adcAvg);
    float phRaw    = voltageToPH(_rawVoltage);
    phRaw          = constrain(phRaw, 0.0f, 14.0f);

    // Pipeline: nilai mentah → median filter → moving average
    float phMed    = pushMedian(phRaw);
    float phSmooth = pushMovingAvg(phMed);

    // Bulatkan 2 desimal
    _filteredPH = roundf(phSmooth * 100.0f) / 100.0f;
}

float getValue()   { return _filteredPH; }
float getVoltage() { return _rawVoltage; }

} // namespace SensorPH
