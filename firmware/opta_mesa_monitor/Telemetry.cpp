#include "Telemetry.h"
#include "Config.h"
#include <WiFi.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include <mbed.h>
#include <atomic>
#include <ctime>
#include <cstdio>
#include <cstring>

namespace {
rtos::Mutex snapshotMutex;
MesaSnapshot latest;
bool hasSnapshot = false;
rtos::Thread networkThread(osPriorityBelowNormal, NETWORK_STACK_BYTES, nullptr, "opta-telemetry");
std::atomic<int> lastHttp{0};
std::atomic<int> networkStatus{0}; // 0=config ausente, 1=conectando, 2=WiFi, 3=API, -1=thread
std::atomic<uint32_t> discarded{0};
String deviceId;
String bootId;
uint64_t sequence = 0;
time_t serverEpoch = 0;
uint32_t clockAnchorMs = 0;

void pauseMs(uint32_t ms) {
  rtos::ThisThread::sleep_for(std::chrono::milliseconds(ms));
}

bool readSnapshot(MesaSnapshot& result) {
  snapshotMutex.lock();
  const bool present = hasSnapshot;
  result = latest;
  snapshotMutex.unlock();
  return present;
}

// Bounded response size and deadline. Only this thread owns WiFi and its sockets.
int postJson(const String& path, const String& body, String& response) {
  WiFiClient transport;
  transport.setSocketTimeout(HTTP_TIMEOUT_MS);
  HttpClient http(transport, OPTA_API_HOST, OPTA_API_PORT);
  http.setHttpResponseTimeout(HTTP_TIMEOUT_MS);
  http.setHttpWaitForDataDelay(10);
  http.beginRequest();
  const int started = http.post(path);
  if (started != 0) { http.stop(); return started; }
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", body.length());
  http.sendHeader("Connection", "close");
  if (strlen(OPTA_DEVICE_KEY)) http.sendHeader("X-Device-Key", OPTA_DEVICE_KEY);
  http.beginBody();
  const size_t written = http.print(body);
  http.endRequest();
  if (written != body.length()) { http.stop(); return -10; }
  const int code = http.responseStatusCode();
  if (code < 0) { http.stop(); return code; }
  const long length = http.contentLength();
  if (length < 0 || length > 4096) { http.stop(); return -11; }
  response = "";
  response.reserve(length);
  const uint32_t startedRead = millis();
  while (response.length() < static_cast<size_t>(length)) {
    if (static_cast<uint32_t>(millis() - startedRead) >= HTTP_TIMEOUT_MS) {
      http.stop(); return -12;
    }
    const int byte = http.read();
    if (byte >= 0) response += static_cast<char>(byte);
    else pauseMs(5);
  }
  http.stop();
  return code;
}

bool registerDevice() {
  // The String overload handles a temporarily unavailable MAC without dereferencing null.
  String macText = WiFi.macAddress();
  macText.toUpperCase();
  if (macText.length() != 17 || macText == "FF:FF:FF:FF:FF:FF" || macText == "00:00:00:00:00:00") {
    lastHttp.store(-16);
    return false;
  }
  JsonDocument json;
  json["mac_address"] = macText;
  json["ip_address"] = WiFi.localIP().toString();
  json["firmware_version"] = FIRMWARE_VERSION;
  String body, response;
  serializeJson(json, body);
  const int code = postJson(String(OPTA_API_PREFIX) + "/devices/register", body, response);
  lastHttp.store(code);
  if (code != 201 && code != 200) return false;
  JsonDocument reply;
  if (deserializeJson(reply, response)) { lastHttp.store(-13); return false; }
  const char* id = reply["device"]["id"] | "";
  const char* session = reply["telemetry_session_id"] | "";
  const uint32_t epoch = reply["server_time_unix"] | 0U;
  if (strlen(id) != 36 || strlen(session) != 36 || epoch < 1700000000UL) {
    lastHttp.store(-14); return false;
  }
  deviceId = id;
  // Keep this nonce through WiFi reconnects; a reboot obtains a new server nonce.
  if (bootId.length() == 0) bootId = session;
  serverEpoch = static_cast<time_t>(epoch);
  clockAnchorMs = millis();
  return true;
}

String payloadFor(const MesaSnapshot& sample) {
  JsonDocument json;
  char event[100];
  snprintf(event, sizeof(event), "%s:%llu", bootId.c_str(), static_cast<unsigned long long>(++sequence));
  json["event_id"] = event;
  // Signed delta also handles a sample captured just before the registration reply.
  const int32_t delta = static_cast<int32_t>(sample.capturedMs - clockAnchorMs);
  const time_t collectedAt = serverEpoch + delta / 1000;
  struct tm utc;
  gmtime_r(&collectedAt, &utc);
  char timestamp[25];
  strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%SZ", &utc);
  json["timestamp"] = timestamp;
  json["machine_active"] = sample.cycleActive;
  json["voltage_24v"] = nullptr; // No dedicated supply-monitor input in this wiring.
  JsonObject digital = json["digital_signals"].to<JsonObject>();
  digital["ciclo"] = sample.cycleActive;
  digital["alarme"] = sample.fault;
  digital["altura_media_bloqueada"] = !(sample.rawInputs & (1U << 1));
  digital["altura_pequena_bloqueada"] = !(sample.rawInputs & (1U << 2));
  digital["altura_grande_bloqueada"] = !(sample.rawInputs & (1U << 3));
  digital["metal_presente"] = bool(sample.rawInputs & (1U << 4));
  digital["queda1_ocupada"] = bool(sample.rawInputs & (1U << 5));
  digital["queda2_ocupada"] = bool(sample.rawInputs & (1U << 6));
  digital["rampa1_cheia"] = sample.ramp1Full;
  digital["rampa2_cheia"] = sample.ramp2Full;
  json["analog_signals"].to<JsonObject>(); // No analog sensor calibration was provided.
  JsonObject extra = json["extra_signals"].to<JsonObject>();
  extra["rssi"] = WiFi.RSSI();
  extra["uptime_seconds"] = sample.uptimeMs / 1000;
  extra["boot_id"] = bootId;
  extra["amostras_descartadas"] = discarded.load();
  JsonObject mesa = extra["mesa"].to<JsonObject>();
  mesa["estado"] = sample.state;
  mesa["altura"] = sample.height;
  mesa["metal_memorizado"] = sample.metal;
  mesa["rampa1_cheia"] = sample.ramp1Full;
  mesa["rampa2_cheia"] = sample.ramp2Full;
  mesa["capturado_millis"] = sample.capturedMs;
  JsonObject inputs = mesa["entradas_brutas"].to<JsonObject>();
  for (uint8_t i = 0; i < 7; ++i) {
    char name[3] = {'I', static_cast<char>('1' + i), 0};
    inputs[name] = bool(sample.rawInputs & (1U << i));
  }
  JsonObject outputs = mesa["saidas_comandadas"].to<JsonObject>();
  outputs["O1"] = bool(sample.commandedOutputs & 1);
  outputs["O2"] = bool(sample.commandedOutputs & 2);
  outputs["O3"] = bool(sample.commandedOutputs & 4);
  JsonObject counters = mesa["contadores"].to<JsonObject>();
  counters["total"] = sample.total;
  counters["reto"] = sample.straight;
  counters["queda1"] = sample.drop1;
  counters["queda2"] = sample.drop2;
  counters["falhas"] = sample.faults;
  if (json.overflowed()) return String();
  String body;
  serializeJson(json, body);
  return body;
}

void runNetwork() {
  uint32_t backoff = 1000;
  uint32_t lastCaptureSent = 0;
  uint32_t pendingCapturedMs = 0;
  String pending;
  WiFi.setTimeout(WIFI_TIMEOUT_MS);
  while (true) {
    if (WiFi.status() != WL_CONNECTED) {
      networkStatus.store(1);
      WiFi.disconnect();
      WiFi.begin(OPTA_WIFI_SSID, OPTA_WIFI_PASSWORD);
      if (WiFi.status() != WL_CONNECTED) {
        pauseMs(backoff);
        backoff = backoff < 15000 ? backoff * 2 : 30000;
        continue;
      }
      deviceId = ""; // Refresh DHCP address and server clock after reconnecting.
    }
    if (networkStatus.load() != 3) networkStatus.store(2);
    if (deviceId.length() == 0 || static_cast<uint32_t>(millis() - clockAnchorMs) >= CLOCK_RESYNC_MS) {
      if (!registerDevice()) {
        pauseMs(backoff);
        backoff = backoff < 15000 ? backoff * 2 : 30000;
        continue;
      }
    }
    const uint32_t now = millis();
    if (pending.length() && static_cast<uint32_t>(now - pendingCapturedMs) > MAX_PENDING_AGE_MS) {
      pending = "";
      discarded.fetch_add(1);
    }
    if (!pending.length()) {
      MesaSnapshot sample;
      if (!readSnapshot(sample) || static_cast<uint32_t>(millis() - sample.capturedMs) > MAX_PENDING_AGE_MS ||
          (lastCaptureSent && static_cast<uint32_t>(sample.capturedMs - lastCaptureSent) < SEND_INTERVAL_MS)) {
        pauseMs(20);
        continue;
      }
      pending = payloadFor(sample);
      pendingCapturedMs = sample.capturedMs;
      if (!pending.length()) { lastHttp.store(-15); pauseMs(1000); continue; }
    }
    String response;
    const int code = postJson(String(OPTA_API_PREFIX) + "/devices/" + deviceId + "/telemetry", pending, response);
    lastHttp.store(code);
    if (code == 201 || code == 200) {
      networkStatus.store(3);
      lastCaptureSent = pendingCapturedMs;
      pending = "";
      backoff = 1000;
      pauseMs(20);
    } else {
      networkStatus.store(2);
      if (code == 404) deviceId = "";
      if (code == 409 || code == 422) {
        pending = "";
        discarded.fetch_add(1);
        if (code == 422) deviceId = ""; // Re-sync clock as well as checking payload diagnostics.
      }
      // Keep exactly the same serialized body/event_id on timeout and transient errors.
      pauseMs(backoff);
      backoff = backoff < 15000 ? backoff * 2 : 30000;
    }
  }
}
} // namespace

void telemetryBegin() {
  if (!strlen(OPTA_WIFI_SSID) || !strlen(OPTA_API_HOST)) {
    Serial.println("TELEMETRIA DESATIVADA: preencha opta_secrets.h. Controle local permanece ativo.");
    return;
  }
  networkStatus.store(1);
  if (networkThread.start(runNetwork) != osOK) networkStatus.store(-1);
}

void telemetryPublish(const MesaSnapshot& snapshot) {
  // Never wait for the network thread: skip this copy if it is being read.
  if (snapshotMutex.trylock()) {
    latest = snapshot;
    hasSnapshot = true;
    snapshotMutex.unlock();
  }
}

void telemetryPrintDiagnostics() {
  static uint32_t lastPrint = 0;
  const uint32_t now = millis();
  if (static_cast<uint32_t>(now - lastPrint) < 5000) return;
  lastPrint = now;
  Serial.print("TELEMETRIA rede(0=config,1=wifi,2=api,3=ok,-1=thread)=");
  Serial.print(networkStatus.load());
  Serial.print(" HTTP="); Serial.print(lastHttp.load());
  Serial.print(" descartadas="); Serial.println(discarded.load());
}
