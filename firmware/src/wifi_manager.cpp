#include "wifi_manager.h"
#include "config.h"
#include "secrets.h"
#include <WiFi.h>

// ================================================================
// wifi_manager.cpp — Implementasi manajemen WiFi
// ================================================================
namespace WiFiMgr {

static unsigned long _lastRetryMs = 0;

void begin() {
    Serial.print(F("[WiFi] Menghubungkan ke '"));
    Serial.print(WIFI_SSID);
    Serial.print(F("'"));

    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long startMs = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startMs < 15000UL) {
        delay(500);
        Serial.print('.');
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println();
        Serial.print(F("[WiFi] Terhubung! IP: "));
        Serial.println(WiFi.localIP());
    } else {
        Serial.println(F("\n[WiFi] Timeout. Lanjut mode Offline."));
    }
    _lastRetryMs = millis();
}

bool isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

void loop() {
    if (isConnected()) return;

    unsigned long now = millis();
    if (now - _lastRetryMs >= WIFI_RETRY_INTERVAL) {
        _lastRetryMs = now;
        Serial.println(F("[WiFi] Mencoba reconnect..."));
        WiFi.disconnect(false);
        WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
}

String getStatusStr() {
    return isConnected() ? "Online" : "Offline";
}

} // namespace WiFiMgr
