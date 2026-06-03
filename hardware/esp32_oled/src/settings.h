#pragma once

#include <Arduino.h>

struct DeviceSettings {
  String wifiSsid;
  String wifiPassword;
  String serverBaseUrl;
  String mqttHost;
  uint16_t mqttPort = 1883;
  String deviceId;
  String deviceApiKey;
  String serverUserId;
  String otaManifestUrl;
};

DeviceSettings loadSettings();
void saveSettings(const DeviceSettings &settings);
void clearSettings();
bool hasWifiSettings(const DeviceSettings &settings);
bool hasMqttSettings(const DeviceSettings &settings);
bool hasDeviceIdentity(const DeviceSettings &settings);
