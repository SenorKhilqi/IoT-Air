#include "lcd_display.h"
#include "config.h"
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ================================================================
// lcd_display.cpp — Implementasi LCD I2C 16x2
// 3 Halaman: (0) pH+Flow | (1) Level+WiFi | (2) Supabase
// ================================================================
namespace LCDDisplay {

static LiquidCrystal_I2C _lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);
static bool    _backlightOn  = false;
static uint8_t _page         = 0;
static unsigned long _backlightMs = 0;
static unsigned long _pageMs     = 0;
static SensorData _data;

// ----------------------------------------------------------------
// Private: Render halaman ke LCD
// ----------------------------------------------------------------
static void renderPage(uint8_t page) {
    _lcd.clear();
    char r0[17], r1[17];

    switch (page) {
        case 0:
            snprintf(r0, 17, "pH    : %5.2f   ", _data.ph);
            snprintf(r1, 17, "Flow  : %4.2fL/m ", _data.flowRate);
            break;
        case 1:
            snprintf(r0, 17, "Level : %.1fcm  ", _data.waterLevelCm);
            snprintf(r1, 17, "WiFi  : %-8s", _data.wifiStatus.c_str());
            break;
        case 2:
            snprintf(r0, 17, "Supabase:       ");
            snprintf(r1, 17, "%-16s", _data.supaStatus.c_str());
            break;
        default: return;
    }

    _lcd.setCursor(0, 0); _lcd.print(r0);
    _lcd.setCursor(0, 1); _lcd.print(r1);
}

// ----------------------------------------------------------------
// API Publik
// ----------------------------------------------------------------
void begin() {
    _lcd.init();
    _lcd.backlight();
    _backlightOn = true;
    _backlightMs = millis();
    _pageMs      = millis();

    _lcd.clear();
    _lcd.setCursor(0, 0); _lcd.print(F("SHE Water Mon.  "));
    _lcd.setCursor(0, 1); _lcd.print(F("Inisialisasi... "));
    Serial.println(F("[LCD] Siap. Addr=0x") + String(LCD_I2C_ADDR, HEX));
}

void showStartupMsg(const char* line1, const char* line2) {
    _lcd.clear();
    _lcd.setCursor(0, 0); _lcd.print(line1);
    _lcd.setCursor(0, 1); _lcd.print(line2);
}

void setData(const SensorData& d) {
    _data = d;
}

void wake() {
    if (!_backlightOn) {
        _lcd.backlight();
        _backlightOn = true;
    }
    _backlightMs = millis();
    _pageMs      = millis();
    _page        = 0;
    renderPage(_page);
}

void loop() {
    unsigned long now = millis();

    // Matikan backlight setelah LCD_DISPLAY_DURATION
    if (_backlightOn && (now - _backlightMs >= LCD_DISPLAY_DURATION)) {
        _lcd.noBacklight();
        _backlightOn = false;
    }

    // Rotasi halaman selama backlight menyala
    if (_backlightOn && (now - _pageMs >= LCD_PAGE_INTERVAL)) {
        _pageMs = now;
        _page = (_page + 1) % 3;
        renderPage(_page);
    }
}

} // namespace LCDDisplay
