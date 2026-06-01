#pragma once

#include <Arduino.h>
#include "display_view.h"
#include "readings.h"
#include "settings.h"

bool beginNetwork(const DeviceSettings &settings);
void maintainNetwork(const DeviceSettings &settings);
bool isUploadEnabled(const DeviceSettings &settings);
DisplayStatus getDisplayStatus();
bool uploadReading(const SensorReading &reading, const DeviceSettings &settings);
