#pragma once
#include <Arduino.h>

// ================================================================
// wifi_manager.h
// ================================================================
namespace WiFiMgr {
    void   begin();
    void   loop();
    bool   isConnected();
    String getStatusStr();
}
