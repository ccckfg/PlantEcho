#include "mqtt_client.h"

#include <ArduinoJson.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <math.h>

#include "config.h"

namespace {
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);
DeviceSettings *activeSettings = nullptr;
unsigned long lastMqttAttemptAt = 0;
bool lastPublishOk = false;
unsigned long lastPublishAt = 0;

void addNullableFloat(JsonDocument &doc, const char *key, float value) {
  if (isnan(value)) {
    doc[key] = nullptr;
  } else {
    doc[key] = value;
  }
}

void addOptionalString(JsonDocument &doc, const char *key, const String &value) {
  if (value.length() > 0) {
    doc[key] = value;
  }
}

String readingsTopic(const DeviceSettings &settings) {
  return "dyn/devices/" + settings.deviceId + "/readings";
}

String configTopic(const DeviceSettings &settings) {
  return "dyn/devices/" + settings.deviceId + "/config";
}

void handleConfigMessage(char *topic, byte *payload, unsigned int length) {
  if (!activeSettings || String(topic) != configTopic(*activeSettings)) {
    return;
  }

  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) {
    Serial.print("MQTT config JSON failed: ");
    Serial.println(error.c_str());
    return;
  }

  const char *type = doc["type"] | "";
  const char *deviceId = doc["deviceId"] | "";
  const char *apiKey = doc["apiKey"] | "";
  if (String(type) != "device.credentials" ||
      String(deviceId) != activeSettings->deviceId ||
      String(apiKey).length() == 0) {
    Serial.println("MQTT config ignored");
    return;
  }

  if (activeSettings->deviceApiKey == String(apiKey)) {
    Serial.println("MQTT device key already saved");
    return;
  }

  activeSettings->deviceApiKey = String(apiKey);
  saveSettings(*activeSettings);
  Serial.println("MQTT device key saved. Reconnecting with credentials...");
  mqtt.disconnect();
}

bool connectMqtt(DeviceSettings &settings) {
  if (!ENABLE_MQTT || WiFi.status() != WL_CONNECTED || !hasMqttSettings(settings)) {
    return false;
  }
  activeSettings = &settings;
  mqtt.setServer(settings.mqttHost.c_str(), settings.mqttPort);
  const String clientId = "dyn-" + settings.deviceId;
  Serial.print("MQTT connecting to ");
  Serial.print(settings.mqttHost);
  Serial.print(":");
  Serial.print(settings.mqttPort);
  Serial.print(" as ");
  Serial.println(settings.deviceId);
  const bool ok = mqtt.connect(
    clientId.c_str(),
    settings.deviceId.c_str(),
    settings.deviceApiKey.length() > 0 ? settings.deviceApiKey.c_str() : nullptr
  );
  Serial.print("MQTT ");
  if (ok) {
    Serial.println("connected");
  } else {
    Serial.print("connect failed, state=");
    Serial.println(mqtt.state());
  }
  if (ok) {
    const String topic = configTopic(settings);
    const bool subscribed = mqtt.subscribe(topic.c_str(), 1);
    Serial.print("MQTT config subscribe ");
    Serial.println(subscribed ? "ok" : "failed");
  }
  return ok;
}
}  // namespace

void beginMqtt(DeviceSettings &settings) {
  mqtt.setBufferSize(512);
  mqtt.setCallback(handleConfigMessage);
  connectMqtt(settings);
}

void maintainMqtt(DeviceSettings &settings) {
  if (!ENABLE_MQTT) return;
  if (mqtt.connected()) {
    mqtt.loop();
    return;
  }
  if (millis() - lastMqttAttemptAt >= MQTT_RECONNECT_INTERVAL_MS) {
    lastMqttAttemptAt = millis();
    connectMqtt(settings);
  }
}

bool publishReadingMqtt(const SensorReading &reading, DeviceSettings &settings) {
  maintainMqtt(settings);
  if (!mqtt.connected()) return false;

  JsonDocument doc;
  doc["soilRaw"] = reading.soilRaw;
  doc["soilPercent"] = reading.soilPercent;
  addNullableFloat(doc, "airTempC", reading.airTempC);
  addNullableFloat(doc, "airHumidityPercent", reading.airHumidityPercent);
  addNullableFloat(doc, "lightLux", reading.lightLux);
  doc["rssi"] = WiFi.RSSI();
  doc["batteryMv"] = nullptr;
  addOptionalString(doc, "userId", settings.serverUserId);

  char payload[512];
  const size_t length = serializeJson(doc, payload, sizeof(payload));
  const bool ok = mqtt.publish(readingsTopic(settings).c_str(), payload, length);
  lastPublishOk = ok;
  lastPublishAt = millis();
  Serial.print("MQTT publish ");
  Serial.println(ok ? "ok" : "failed");
  return ok;
}

bool isMqttConnected() {
  return mqtt.connected();
}

bool wasLastMqttPublishOk() {
  return lastPublishOk;
}

unsigned long lastMqttPublishAtMs() {
  return lastPublishAt;
}
