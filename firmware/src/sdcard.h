#pragma once
#include <Arduino.h>

// ================================================================
// sdcard.h — Logging ke MicroSD Card (SPI)
// Format file: sensor_log.csv dengan kolom status (Sent/Pending)
// ================================================================
namespace SDCard {

    struct LogEntry {
        String timestamp;    // Format: "YYYY-MM-DD HH:MM:SS" atau uptime
        float  ph;
        float  flow;
        float  totalLiter;
        float  waterLevel;
        float  waterPercent;
        bool   pending;      // true = belum terkirim ke Supabase
    };

    bool begin();                // Inisialisasi SD card, buat header CSV jika perlu
    bool isReady();              // true jika SD card siap
    void writeLog(const LogEntry& e);  // Tulis baris baru ke CSV

    // Retry: baca semua baris pending, kembalikan via array
    // Setelah dipanggil, status baris pending diubah ke "Sent" di file
    int  getPendingCount();
    bool processPending(LogEntry outBuf[], int maxCount, int& outCount);
}
