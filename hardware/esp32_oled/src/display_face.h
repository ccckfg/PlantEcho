#pragma once

#include <Adafruit_SSD1306.h>

#include "display_view.h"
#include "readings.h"

void drawPlantFaceScreen(Adafruit_SSD1306 &display,
                         const SensorReading &reading,
                         const DisplayStatus &status);
