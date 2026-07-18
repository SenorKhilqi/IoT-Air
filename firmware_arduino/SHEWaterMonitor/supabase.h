#pragma once
#include <Arduino.h>

// ================================================================
// supabase.h — Pengiriman Data ke Supabase REST API
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

  bool send(const Payload& p);
}
