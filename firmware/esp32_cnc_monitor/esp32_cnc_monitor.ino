#include <HTTPClient.h>
#include <WiFi.h>

// ===== Configuração =====
constexpr char WIFI_SSID[] = "NOME_DA_REDE";
constexpr char WIFI_PASSWORD[] = "SENHA_DA_REDE";
// Use o IP do computador que executa o backend; não use "localhost".
constexpr char BACKEND_URL[] = "http://192.168.1.50:8000/api/devices/register";

bool registered = false;
unsigned long lastAttempt = 0;

bool registerDevice() {
  String json = "{\"mac_address\":\"" + WiFi.macAddress() +
                "\",\"ip_address\":\"" + WiFi.localIP().toString() +
                "\",\"firmware_version\":\"0.1.0\"}";

  Serial.println("\nJSON enviado:");
  Serial.println(json);

  HTTPClient http;
  http.begin(BACKEND_URL);
  http.addHeader("Content-Type", "application/json");
  const int statusCode = http.POST(json);
  const String response = http.getString();
  http.end();

  Serial.printf("HTTP %d\nResposta: %s\n", statusCode, response.c_str());
  return statusCode >= 200 && statusCode < 300;
}

void setup() {
  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  lastAttempt = millis() - 5'000;
  Serial.printf("Conectando ao Wi-Fi %s", WIFI_SSID);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    registered = false;
    if (millis() - lastAttempt >= 5'000) {
      lastAttempt = millis();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
      Serial.print('.');
    }
    return;
  }

  if (!registered && millis() - lastAttempt >= 5'000) {
    lastAttempt = millis();
    Serial.printf("\nWi-Fi conectado | IP: %s | MAC: %s\n",
                  WiFi.localIP().toString().c_str(), WiFi.macAddress().c_str());
    registered = registerDevice();
  }
}
