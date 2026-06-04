import net from "node:net";
import { Aedes } from "aedes";
import { deviceConfigDeliveryConfig } from "../../config/deviceConfigDelivery.js";
import { env } from "../../config/env.js";
import {
  confirmDeviceCredentialsDelivered,
  deliverPendingDeviceConfig,
  hasPendingDeviceCredentials,
  isAuthorizedDevice,
  isKnownDevice
} from "../devices/deviceService.js";
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
  mode: "pending" | "claimed" | "config";
  configSubscribed: boolean;
}

const passwordText = (password?: Buffer): string | undefined =>
  password ? password.toString("utf8") : undefined;

export const createMqttBroker = (logger: MqttLogger) => {
  const broker = new Aedes();
  const server = net.createServer(broker.handle);
  const clientAuth = new Map<string, ClientAuthState>();
  let retryTimer: ReturnType<typeof setInterval> | null = null;

  const hasConfigSubscriber = (deviceId: string): boolean =>
    Array.from(clientAuth.values())
      .some((state) => state.deviceId === deviceId && state.configSubscribed);

  const attemptPendingConfigDelivery = (deviceId: string): boolean => {
    if (!hasConfigSubscriber(deviceId)) return false;
    return deliverPendingDeviceConfig(deviceId);
  };

  const retryPendingConfigsForSubscribers = (): void => {
    const deviceIds = new Set(
      Array.from(clientAuth.values())
        .filter((state) => state.configSubscribed && hasPendingDeviceCredentials(state.deviceId))
        .map((state) => state.deviceId)
    );
    for (const deviceId of deviceIds) attemptPendingConfigDelivery(deviceId);
  };

  broker.authenticate = (client, username, password, callback) => {
    const deviceId = username?.toString();
    if (!deviceId) {
      logger.warn(`MQTT auth rejected: missing username for client ${client.id}`);
      callback(null, false);
      return;
    }
    if (!isKnownDevice(deviceId)) {
      clientAuth.set(client.id, { deviceId, mode: "pending", configSubscribed: false });
      logger.info(`MQTT pending client connected: ${deviceId}`);
      callback(null, true);
      return;
    }
    const authorized = isAuthorizedDevice(deviceId, passwordText(password));
    const passwordState = password?.length ? "present" : "missing";
    if (authorized) {
      clientAuth.set(client.id, { deviceId, mode: "claimed", configSubscribed: false });
      confirmDeviceCredentialsDelivered(deviceId);
      logger.info(`MQTT claimed client connected: ${deviceId} (password=${passwordState})`);
      callback(null, true);
      return;
    }
    if (!password?.length || hasPendingDeviceCredentials(deviceId)) {
      clientAuth.set(client.id, { deviceId, mode: "config", configSubscribed: false });
      logger.info(`MQTT claimed client config-only: ${deviceId} (password=${passwordState})`);
      callback(null, true);
      return;
    }
    logger.info(`MQTT claimed client rejected: ${deviceId} (password=${passwordState})`);
    callback(null, false);
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
      auth.configSubscribed = true;
      callback(null, subscription);
      setTimeout(() => attemptPendingConfigDelivery(topicDeviceId), 0);
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
      await broker.listen();
      registerDeviceConfigPublisher((deviceId: string, payload: DeviceConfigPayload) => {
        const online = Array.from(clientAuth.values())
          .some((state) => state.deviceId === deviceId && state.configSubscribed);
        if (!online) return false;
        const topic = deviceConfigTopic(deviceId);
        try {
          broker.publish({
            cmd: "publish",
            topic,
            payload: Buffer.from(JSON.stringify(payload)),
            qos: 0,
            dup: false,
            retain: false
          }, (error) => {
            if (error) {
              logger.warn(`MQTT config publish failed for ${deviceId}: ${error.message}`);
            } else {
              logger.info(`MQTT config published: ${topic}`);
            }
          });
        } catch (error) {
          logger.warn(`MQTT config publish failed for ${deviceId}: ${(error as Error).message}`);
          return false;
        }
        return true;
      });
      retryTimer = setInterval(
        retryPendingConfigsForSubscribers,
        deviceConfigDeliveryConfig.retryIntervalMs
      );
      retryTimer.unref?.();
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
      if (retryTimer) {
        clearInterval(retryTimer);
        retryTimer = null;
      }
      await new Promise<void>((resolve) => broker.close(() => resolve()));
      if (server.listening) {
        await new Promise<void>((resolve) => server.close(() => resolve()));
      }
    }
  };
};
