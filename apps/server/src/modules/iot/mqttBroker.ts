import net from "node:net";
import { Aedes } from "aedes";
import { env } from "../../config/env.js";
import { isAuthorizedDevice, isKnownDevice } from "../devices/deviceService.js";
import { registerDeviceConfigPublisher } from "./deviceConfigChannel.js";
import { deviceConfigTopic, deviceIdFromConfigTopic, deviceIdFromReadingsTopic } from "./mqttTopics.js";
import { ingestMqttReading } from "./mqttIngest.js";
import type { DeviceConfigPayload } from "./deviceConfigTypes.js";

interface MqttLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

interface ClientAuthState {
  deviceId: string;
  mode: "pending" | "claimed";
}

const passwordText = (password?: Buffer): string | undefined =>
  password ? password.toString("utf8") : undefined;

export const createMqttBroker = (logger: MqttLogger) => {
  const broker = new Aedes();
  const server = net.createServer(broker.handle);
  const clientAuth = new Map<string, ClientAuthState>();

  broker.authenticate = (client, username, password, callback) => {
    const deviceId = username?.toString();
    if (!deviceId) {
      logger.warn(`MQTT auth rejected: missing username for client ${client.id}`);
      callback(null, false);
      return;
    }
    if (!isKnownDevice(deviceId)) {
      clientAuth.set(client.id, { deviceId, mode: "pending" });
      logger.info(`MQTT pending client connected: ${deviceId}`);
      callback(null, true);
      return;
    }
    const authorized = isAuthorizedDevice(deviceId, passwordText(password));
    if (authorized) clientAuth.set(client.id, { deviceId, mode: "claimed" });
    const passwordState = password?.length ? "present" : "missing";
    logger.info(
      `MQTT claimed client ${authorized ? "connected" : "rejected"}: ${deviceId} (password=${passwordState})`
    );
    callback(null, authorized);
  };

  broker.authorizePublish = (client, packet, callback) => {
    const topicDeviceId = deviceIdFromReadingsTopic(packet.topic);
    const auth = client ? clientAuth.get(client.id) : undefined;
    const stillAllowed = topicDeviceId && auth?.deviceId === topicDeviceId &&
      (!isKnownDevice(topicDeviceId) || auth.mode === "claimed");
    if (stillAllowed) {
      logger.info(`MQTT publish accepted: ${packet.topic}`);
      callback(null);
      return;
    }
    logger.warn(
      `MQTT publish rejected: topic=${packet.topic}, client=${auth?.deviceId ?? "unknown"}`
    );
    callback(new Error("MQTT client cannot publish to this topic"));
  };

  broker.authorizeSubscribe = (client, subscription, callback) => {
    const topicDeviceId = deviceIdFromConfigTopic(subscription.topic);
    const auth = client ? clientAuth.get(client.id) : undefined;
    if (topicDeviceId && auth?.deviceId === topicDeviceId) {
      callback(null, subscription);
      return;
    }
    logger.warn(
      `MQTT subscribe rejected: topic=${subscription.topic}, client=${auth?.deviceId ?? "unknown"}`
    );
    callback(new Error("MQTT client cannot subscribe to this topic"));
  };

  broker.on("clientDisconnect", (client) => {
    clientAuth.delete(client.id);
  });

  broker.on("publish", (packet, client) => {
    if (!client) return;
    const deviceId = deviceIdFromReadingsTopic(packet.topic);
    if (!deviceId) return;
    try {
      const payload = Buffer.isBuffer(packet.payload)
        ? packet.payload
        : Buffer.from(String(packet.payload));
      const result = ingestMqttReading(deviceId, payload);
      logger.info(`MQTT reading ${result.status}: ${deviceId}`);
    } catch (error) {
      logger.warn(`MQTT reading rejected for ${deviceId}: ${(error as Error).message}`);
    }
  });

  return {
    start: async () => {
      if (!env.MQTT_ENABLED) return;
      registerDeviceConfigPublisher((deviceId: string, payload: DeviceConfigPayload) => {
        const online = Array.from(clientAuth.values())
          .some((state) => state.deviceId === deviceId);
        if (!online) return false;
        const topic = deviceConfigTopic(deviceId);
        broker.publish({
          cmd: "publish",
          topic,
          payload: Buffer.from(JSON.stringify(payload)),
          qos: 1,
          dup: false,
          retain: false
        }, (error) => {
          if (error) {
            logger.warn(`MQTT config publish failed for ${deviceId}: ${error.message}`);
          } else {
            logger.info(`MQTT config published: ${topic}`);
          }
        });
        return true;
      });
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen(env.MQTT_PORT, env.MQTT_HOST, () => {
          server.off("error", reject);
          logger.info(`MQTT broker listening on ${env.MQTT_HOST}:${env.MQTT_PORT}`);
          resolve();
        });
      });
    },
    stop: async () => {
      registerDeviceConfigPublisher(null);
      await new Promise<void>((resolve) => broker.close(() => resolve()));
      if (server.listening) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    }
  };
};
