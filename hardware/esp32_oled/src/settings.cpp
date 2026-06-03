#include "settings.h"

#include <Preferences.h>

#include "config.h"

namespace {
constexpr const char *SETTINGS_NAMESPACE = "dyn";

String valueOrDefault(const String &value, const char *fallback) {
  return value.length() > 0 ? value : String(fallback);
}
}  // namespace

DeviceSettings loadSettings() {
  Preferences prefs;
  prefs.begin(SETTINGS_NAMESPACE, true);

  DeviceSettings settings;
  settings.wifiSsid = valueOrDefault(prefs.getString("wifiSsid", ""), WIFI_SSID);
  settings.wifiPassword = valueOrDefault(prefs.getString("wifiPass", ""), WIFI_PASSWORD);
  settings.serverBaseUrl = valueOrDefault(prefs.getString("serverUrl", ""), SERVER_BASE_URL);
  settings.mqttHost = valueOrDefault(prefs.getString("mqttHost", ""), MQTT_HOST);
  settings.mqttPort = prefs.getUShort("mqttPort", MQTT_PORT);
  settings.deviceId = valueOrDefault(prefs.getString("deviceId", ""), DEVICE_ID);
  settings.deviceApiKey = valueOrDefault(prefs.getString("apiKey", ""), DEVICE_API_KEY);
  settings.serverUserId = valueOrDefault(prefs.getString("userId", ""), SERVER_USER_ID);
  settings.otaManifestUrl = valueOrDefault(prefs.getString("otaUrl", ""), OTA_MANIFEST_URL);

  prefs.end();
  return settings;
}

void saveSettings(const DeviceSettings &settings) {
  Preferences prefs;
  prefs.begin(SETTINGS_NAMESPACE, false);
  prefs.putString("wifiSsid", settings.wifiSsid);
  prefs.putString("wifiPass", settings.wifiPassword);
  prefs.putString("serverUrl", settings.serverBaseUrl);
  prefs.putString("mqttHost", settings.mqttHost);
  prefs.putUShort("mqttPort", settings.mqttPort);
  prefs.putString("deviceId", settings.deviceId);
  prefs.putString("apiKey", settings.deviceApiKey);
  prefs.putString("userId", settings.serverUserId);
  prefs.putString("otaUrl", settings.otaManifestUrl);
  prefs.end();
}

void clearSettings() {
  Preferences prefs;
  prefs.begin(SETTINGS_NAMESPACE, false);
  prefs.clear();
  prefs.end();
}

bool hasWifiSettings(const DeviceSettings &settings) {
  return settings.wifiSsid.length() > 0;
}

bool hasMqttSettings(const DeviceSettings &settings) {
  return settings.mqttHost.length() > 0 && settings.mqttPort > 0;
}

bool hasDeviceIdentity(const DeviceSettings &settings) {
  return settings.deviceId.length() > 0;
}
