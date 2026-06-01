#pragma once

#include <Arduino.h>
#include "readings.h"

bool beginSensors(bool i2cAvailable);
SensorReading readSensors();
void printI2cDevices();
