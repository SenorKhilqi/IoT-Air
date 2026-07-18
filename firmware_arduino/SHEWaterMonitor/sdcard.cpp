#include <Arduino.h>
#include <SPI.h>
#include <SD.h>
#include "sdcard.h"
#include "config.h"

// ================================================================
// sdcard.cpp — CSV Logging + Pending Retry
// Format: Timestamp,pH,Flow_Lpm,TotalLiter,WaterLevel_cm,WaterPercent,Status
// ================================================================
namespace SDCard {

static bool _ready = false;
static const char* HEADER =
  "Timestamp,pH,Flow_Lpm,TotalLiter,WaterLevel_cm,WaterPercent,Status\n";

bool begin() {
  if (!SD.begin(SD_CS_PIN)) {
    Serial.println(F("[SDCard] GAGAL init! Cek wiring & kartu SD."));
    _ready = false;
    return false;
  }
  _ready = true;
  Serial.print(F("[SDCard] OK. Size: "));
  Serial.print((uint32_t)(SD.cardSize() / (1024 * 1024)));
  Serial.println(F(" MB"));
  if (!SD.exists(LOG_FILENAME)) {
    File f = SD.open(LOG_FILENAME, FILE_WRITE);
    if (f) { f.print(HEADER); f.close(); }
  }
  return true;
}

bool isReady() { return _ready; }

// Buat string uptime "UP+HH:MM:SS"
static String uptimeStr() {
  unsigned long s = millis() / 1000UL;
  unsigned long h = s / 3600; s %= 3600;
  unsigned long m = s / 60;   s %= 60;
  char buf[16];
  snprintf(buf, sizeof(buf), "UP+%02lu:%02lu:%02lu", h, m, s);
  return String(buf);
}

void writeLog(const LogEntry& e) {
  if (!_ready) return;
  File f = SD.open(LOG_FILENAME, FILE_APPEND);
  if (!f) { Serial.println(F("[SDCard] Gagal buka file.")); return; }

  String ts = e.timestamp.isEmpty() ? uptimeStr() : e.timestamp;
  f.print(ts);                   f.print(',');
  f.print(e.ph,           2);    f.print(',');
  f.print(e.flow,         2);    f.print(',');
  f.print(e.totalLiter,   2);    f.print(',');
  f.print(e.waterLevel,   1);    f.print(',');
  f.print((int)e.waterPercent);  f.print(',');
  f.println(e.pending ? "Pending" : "Sent");
  f.close();
}

int getPendingCount() {
  if (!_ready) return 0;
  File f = SD.open(LOG_FILENAME, FILE_READ);
  if (!f) return 0;
  int count = 0;
  while (f.available()) {
    String line = f.readStringUntil('\n');
    if (line.indexOf("Pending") >= 0) count++;
  }
  f.close();
  return count;
}

bool processPending(LogEntry outBuf[], int maxCount, int& outCount) {
  if (!_ready) return false;
  File fr = SD.open(LOG_FILENAME, FILE_READ);
  if (!fr) return false;

  const int MAX_LINES = 200;
  static String lines[MAX_LINES];
  int lineCount = 0;
  while (fr.available() && lineCount < MAX_LINES) {
    lines[lineCount++] = fr.readStringUntil('\n');
  }
  fr.close();

  outCount = 0;
  for (int i = 1; i < lineCount && outCount < maxCount; i++) {
    String& ln = lines[i];
    if (ln.isEmpty() || ln.indexOf("Pending") < 0) continue;

    // Parse CSV
    String fields[7];
    int col = 0;
    for (unsigned int k = 0; k < ln.length() && col < 7; k++) {
      if (ln[k] == ',') col++;
      else fields[col] += ln[k];
    }

    LogEntry& e = outBuf[outCount++];
    e.timestamp    = fields[0];
    e.ph           = fields[1].toFloat();
    e.flow         = fields[2].toFloat();
    e.totalLiter   = fields[3].toFloat();
    e.waterLevel   = fields[4].toFloat();
    e.waterPercent = fields[5].toFloat();
    e.pending      = false;

    // Ganti status "Pending" → "Sent" di baris asli
    int idx = ln.lastIndexOf(',');
    if (idx >= 0) ln = ln.substring(0, idx + 1) + "Sent";
  }

  if (outCount == 0) return false;

  // Tulis ulang file
  SD.remove(LOG_FILENAME);
  File fw = SD.open(LOG_FILENAME, FILE_WRITE);
  if (!fw) return false;
  fw.print(HEADER);
  for (int i = 1; i < lineCount; i++) {
    if (!lines[i].isEmpty()) fw.println(lines[i]);
  }
  fw.close();
  return true;
}

} // namespace SDCard
