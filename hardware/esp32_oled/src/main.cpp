#include <Arduino.h>
#include <Wire.h>

#include "config.h"
#include "config_portal.h"
#include "display_view.h"
#include "mqtt_client.h"
#include "ota_update.h"
#include "readings.h"
#include "sensors.h"
#include "settings.h"
#include "uploader.h"

namespace {
SensorReading latestReading;
DeviceSettings settings;
bool hasReading = false;
int lastConfigButtonLevel = HIGH;
unsigned long lastSampleAt = 0;
unsigned long lastDisplayAt = 0;
unsigned long lastMqttPublishAt = 0;
unsigned long lastHttpUploadAt = 0;
unsigned long lastConfigButtonCheckAt = 0;

bool i2cPinsReleased() {
  pinMode(I2C_SDA_PIN, INPUT_PULLUP);
  pinMode(I2C_SCL_PIN, INPUT_PULLUP);
  delay(20);

  const bool sdaHigh = digitalRead(I2C_SDA_PIN) == HIGH;
  const bool sclHigh = digitalRead(I2C_SCL_PIN) == HIGH;
  if (!sdaHigh || !sclHigh) {
    Serial.print("I2C bus stuck: SDA21=");
    Serial.print(sdaHigh ? "HIGH" : "LOW");
    Serial.print(" SCL22=");
    Serial.println(sclHigh ? "HIGH" : "LOW");
    Serial.println("Unplug I2C modules one by one, then check VCC/GND/SCL/SDA wiring.");
    return false;
  }

  return true;
}

void sampleNow() {
  latestReading = readSensors();
  hasReading = true;

  Serial.print("Soil ");
  Serial.print(latestReading.soilRaw);
  Serial.print(" -> ");
  Serial.print(latestReading.soilPercent);
  Serial.print("%");

  if (hasAirReading(latestReading)) {
    Serial.print(", Temp ");
    Serial.print(latestReading.airTempC, 1);
    Serial.print("C, RH ");
    Serial.print(latestReading.airHumidityPercent, 1);
    Serial.print("%");
  } else {
    Serial.print(", SHT40 missing");
  }
  if (hasLightReading(latestReading)) {
    Serial.print(", Light ");
    Serial.print(latestReading.lightLux, 0);
    Serial.print(" lux");
  } else {
    Serial.print(", GY-302 missing");
  }
  Serial.println();
}

DisplayStatus currentDisplayStatus() {
  DisplayStatus status = getDisplayStatus();
  status.mqttEnabled = ENABLE_MQTT && hasMqttSettings(settings);
  status.mqttConnected = isMqttConnected();
  status.lastMqttPublishOk = wasLastMqttPublishOk();
  status.lastMqttPublishAtMs = lastMqttPublishAtMs();
  return status;
}
}  // namespace

void setup() {
  Serial.begin(115200);
  delay(300);

  const bool i2cAvailable = i2cPinsReleased();
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  Wire.setClock(100000);
  Wire.setTimeOut(I2C_TIMEOUT_MS);
  if (ENABLE_I2C_SCAN && i2cAvailable) {
    printI2cDevices();
  }

  if (i2cAvailable) {
    beginDisplay();
  }

  settings = loadSettings();
  if (shouldStartConfigPortal(settings)) {
    startConfigPortal(settings);
  }

  beginSensors(i2cAvailable);
  if (ENABLE_WIFI) {
    beginNetwork(settings);
    beginMqtt(settings);
    checkOtaUpdate(settings, true);
  }

  sampleNow();
  renderDisplay(latestReading, currentDisplayStatus());
}

void loop() {
  const unsigned long now = millis();

  if (now - lastSampleAt >= SAMPLE_INTERVAL_MS) {
    lastSampleAt = now;
    sampleNow();
  }

  if (ENABLE_WIFI) {
    maintainNetwork(settings);
    maintainMqtt(settings);
    checkOtaUpdate(settings);
  }

  if (ENABLE_CONFIG_PORTAL &&
      now - lastConfigButtonCheckAt >= CONFIG_BUTTON_CHECK_INTERVAL_MS) {
    lastConfigButtonCheckAt = now;
    pinMode(CONFIG_BUTTON_PIN, INPUT_PULLUP);
    const int level = digitalRead(CONFIG_BUTTON_PIN);
    if (level != lastConfigButtonLevel) {
      lastConfigButtonLevel = level;
      Serial.print("BOOT GPIO0=");
      Serial.println(level == LOW ? "LOW" : "HIGH");
    }
    if (configButtonHeldLongEnough()) {
      startConfigPortal(settings);
    }
  }

  if (ENABLE_MQTT && hasReading &&
      now - lastMqttPublishAt >= MQTT_PUBLISH_INTERVAL_MS) {
    lastMqttPublishAt = now;
    publishReadingMqtt(latestReading, settings);
  }

  if (ENABLE_HTTP_UPLOAD && hasReading &&
      now - lastHttpUploadAt >= HTTP_UPLOAD_INTERVAL_MS) {
    lastHttpUploadAt = now;
    uploadReading(latestReading, settings);
  }

  if (hasReading && now - lastDisplayAt >= DISPLAY_INTERVAL_MS) {
    lastDisplayAt = now;
    renderDisplay(latestReading, currentDisplayStatus());
  }
}
