#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include "supabase.h"
#include "config.h"
#include "secrets.h"

// ================================================================
// supabase.cpp — POST JSON ke Supabase REST API
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

  // Bangun JSON
  JsonDocument doc;
  doc["ph"]            = round(p.ph          * 100.0f) / 100.0f;
  doc["flow"]          = round(p.flow        * 100.0f) / 100.0f;
  doc["total_liter"]   = round(p.totalLiter  * 100.0f) / 100.0f;
  doc["water_level"]   = round(p.waterLevel  * 10.0f)  / 10.0f;
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
