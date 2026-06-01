#include "display_view.h"

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Wire.h>
#include <math.h>

#include "config.h"
#include "display_face.h"

namespace {
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET_PIN);
bool displayReady = false;
uint8_t displayAddress = 0;

bool initAtAddress(uint8_t address) {
  if (!display.begin(SSD1306_SWITCHCAPVCC, address)) {
    return false;
  }
  displayAddress = address;
  displayReady = true;
  display.ssd1306_command(SSD1306_DISPLAYON);
  display.dim(false);
  display.clearDisplay();
  display.display();
  return true;
}

void drawTitle(const char *title) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.print(title);
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);
}
}  // namespace

bool beginDisplay() {
  if (initAtAddress(OLED_ADDRESS_PRIMARY) ||
      initAtAddress(OLED_ADDRESS_SECONDARY)) {
    Serial.print("OLED ready at 0x");
    Serial.println(displayAddress, HEX);
    return true;
  }

  Serial.println("OLED not found. Check D21/D22/VCC/GND.");
  return false;
}

void renderDisplay(const SensorReading &reading, const DisplayStatus &status) {
  if (!displayReady) {
    return;
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  drawPlantFaceScreen(display, reading, status);
  display.display();
}

void renderConfigHoldProgress(unsigned long elapsedMs, unsigned long totalMs) {
  if (!displayReady) return;

  drawTitle("Setup request");
  display.setCursor(0, 16);
  display.print("Keep holding BOOT");
  display.setCursor(0, 28);
  display.print("Enter setup mode");

  const int width = map(constrain(elapsedMs, 0UL, totalMs), 0UL, totalMs, 0, 124);
  display.drawRect(0, 44, 128, 10, SSD1306_WHITE);
  display.fillRect(2, 46, width, 6, SSD1306_WHITE);
  display.display();
}

void renderConfigPortal(const String &ssid, const IPAddress &ip) {
  if (!displayReady) return;

  drawTitle("Setup portal");
  display.setCursor(0, 15);
  display.print("WiFi:");
  display.setCursor(0, 26);
  display.print(ssid);
  display.setCursor(0, 40);
  display.print("Open:");
  display.setCursor(0, 52);
  display.print(ip);
  display.display();
}

void renderConfigSaved() {
  if (!displayReady) return;

  drawTitle("Setup saved");
  display.setCursor(0, 20);
  display.print("Rebooting...");
  display.display();
}
