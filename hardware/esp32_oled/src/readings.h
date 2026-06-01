#pragma once

#include <Arduino.h>
#include <math.h>

struct SensorReading {
  int soilRaw = 0;
  int soilPercent = 0;
  float airTempC = NAN;
  float airHumidityPercent = NAN;
  float lightLux = NAN;
  int rssi = 0;
  unsigned long sampledAtMs = 0;
  bool sht40Ready = false;
};

inline bool hasAirReading(const SensorReading &reading) {
  return reading.sht40Ready && !isnan(reading.airTempC) &&
         !isnan(reading.airHumidityPercent);
}

inline bool hasLightReading(const SensorReading &reading) {
  return !isnan(reading.lightLux);
}
