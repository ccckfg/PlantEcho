#pragma once

#include "settings.h"

bool shouldStartConfigPortal(const DeviceSettings &settings);
bool configButtonHeldLongEnough();
void startConfigPortal(DeviceSettings &settings);
