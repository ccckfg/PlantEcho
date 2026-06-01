#include "ota_update.h"

#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <HTTPUpdate.h>
#include <WiFi.h>

#include "config.h"

namespace {
unsigned long lastOtaCheckAt = 0;

String resolveUrl(const String &manifestUrl, const String &firmwareUrl) {
  if (firmwareUrl.startsWith("http://") || firmwareUrl.startsWith("https://")) {
    return firmwareUrl;
  }
  const int slash = manifestUrl.lastIndexOf('/');
  return slash > 0 ? manifestUrl.substring(0, slash + 1) + firmwareUrl : firmwareUrl;
}
}  // namespace

void checkOtaUpdate(const DeviceSettings &settings, bool force) {
  if (!ENABLE_OTA || settings.otaManifestUrl.length() == 0 ||
      WiFi.status() != WL_CONNECTED) {
    return;
  }
  if (!force && millis() - lastOtaCheckAt < OTA_CHECK_INTERVAL_MS) {
    return;
  }
  lastOtaCheckAt = millis();

  HTTPClient http;
  http.begin(settings.otaManifestUrl);
  if (settings.deviceApiKey.length() > 0) {
    http.addHeader("x-api-key", settings.deviceApiKey);
  }
  const int code = http.GET();
  if (code != 200) {
    Serial.print("OTA manifest failed: ");
    Serial.println(code);
    http.end();
    return;
  }

  JsonDocument doc;
  const DeserializationError error = deserializeJson(doc, http.getString());
  http.end();
  if (error) {
    Serial.println("OTA manifest JSON invalid.");
    return;
  }

  const String version = doc["version"] | "";
  const String firmwareUrl = doc["url"] | "";
  if (version.length() == 0 || firmwareUrl.length() == 0 ||
      version == FIRMWARE_VERSION) {
    return;
  }

  WiFiClient client;
  const String url = resolveUrl(settings.otaManifestUrl, firmwareUrl);
  Serial.print("OTA updating to ");
  Serial.print(version);
  Serial.print(" from ");
  Serial.println(url);
  t_httpUpdate_return result = httpUpdate.update(client, url);
  if (result == HTTP_UPDATE_FAILED) {
    Serial.printf("OTA failed: %d %s\n", httpUpdate.getLastError(),
                  httpUpdate.getLastErrorString().c_str());
  }
}
