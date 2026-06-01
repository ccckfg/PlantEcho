#include "display_face.h"

#include <Arduino.h>
#include <math.h>

#include "config.h"

namespace {
enum class FaceMood {
  Happy,
  Thirsty,
  Soggy,
  Hot,
  Cold,
  Sleepy,
  Bright,
  Offline,
  Waiting,
  SendIssue,
  SensorIssue
};

struct FaceFrame {
  FaceMood mood;
  const char *bubbleLine1;
  const char *bubbleLine2;
};

bool isFresh(unsigned long timestampMs) {
  return timestampMs > 0 && millis() - timestampMs < DISPLAY_UPLOAD_NOTICE_MS;
}

bool shouldBlink() {
  return millis() % DISPLAY_BLINK_PERIOD_MS < DISPLAY_BLINK_DURATION_MS;
}

int phase(int periodMs, int steps) {
  return static_cast<int>((millis() % periodMs) / (periodMs / steps));
}

FaceFrame chooseFaceFrame(const SensorReading &reading,
                          const DisplayStatus &status) {
  if (status.uploadEnabled && !status.wifiConnected) {
    return {FaceMood::Offline, "WiFi", "lost"};
  }
  if (status.mqttEnabled && status.wifiConnected && !status.mqttConnected) {
    return {FaceMood::Waiting, "MQTT", "wait"};
  }
  if (!hasAirReading(reading) && !hasLightReading(reading)) {
    return {FaceMood::SensorIssue, "Sensor", "check"};
  }
  if (reading.soilPercent <= DISPLAY_SOIL_THIRSTY_PERCENT) {
    return {FaceMood::Thirsty, "I am", "thirsty"};
  }
  if (reading.soilPercent >= DISPLAY_SOIL_SOGGY_PERCENT) {
    return {FaceMood::Soggy, "Too", "wet"};
  }
  if (hasAirReading(reading) && reading.airTempC >= DISPLAY_TEMP_HOT_C) {
    return {FaceMood::Hot, "So", "hot"};
  }
  if (hasAirReading(reading) && reading.airTempC <= DISPLAY_TEMP_COLD_C) {
    return {FaceMood::Cold, "So", "cold"};
  }
  if (hasLightReading(reading) && reading.lightLux <= DISPLAY_LIGHT_DARK_LUX) {
    return {FaceMood::Sleepy, "Need", "sun"};
  }
  if (hasLightReading(reading) &&
      reading.lightLux >= DISPLAY_LIGHT_BRIGHT_LUX) {
    return {FaceMood::Bright, "Too", "bright"};
  }
  if ((status.mqttEnabled && isFresh(status.lastMqttPublishAtMs) &&
       !status.lastMqttPublishOk) ||
      (!status.mqttEnabled && status.uploadEnabled &&
       isFresh(status.lastUploadAtMs) && !status.lastUploadOk)) {
    return {FaceMood::SendIssue, "Send", "again"};
  }
  return {FaceMood::Happy, "I feel", "good"};
}

void drawBlinkEye(Adafruit_SSD1306 &display, int x, int y, int radius) {
  if (shouldBlink()) {
    display.drawLine(x - radius - 1, y, x + radius + 1, y, SSD1306_WHITE);
  } else {
    display.fillCircle(x, y, radius, SSD1306_WHITE);
    display.fillCircle(x + 1, y - 1, 1, SSD1306_BLACK);
  }
}

void drawSoftEye(Adafruit_SSD1306 &display, int x, int y) {
  display.drawLine(x - 5, y, x - 2, y + 2, SSD1306_WHITE);
  display.drawLine(x - 2, y + 2, x + 3, y + 2, SSD1306_WHITE);
  display.drawLine(x + 3, y + 2, x + 6, y, SSD1306_WHITE);
}

void drawSadEye(Adafruit_SSD1306 &display, int x, int y, bool right) {
  const int slope = right ? -1 : 1;
  display.drawLine(x - 5, y - slope * 2, x + 5, y + slope * 2, SSD1306_WHITE);
  display.fillCircle(x, y + 4, 2, SSD1306_WHITE);
}

void drawXEye(Adafruit_SSD1306 &display, int x, int y) {
  display.drawLine(x - 5, y - 5, x + 5, y + 5, SSD1306_WHITE);
  display.drawLine(x + 5, y - 5, x - 5, y + 5, SSD1306_WHITE);
}

void drawSmile(Adafruit_SSD1306 &display, int x, int y) {
  display.drawLine(x, y, x + 5, y + 4, SSD1306_WHITE);
  display.drawLine(x + 5, y + 4, x + 19, y + 4, SSD1306_WHITE);
  display.drawLine(x + 19, y + 4, x + 24, y, SSD1306_WHITE);
}

void drawFrown(Adafruit_SSD1306 &display, int x, int y) {
  display.drawLine(x, y + 5, x + 5, y, SSD1306_WHITE);
  display.drawLine(x + 5, y, x + 19, y, SSD1306_WHITE);
  display.drawLine(x + 19, y, x + 24, y + 5, SSD1306_WHITE);
}

void drawFlatMouth(Adafruit_SSD1306 &display, int x, int y) {
  display.drawLine(x, y, x + 24, y, SSD1306_WHITE);
}

void drawOpenMouth(Adafruit_SSD1306 &display, int x, int y) {
  display.drawCircle(x + 12, y + 2, 5, SSD1306_WHITE);
}

void drawDrop(Adafruit_SSD1306 &display, int x, int y) {
  display.drawTriangle(x, y, x - 4, y + 8, x + 4, y + 8, SSD1306_WHITE);
  display.drawCircle(x, y + 8, 4, SSD1306_WHITE);
}

void drawWaves(Adafruit_SSD1306 &display, int y) {
  const int offset = phase(1200, 4);
  for (int x = -offset * 4; x < 70; x += 16) {
    display.drawLine(x, y + 2, x + 4, y, SSD1306_WHITE);
    display.drawLine(x + 4, y, x + 8, y + 2, SSD1306_WHITE);
    display.drawLine(x + 8, y + 2, x + 12, y, SSD1306_WHITE);
  }
}

void drawSpark(Adafruit_SSD1306 &display, int x, int y) {
  if (phase(900, 2) == 0) {
    display.drawLine(x, y - 5, x, y + 5, SSD1306_WHITE);
    display.drawLine(x - 5, y, x + 5, y, SSD1306_WHITE);
  } else {
    display.drawLine(x - 4, y - 4, x + 4, y + 4, SSD1306_WHITE);
    display.drawLine(x + 4, y - 4, x - 4, y + 4, SSD1306_WHITE);
  }
}

void drawBubble(Adafruit_SSD1306 &display, const FaceFrame &frame) {
  display.drawRoundRect(74, 3, 52, 25, 7, SSD1306_WHITE);
  display.drawLine(74, 22, 67, 27, SSD1306_WHITE);
  display.setCursor(80, 8);
  display.print(frame.bubbleLine1);
  display.setCursor(80, 18);
  display.print(frame.bubbleLine2);
}

void drawFace(Adafruit_SSD1306 &display, const FaceFrame &frame) {
  const int bob = frame.mood == FaceMood::Happy ? phase(1800, 4) % 2 : 0;
  const int shake = frame.mood == FaceMood::Cold ? phase(350, 2) * 2 - 1 : 0;
  const int leftX = 24 + shake;
  const int rightX = 51 + shake;
  const int eyeY = 25 + bob;
  const int mouthX = 25 + shake;
  const int mouthY = 40 + bob;

  switch (frame.mood) {
    case FaceMood::Happy:
      drawBlinkEye(display, leftX, eyeY, 5);
      drawBlinkEye(display, rightX, eyeY, 5);
      drawSmile(display, mouthX, mouthY);
      display.drawLine(38, 10 + bob, 38, 4 + bob, SSD1306_WHITE);
      display.drawLine(38, 5 + bob, 31, 8 + bob, SSD1306_WHITE);
      display.drawLine(38, 5 + bob, 45, 8 + bob, SSD1306_WHITE);
      break;
    case FaceMood::Thirsty:
      drawSadEye(display, leftX, eyeY, false);
      drawSadEye(display, rightX, eyeY, true);
      drawFrown(display, mouthX, mouthY);
      drawDrop(display, 62, 13 + phase(1000, 3) * 2);
      break;
    case FaceMood::Soggy:
      drawSoftEye(display, leftX, eyeY);
      drawSoftEye(display, rightX, eyeY);
      drawFlatMouth(display, mouthX, mouthY);
      drawWaves(display, 49);
      break;
    case FaceMood::Hot:
      drawSadEye(display, leftX, eyeY, false);
      drawSadEye(display, rightX, eyeY, true);
      drawOpenMouth(display, mouthX, mouthY - 2);
      drawDrop(display, 62, 12 + phase(800, 3) * 3);
      break;
    case FaceMood::Cold:
      drawBlinkEye(display, leftX, eyeY, 4);
      drawBlinkEye(display, rightX, eyeY, 4);
      display.drawLine(mouthX, mouthY, mouthX + 6, mouthY - 3, SSD1306_WHITE);
      display.drawLine(mouthX + 6, mouthY - 3, mouthX + 12, mouthY + 2, SSD1306_WHITE);
      display.drawLine(mouthX + 12, mouthY + 2, mouthX + 18, mouthY - 3, SSD1306_WHITE);
      display.drawLine(mouthX + 18, mouthY - 3, mouthX + 24, mouthY, SSD1306_WHITE);
      break;
    case FaceMood::Sleepy:
      drawSoftEye(display, leftX, eyeY);
      drawSoftEye(display, rightX, eyeY);
      drawFlatMouth(display, mouthX, mouthY);
      display.setCursor(12, 9 - phase(1200, 3));
      display.print("z");
      display.setCursor(20, 5 - phase(1200, 3));
      display.print("Z");
      break;
    case FaceMood::Bright:
      drawSoftEye(display, leftX, eyeY);
      drawSoftEye(display, rightX, eyeY);
      drawSmile(display, mouthX, mouthY);
      drawSpark(display, 63, 13);
      break;
    case FaceMood::Offline:
      drawXEye(display, leftX, eyeY);
      drawXEye(display, rightX, eyeY);
      drawFrown(display, mouthX, mouthY);
      if (phase(1000, 2) == 0) display.drawLine(59, 11, 67, 19, SSD1306_WHITE);
      break;
    case FaceMood::Waiting:
      drawBlinkEye(display, leftX, eyeY, 4);
      drawBlinkEye(display, rightX, eyeY, 4);
      drawFlatMouth(display, mouthX, mouthY);
      display.setCursor(58, 14);
      for (int i = 0; i <= phase(1200, 4); i++) display.print(".");
      break;
    case FaceMood::SendIssue:
      drawBlinkEye(display, leftX, eyeY, 4);
      display.drawCircle(rightX, eyeY, 5, SSD1306_WHITE);
      drawFlatMouth(display, mouthX, mouthY);
      if (phase(900, 2) == 0) {
        display.setCursor(60, 11);
        display.print("?");
      }
      break;
    case FaceMood::SensorIssue:
      drawSoftEye(display, leftX, eyeY);
      display.drawCircle(rightX, eyeY, 5, SSD1306_WHITE);
      drawFrown(display, mouthX, mouthY);
      if (phase(800, 2) == 0) {
        display.setCursor(61, 11);
        display.print("!");
      }
      break;
  }
}

void drawBottomStatus(Adafruit_SSD1306 &display,
                      const SensorReading &reading,
                      const DisplayStatus &status) {
  display.drawLine(0, 55, 127, 55, SSD1306_WHITE);
  display.setCursor(0, 57);
  display.print("S");
  display.print(reading.soilPercent);
  display.print(" ");

  if (hasAirReading(reading)) {
    display.print("T");
    display.print(static_cast<int>(round(reading.airTempC)));
    display.print("C H");
    display.print(static_cast<int>(round(reading.airHumidityPercent)));
    display.print("%");
  } else {
    display.print("T-- H--");
  }

  display.print(" ");
  display.print(status.wifiConnected ? "W+" : "W-");
  display.print(" ");
  if (status.mqttEnabled) {
    display.print(status.mqttConnected ? "M+" : "M-");
  } else if (status.uploadEnabled) {
    display.print(status.lastUploadOk ? "U+" : "U-");
  } else {
    display.print("L");
  }
}
}  // namespace

void drawPlantFaceScreen(Adafruit_SSD1306 &display,
                         const SensorReading &reading,
                         const DisplayStatus &status) {
  const FaceFrame frame = chooseFaceFrame(reading, status);
  drawFace(display, frame);
  drawBubble(display, frame);
  drawBottomStatus(display, reading, status);
}
