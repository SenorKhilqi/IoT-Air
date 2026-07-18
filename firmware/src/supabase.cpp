#include "supabase.h"
#include "config.h"
#include "secrets.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ================================================================
// supabase.cpp — POST JSON ke Supabase REST API
// Endpoint: POST /rest/v1/sensor_logs
// ================================================================
namespace Supabase {

bool send(const Payload& p) {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println(F("[Supabase] Skip: WiFi tidak terhubung."));
        return false;
    }

    String url = String(SUPABASE_URL) + "/rest/v1/" + SUPABASE_TABLE;

    HTTPClient http;
    http.begin(url);
    http.setTimeout(HTTP_TIMEOUT_MS);
    http.addHeader("Content-Type",  "application/json");
    http.addHeader("apikey",        SUPABASE_ANON_KEY);
    http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
    http.addHeader("Prefer",        "return=minimal");

    // Bangun JSON payload
    JsonDocument doc;
    doc["ph"]            = serialized(String(p.ph, 2));
    doc["flow"]          = serialized(String(p.flow, 2));
    doc["total_liter"]   = serialized(String(p.totalLiter, 2));
    doc["water_level"]   = serialized(String(p.waterLevel, 1));
    doc["water_percent"] = (int)p.waterPercent;
    doc["wifi_status"]   = p.wifiStatus;

    String body;
    serializeJson(doc, body);

    Serial.print(F("[Supabase] POST → "));
    Serial.println(body);

    int code = http.POST(body);
    http.end();

    if (code == 200 || code == 201) {
        Serial.printf("[Supabase] Berhasil. HTTP %d\n", code);
        return true;
    } else {
        Serial.printf("[Supabase] Gagal. HTTP %d\n", code);
        return false;
    }
}

} // namespace Supabase
