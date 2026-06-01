#include "uploader.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <math.h>

#include "config.h"

namespace {
DisplayStatus status;
unsigned long lastWifiAttemptAt = 0;

bool hasText(const char *value) {
  return value != nullptr && value[0] != '\0';
}

bool hasText(const String &value) {
  return value.length() > 0;
}

String readingsUrl(const DeviceSettings &settings) {
  return settings.serverBaseUrl + "/api/v1/devices/" + settings.deviceId + "/readings";
}

void addNullableFloat(JsonDocument &doc, const char *key, float value) {
  if (isnan(value)) {
    doc[key] = nullptr;
  } else {
    doc[key] = value;
  }
}
}  // namespace

bool isUploadEnabled(const DeviceSettings &settings) {
  return ENABLE_HTTP_UPLOAD && hasText(settings.wifiSsid) &&
         hasText(settings.serverBaseUrl) && hasText(settings.deviceId);
}

bool beginNetwork(const DeviceSettings &settings) {
  status.uploadEnabled = (ENABLE_MQTT && hasMqttSettings(settings)) ||
                         isUploadEnabled(settings);
  if (!ENABLE_WIFI || !hasWifiSettings(settings)) {
    Serial.println("WiFi disabled. Set ENABLE_WIFI and WIFI_SSID.");
    return false;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(settings.wifiSsid.c_str(), settings.wifiPassword.c_str());
  lastWifiAttemptAt = millis();

  const unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED &&
         millis() - start < WIFI_CONNECT_TIMEOUT_MS) {
    delay(250);
    Serial.print(".");
  }
  Serial.println();

  status.wifiConnected = WiFi.status() == WL_CONNECTED;
  if (status.wifiConnected) {
    status.ip = WiFi.localIP();
    Serial.print("WiFi connected: ");
    Serial.println(status.ip);
  } else {
    Serial.println("WiFi connection timed out.");
  }

  if (status.wifiConnected && !status.uploadEnabled) {
    Serial.println("Upload disabled. Enable MQTT or HTTP upload.");
  }

  return status.wifiConnected;
}

void maintainNetwork(const DeviceSettings &settings) {
  status.uploadEnabled = (ENABLE_MQTT && hasMqttSettings(settings)) ||
                         isUploadEnabled(settings);
  status.wifiConnected = ENABLE_WIFI && WiFi.status() == WL_CONNECTED;
  if (status.wifiConnected) {
    status.ip = WiFi.localIP();
  } else if (ENABLE_WIFI && hasWifiSettings(settings) &&
             millis() - lastWifiAttemptAt >= WIFI_RECONNECT_INTERVAL_MS) {
    lastWifiAttemptAt = millis();
    WiFi.disconnect();
    WiFi.begin(settings.wifiSsid.c_str(), settings.wifiPassword.c_str());
  }
}

DisplayStatus getDisplayStatus() {
  return status;
}

bool uploadReading(const SensorReading &reading, const DeviceSettings &settings) {
  maintainNetwork(settings);
  if (!isUploadEnabled(settings) || !status.wifiConnected) {
    return false;
  }

  JsonDocument doc;
  doc["soilRaw"] = reading.soilRaw;
  doc["soilPercent"] = reading.soilPercent;
  addNullableFloat(doc, "airTempC", reading.airTempC);
  addNullableFloat(doc, "airHumidityPercent", reading.airHumidityPercent);
  addNullableFloat(doc, "lightLux", reading.lightLux);
  doc["rssi"] = WiFi.RSSI();
  doc["batteryMv"] = nullptr;

  String body;
  serializeJson(doc, body);

  HTTPClient http;
  http.begin(readingsUrl(settings));
  http.addHeader("Content-Type", "application/json");
  if (hasText(settings.deviceApiKey)) {
    http.addHeader("x-api-key", settings.deviceApiKey);
  }

  const int code = http.POST(body);
  http.end();

  status.lastHttpCode = code;
  status.lastUploadAtMs = millis();
  status.lastUploadOk = code >= 200 && code < 300;

  Serial.print("Upload ");
  Serial.print(code);
  Serial.print(": ");
  Serial.println(body);

  return status.lastUploadOk;
}
