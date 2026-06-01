# ESP32 Hardware Firmware

This firmware reads the currently connected OLED, SHT40, GY-302/BH1750 light
sensor, and capacitive soil moisture sensor. It supports SoftAP setup, MQTT
telemetry, OTA firmware updates, and an HTTP upload fallback.

## Wiring

Keep the expansion board power jumper on `3V3`.

### OLED, SHT40, and GY-302/BH1750

These modules share the same I2C bus:

```text
OLED/SHT40/GY-302 VCC or VDD -> 3V3 / VCC
OLED/SHT40/GY-302 GND        -> GND
OLED/SHT40/GY-302 SCL        -> D22
OLED/SHT40/GY-302 SDA        -> D21
```

Your SHT40 pin order is `VDD, GND, SCL, SDA`, so connect it one wire at a time.
Your GY-302 pin order is usually `VCC, GND, SCL, SDA, ADDR`. Leave `ADDR`
unconnected for the default `0x23` address.

Expected I2C scan addresses:

```text
OLED          -> 0x3C or 0x3D
SHT40         -> 0x44
GY-302/BH1750 -> 0x23 when ADDR is floating, or 0x5C when ADDR is high
```

If the serial log shows `I2C bus stuck` and `SCL22=LOW`, one I2C module or wire
is pulling the clock line down. Power off first, then test with only the OLED,
add SHT40, and finally add GY-302.

### Soil Moisture Sensor

Plug the three-wire sensor into the `D34` row on the expansion board:

```text
Black  -> GND
Red    -> VCC / 3V3
Yellow -> D34
```

## Configuration Portal

On first boot, when saved Wi-Fi/MQTT settings are missing, or when the BOOT
button (`GPIO0`) is held for about 3 seconds while the firmware is running, the
ESP32 starts a SoftAP setup portal:

```text
SSID: PlantEcho-xx:xx
URL:  http://192.168.4.1
```

The OLED shows a BOOT hold progress bar while entering setup mode, then shows
the setup SSID and URL while the portal is running.

## OLED Face Display

During normal operation the OLED is intentionally expression-first instead of
showing a dense sensor table. The upper area shows a large frameless plant
expression, a short speech bubble, and a compact bottom status line:

```text
S57 T24C H54% W+ M+
```

- `S` is soil moisture percentage.
- `T` is air temperature from SHT40.
- `H` is air humidity from SHT40.
- `W+` / `W-` is Wi-Fi connected / disconnected.
- `M+` / `M-` is MQTT connected / disconnected.
- `U+` / `U-` is HTTP fallback upload success / failure when MQTT is disabled.
- `L` means local display only; no upload path is configured.

The face changes by priority:

- Wi-Fi disconnected while upload is configured: X eyes + worried mouth,
  flashing broken link mark, `WiFi lost`.
- MQTT configured but not connected: round waiting eyes + flat mouth,
  cycling `.` / `..` / `...`, `MQTT wait`.
- SHT40 and light sensor both missing: uneven confused eyes + frown,
  blinking `!`, `Sensor check`.
- Soil below `DISPLAY_SOIL_THIRSTY_PERCENT`: droopy eyes + frown,
  falling water drop, `I am thirsty`.
- Soil above `DISPLAY_SOIL_SOGGY_PERCENT`: tired eyes + flat mouth,
  moving water waves, `Too wet`.
- Temperature above `DISPLAY_TEMP_HOT_C`: strained eyes + open mouth,
  falling sweat drop, `So hot`.
- Temperature below `DISPLAY_TEMP_COLD_C`: small eyes + shaking zigzag mouth,
  1px horizontal shiver, `So cold`.
- Light below `DISPLAY_LIGHT_DARK_LUX`: sleepy eyes + flat mouth,
  floating `Z z`, `Need sun`.
- Light above `DISPLAY_LIGHT_BRIGHT_LUX`: squinting eyes + smile,
  twinkling spark, `Too bright`.
- Recent MQTT/HTTP publish failure: one round eye + one alert eye,
  blinking `?`, `Send again`.
- Otherwise: happy eyes + smile, gentle bobbing sprout and periodic blink,
  `I feel good`.

The display refreshes every `DISPLAY_INTERVAL_MS` (`250ms`) for small animation
details. Sensor sampling and MQTT publish intervals stay at 1 second by default.

The default SSD1306 font is ASCII-only, so the bubble text is short English.
Chinese bubble text needs a separate bitmap font table to render reliably on
the 128x64 monochrome screen.

Use the portal to save:

- 2.4GHz Wi-Fi SSID and password.
- MQTT host and port. Use the LAN IP of the computer running the server, not
  `127.0.0.1`.
- Device ID.
- Device API Key is optional during first setup. If the device is online when
  the desktop app claims it, the server sends the generated key over MQTT and
  the ESP32 saves it to NVS automatically.
- Optional HTTP server base URL for fallback upload.
- Optional OTA manifest URL.

Settings are persisted in ESP32 NVS/Preferences, so network/server changes no
longer require rebuilding the firmware. Compile-time defaults can still be put
in `src/local_config.h`; this file is ignored by git.

The server needs to listen on the LAN for both HTTP and MQTT, for example:

```env
HOST=0.0.0.0
PORT=8787
MQTT_ENABLED=true
MQTT_HOST=0.0.0.0
MQTT_PORT=1883
```

## Soil Calibration

The default calibration is only a starting point:

```cpp
constexpr int SOIL_RAW_DRY = 3200;
constexpr int SOIL_RAW_WET = 1300;
```

Open the serial monitor, record the dry-air value and wet-soil value, then
replace these constants. Higher raw values usually mean drier soil on this
sensor.

## MQTT Telemetry

The primary telemetry path is MQTT. The firmware publishes once per sensor
sample by default (`MQTT_PUBLISH_INTERVAL_MS = 1000`):

```text
topic: dyn/devices/:deviceId/readings
username: :deviceId
password: DEVICE_API_KEY after claim, empty before claim
```

The firmware also subscribes to its private config topic:

```text
topic: dyn/devices/:deviceId/config
```

When the server publishes a `device.credentials` payload after claim or key
rotation, the ESP32 stores the new API key and reconnects with credentials.

SHT40, soil, and GY-302/BH1750 light fields are filled when the sensors are
detected. `lightLux` is sent as `null` only if the light sensor is missing.

An unknown device can publish without a password and will appear in the desktop
app as pending. After claiming it, an online device should receive the generated
API key automatically. The key is still shown once in the desktop app as a
manual fallback for offline devices. Claimed devices must authenticate with that
key.

HTTP upload remains available as a fallback when `DYN_ENABLE_HTTP_UPLOAD` is
true. It posts the same payload to:

```text
POST /api/v1/devices/:deviceId/readings
```

## OTA Updates

If an OTA manifest URL is configured, the device checks it at boot and then once
per hour:

```json
{
  "version": "0.2.1",
  "url": "firmware.bin"
}
```

`url` may be absolute or relative to the manifest URL. When `version` differs
from `DYN_FIRMWARE_VERSION`, the ESP32 downloads the binary and reboots into the
new firmware.
