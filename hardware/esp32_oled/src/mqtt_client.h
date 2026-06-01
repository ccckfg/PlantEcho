#pragma once

#include "readings.h"
#include "settings.h"

void beginMqtt(DeviceSettings &settings);
void maintainMqtt(DeviceSettings &settings);
bool publishReadingMqtt(const SensorReading &reading, DeviceSettings &settings);
bool isMqttConnected();
bool wasLastMqttPublishOk();
unsigned long lastMqttPublishAtMs();
