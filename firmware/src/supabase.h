#pragma once
#include <Arduino.h>

// ================================================================
// supabase.h — Pengiriman data ke Supabase REST API
// ================================================================
namespace Supabase {

    struct Payload {
        float  ph;
        float  flow;
        float  totalLiter;
        float  waterLevel;
        float  waterPercent;
        String wifiStatus;
    };

    // Kirim data ke Supabase. Return true jika HTTP 200/201.
    bool send(const Payload& p);
}
