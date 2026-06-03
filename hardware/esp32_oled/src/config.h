#pragma once

#include <Arduino.h>

#if __has_include("local_config.h")
#include "local_config.h"
#endif

#ifndef DYN_ENABLE_WIFI
#define DYN_ENABLE_WIFI true
#endif

#ifndef DYN_ENABLE_HTTP_UPLOAD
#define DYN_ENABLE_HTTP_UPLOAD false
#endif

#ifndef DYN_ENABLE_MQTT
#define DYN_ENABLE_MQTT true
#endif

#ifndef DYN_ENABLE_CONFIG_PORTAL
#define DYN_ENABLE_CONFIG_PORTAL true
#endif

#ifndef DYN_ENABLE_OTA
#define DYN_ENABLE_OTA true
#endif

#ifndef DYN_WIFI_SSID
#define DYN_WIFI_SSID ""
#endif

#ifndef DYN_WIFI_PASSWORD
#define DYN_WIFI_PASSWORD ""
#endif

#ifndef DYN_SERVER_BASE_URL
#define DYN_SERVER_BASE_URL "http://192.168.1.100:8787"
#endif

#ifndef DYN_MQTT_HOST
#define DYN_MQTT_HOST ""
#endif

#ifndef DYN_MQTT_PORT
#define DYN_MQTT_PORT 1883
#endif

#ifndef DYN_OTA_MANIFEST_URL
#define DYN_OTA_MANIFEST_URL ""
#endif

#ifndef DYN_FIRMWARE_VERSION
#define DYN_FIRMWARE_VERSION "0.2.0"
#endif

#ifndef DYN_DEVICE_ID
#define DYN_DEVICE_ID "esp32-demo"
#endif

#ifndef DYN_DEVICE_API_KEY
#define DYN_DEVICE_API_KEY ""
#endif

#ifndef DYN_SERVER_USER_ID
#define DYN_SERVER_USER_ID ""
#endif

constexpr int I2C_SDA_PIN = 21;
constexpr int I2C_SCL_PIN = 22;
constexpr int SOIL_ADC_PIN = 34;
constexpr int CONFIG_BUTTON_PIN = 0;

constexpr int SCREEN_WIDTH = 128;
constexpr int SCREEN_HEIGHT = 64;
constexpr int OLED_RESET_PIN = -1;
constexpr uint8_t OLED_ADDRESS_PRIMARY = 0x3C;
constexpr uint8_t OLED_ADDRESS_SECONDARY = 0x3D;
constexpr uint8_t BH1750_ADDRESS_PRIMARY = 0x23;
constexpr uint8_t BH1750_ADDRESS_SECONDARY = 0x5C;

constexpr int SOIL_RAW_DRY = 3200;
constexpr int SOIL_RAW_WET = 1300;
constexpr int SOIL_PERCENT_DRY_READING = 5;
constexpr int SOIL_PERCENT_WET_READING = 81;
constexpr int SOIL_PERCENT_WET_TARGET = 90;

constexpr unsigned long SAMPLE_INTERVAL_MS = 1000;
constexpr unsigned long DISPLAY_INTERVAL_MS = 250;
constexpr unsigned long MQTT_PUBLISH_INTERVAL_MS = 1000;
constexpr unsigned long HTTP_UPLOAD_INTERVAL_MS = 30000;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 12000;
constexpr unsigned long WIFI_RECONNECT_INTERVAL_MS = 5000;
constexpr unsigned long MQTT_RECONNECT_INTERVAL_MS = 2000;
constexpr unsigned long OTA_CHECK_INTERVAL_MS = 3600000;
constexpr unsigned long CONFIG_BUTTON_HOLD_MS = 3000;
constexpr unsigned long CONFIG_BUTTON_CHECK_INTERVAL_MS = 250;
constexpr unsigned long I2C_TIMEOUT_MS = 50;

constexpr int DISPLAY_SOIL_THIRSTY_PERCENT = 30;
constexpr int DISPLAY_SOIL_SOGGY_PERCENT = 85;
constexpr float DISPLAY_TEMP_COLD_C = 12.0f;
constexpr float DISPLAY_TEMP_HOT_C = 32.0f;
constexpr float DISPLAY_LIGHT_DARK_LUX = 80.0f;
constexpr float DISPLAY_LIGHT_BRIGHT_LUX = 20000.0f;
constexpr unsigned long DISPLAY_BLINK_PERIOD_MS = 4200;
constexpr unsigned long DISPLAY_BLINK_DURATION_MS = 160;
constexpr unsigned long DISPLAY_UPLOAD_NOTICE_MS = 5000;

constexpr bool ENABLE_I2C_SCAN = true;
constexpr bool ENABLE_WIFI = DYN_ENABLE_WIFI;
constexpr bool ENABLE_HTTP_UPLOAD = DYN_ENABLE_HTTP_UPLOAD;
constexpr bool ENABLE_MQTT = DYN_ENABLE_MQTT;
constexpr bool ENABLE_CONFIG_PORTAL = DYN_ENABLE_CONFIG_PORTAL;
constexpr bool ENABLE_OTA = DYN_ENABLE_OTA;

constexpr const char *WIFI_SSID = DYN_WIFI_SSID;
constexpr const char *WIFI_PASSWORD = DYN_WIFI_PASSWORD;
constexpr const char *SERVER_BASE_URL = DYN_SERVER_BASE_URL;
constexpr const char *MQTT_HOST = DYN_MQTT_HOST;
constexpr uint16_t MQTT_PORT = DYN_MQTT_PORT;
constexpr const char *OTA_MANIFEST_URL = DYN_OTA_MANIFEST_URL;
constexpr const char *FIRMWARE_VERSION = DYN_FIRMWARE_VERSION;
constexpr const char *DEVICE_ID = DYN_DEVICE_ID;
constexpr const char *DEVICE_API_KEY = DYN_DEVICE_API_KEY;
constexpr const char *SERVER_USER_ID = DYN_SERVER_USER_ID;
