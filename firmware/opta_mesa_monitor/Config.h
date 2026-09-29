#pragma once
#include <Arduino.h>

#if __has_include("opta_secrets.h")
#include "opta_secrets.h"
#else
#include "opta_secrets.example.h"
#endif

constexpr char FIRMWARE_VERSION[] = "mesa-opta-scomptec-1.0.0";
constexpr uint32_t SNAPSHOT_INTERVAL_MS = 10;
constexpr uint32_t SEND_INTERVAL_MS = 1000;
constexpr uint32_t HTTP_TIMEOUT_MS = 3000;
constexpr uint32_t WIFI_TIMEOUT_MS = 10000;
constexpr uint32_t MAX_PENDING_AGE_MS = 15000;
constexpr uint32_t CLOCK_RESYNC_MS = 30UL * 60 * 1000;
constexpr uint32_t NETWORK_STACK_BYTES = 16384;
