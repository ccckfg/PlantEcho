#include "config_portal.h"

#include <DNSServer.h>
#include <WebServer.h>
#include <WiFi.h>

#include "config.h"
#include "display_view.h"

namespace {
DNSServer dnsServer;
WebServer server(80);
constexpr byte DNS_PORT = 53;

String htmlEscape(const String &value) {
  String escaped = value;
  escaped.replace("&", "&amp;");
  escaped.replace("\"", "&quot;");
  escaped.replace("<", "&lt;");
  escaped.replace(">", "&gt;");
  return escaped;
}

String apName() {
  const String mac = WiFi.macAddress();
  return "PlantEcho-" + mac.substring(mac.length() - 5);
}

String page(const DeviceSettings &settings) {
  String body = F("<!doctype html><html><head><meta charset='utf-8'>"
                  "<meta name='viewport' content='width=device-width,initial-scale=1'>"
                  "<title>PlantEcho Setup</title><style>"
                  "body{font-family:system-ui;margin:24px;max-width:560px}"
                  "label{display:block;margin:12px 0 4px}input{width:100%;padding:10px}"
                  "button{margin-top:18px;padding:12px 16px}</style></head><body>"
                  "<h1>PlantEcho Setup</h1><form method='post' action='/save'>");
  body += "<label>2.4GHz Wi-Fi SSID</label><input name='ssid' value='" +
          htmlEscape(settings.wifiSsid) + "' required>";
  body += "<label>Wi-Fi Password</label><input name='pass' type='password' value='" +
          htmlEscape(settings.wifiPassword) + "'>";
  body += "<label>MQTT Host</label><input name='mqttHost' value='" +
          htmlEscape(settings.mqttHost) + "' required>";
  body += "<label>MQTT Port</label><input name='mqttPort' type='number' value='" +
          String(settings.mqttPort) + "' required>";
  body += "<label>HTTP Server Base URL</label><input name='serverUrl' value='" +
          htmlEscape(settings.serverBaseUrl) + "'>";
  body += "<label>Device ID</label><input name='deviceId' value='" +
          htmlEscape(settings.deviceId) + "' required>";
  body += "<label>Server User ID</label><input name='userId' value='" +
          htmlEscape(settings.serverUserId) +
          "'><p style='color:#555'>Optional: helps the server show this unclaimed device to the right account.</p>";
  body += "<label>Device API Key</label><input name='apiKey' value='" +
          htmlEscape(settings.deviceApiKey) +
          "'><p style='color:#555'>Optional: after claiming, the server can send this key automatically over MQTT.</p>";
  body += "<label>OTA Manifest URL</label><input name='otaUrl' value='" +
          htmlEscape(settings.otaManifestUrl) + "'>";
  body += F("<button type='submit'>Save and reboot</button></form></body></html>");
  return body;
}

void bindRoutes(DeviceSettings &settings) {
  server.on("/", HTTP_GET, [&settings]() { server.send(200, "text/html", page(settings)); });
  server.on("/save", HTTP_POST, [&settings]() {
    settings.wifiSsid = server.arg("ssid");
    settings.wifiPassword = server.arg("pass");
    settings.serverBaseUrl = server.arg("serverUrl");
    settings.mqttHost = server.arg("mqttHost");
    settings.mqttPort = static_cast<uint16_t>(server.arg("mqttPort").toInt());
    settings.deviceId = server.arg("deviceId");
    settings.serverUserId = server.arg("userId");
    settings.deviceApiKey = server.arg("apiKey");
    settings.otaManifestUrl = server.arg("otaUrl");
    saveSettings(settings);
    renderConfigSaved();
    server.send(200, "text/html", "<p>Saved. Rebooting...</p>");
    delay(800);
    ESP.restart();
  });
  server.onNotFound([&settings]() { server.send(200, "text/html", page(settings)); });
}

}  // namespace

bool configButtonHeldLongEnough() {
  pinMode(CONFIG_BUTTON_PIN, INPUT_PULLUP);
  delay(20);
  if (digitalRead(CONFIG_BUTTON_PIN) != LOW) {
    return false;
  }

  const unsigned long start = millis();
  Serial.println("BOOT held. Keep holding to enter setup portal...");
  while (millis() - start < CONFIG_BUTTON_HOLD_MS) {
    renderConfigHoldProgress(millis() - start, CONFIG_BUTTON_HOLD_MS);
    if (digitalRead(CONFIG_BUTTON_PIN) != LOW) {
      Serial.println("BOOT released. Continuing normal boot.");
      return false;
    }
    delay(25);
  }
  Serial.println("Setup portal requested by long BOOT press.");
  return true;
}

bool shouldStartConfigPortal(const DeviceSettings &settings) {
  if (!ENABLE_CONFIG_PORTAL) return false;
  return configButtonHeldLongEnough() || !hasWifiSettings(settings) ||
         (ENABLE_MQTT && !hasMqttSettings(settings)) || !hasDeviceIdentity(settings);
}

void startConfigPortal(DeviceSettings &settings) {
  WiFi.mode(WIFI_AP);
  const String ssid = apName();
  WiFi.softAP(ssid.c_str());
  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());
  bindRoutes(settings);
  server.begin();
  renderConfigPortal(ssid, WiFi.softAPIP());

  Serial.print("Config portal started: ");
  Serial.print(ssid);
  Serial.print(" at http://");
  Serial.println(WiFi.softAPIP());

  while (true) {
    dnsServer.processNextRequest();
    server.handleClient();
    delay(10);
  }
}
