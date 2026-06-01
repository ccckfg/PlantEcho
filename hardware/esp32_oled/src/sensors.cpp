#include "sensors.h"

#include <Adafruit_SHT4x.h>
#include <Wire.h>

#include "config.h"

namespace {
Adafruit_SHT4x sht4;
bool sht40Ready = false;
bool bh1750Ready = false;
uint8_t bh1750Address = 0;

constexpr uint8_t BH1750_POWER_ON = 0x01;
constexpr uint8_t BH1750_RESET = 0x07;
constexpr uint8_t BH1750_CONTINUOUS_HIGH_RES = 0x10;

int soilPercentFromRaw(int raw) {
  const int percent = map(raw, SOIL_RAW_DRY, SOIL_RAW_WET, 0, 100);
  return constrain(percent, 0, 100);
}

bool writeBh1750Command(uint8_t address, uint8_t command) {
  Wire.beginTransmission(address);
  Wire.write(command);
  return Wire.endTransmission() == 0;
}

bool beginBh1750At(uint8_t address) {
  if (!writeBh1750Command(address, BH1750_POWER_ON)) {
    return false;
  }
  delay(10);
  writeBh1750Command(address, BH1750_RESET);
  delay(10);
  if (!writeBh1750Command(address, BH1750_CONTINUOUS_HIGH_RES)) {
    return false;
  }
  bh1750Address = address;
  return true;
}

float readBh1750Lux() {
  if (!bh1750Ready) {
    return NAN;
  }
  Wire.requestFrom(static_cast<int>(bh1750Address), 2);
  if (Wire.available() < 2) {
    return NAN;
  }
  const uint16_t raw = (static_cast<uint16_t>(Wire.read()) << 8) | Wire.read();
  return raw / 1.2f;
}
}  // namespace

void printI2cDevices() {
  Serial.println("Scanning I2C bus...");
  bool found = false;

  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      found = true;
      Serial.print("I2C device found at 0x");
      if (address < 16) {
        Serial.print("0");
      }
      Serial.println(address, HEX);
    }
  }

  if (!found) {
    Serial.println("No I2C device found.");
  }
}

bool beginSensors(bool i2cAvailable) {
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_ADC_PIN, ADC_11db);

  if (!i2cAvailable) {
    sht40Ready = false;
    bh1750Ready = false;
    Serial.println("Skipping I2C sensors because bus is not ready.");
    return false;
  }

  sht40Ready = sht4.begin();
  if (sht40Ready) {
    sht4.setPrecision(SHT4X_HIGH_PRECISION);
    sht4.setHeater(SHT4X_NO_HEATER);
    Serial.println("SHT40 ready.");
  } else {
    Serial.println("SHT40 not found. Check VDD/GND/SCL/SDA.");
  }

  bh1750Ready = beginBh1750At(BH1750_ADDRESS_PRIMARY) ||
                beginBh1750At(BH1750_ADDRESS_SECONDARY);
  if (bh1750Ready) {
    Serial.print("GY-302/BH1750 ready at 0x");
    Serial.println(bh1750Address, HEX);
  } else {
    Serial.println("GY-302/BH1750 not found. Check VCC/GND/SCL/SDA/ADDR.");
  }

  return sht40Ready || bh1750Ready;
}

SensorReading readSensors() {
  SensorReading reading;
  reading.sampledAtMs = millis();
  reading.soilRaw = analogRead(SOIL_ADC_PIN);
  reading.soilPercent = soilPercentFromRaw(reading.soilRaw);
  reading.sht40Ready = sht40Ready;
  reading.lightLux = readBh1750Lux();

  if (sht40Ready) {
    sensors_event_t humidity;
    sensors_event_t temp;
    if (sht4.getEvent(&humidity, &temp)) {
      reading.airTempC = temp.temperature;
      reading.airHumidityPercent = humidity.relative_humidity;
    }
  }

  return reading;
}
