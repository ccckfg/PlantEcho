export const mqttTopics = {
  deviceReadingsPrefix: "dyn/devices/",
  deviceReadingsSuffix: "/readings",
  deviceConfigSuffix: "/config"
};

const deviceIdFromTopic = (topic: string, suffix: string): string | null => {
  if (!topic.startsWith(mqttTopics.deviceReadingsPrefix) || !topic.endsWith(suffix)) {
    return null;
  }
  const start = mqttTopics.deviceReadingsPrefix.length;
  const end = topic.length - suffix.length;
  const deviceId = topic.slice(start, end);
  return deviceId.length > 0 ? deviceId : null;
};

export const deviceConfigTopic = (deviceId: string): string =>
  `${mqttTopics.deviceReadingsPrefix}${deviceId}${mqttTopics.deviceConfigSuffix}`;

export const deviceIdFromReadingsTopic = (topic: string): string | null => {
  return deviceIdFromTopic(topic, mqttTopics.deviceReadingsSuffix);
};

export const deviceIdFromConfigTopic = (topic: string): string | null => {
  return deviceIdFromTopic(topic, mqttTopics.deviceConfigSuffix);
};
