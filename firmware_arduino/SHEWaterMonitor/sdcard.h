#pragma once
#include <Arduino.h>

// ================================================================
// sdcard.h — SD Card Logging dengan Mekanisme Pending/Retry
// ================================================================
namespace SDCard {

  struct LogEntry {
    String timestamp;
    float  ph;
    float  flow;
    float  totalLiter;
    float  waterLevel;
    float  waterPercent;
    bool   pending;
  };

  bool begin();
  bool isReady();
  void writeLog(const LogEntry& e);
  int  getPendingCount();
  bool processPending(LogEntry outBuf[], int maxCount, int& outCount);
}
