#pragma once

#include <Arduino.h>
#include "readings.h"

struct DisplayStatus {
  bool wifiConnected = false;
  bool uploadEnabled = false;
  bool lastUploadOk = false;
  bool mqttEnabled = false;
  bool mqttConnected = false;
  bool lastMqttPublishOk = false;
  int lastHttpCode = 0;
  unsigned long lastUploadAtMs = 0;
  unsigned long lastMqttPublishAtMs = 0;
  IPAddress ip;
};

bool beginDisplay();
void renderDisplay(const SensorReading &reading, const DisplayStatus &status);
void renderConfigHoldProgress(unsigned long elapsedMs, unsigned long totalMs);
void renderConfigPortal(const String &ssid, const IPAddress &ip);
void renderConfigSaved();
