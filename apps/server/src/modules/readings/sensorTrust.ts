import { recentMessages } from "../chat/messageRepository.js";

export interface SensorTrust {
  trusted: boolean;
  reason: string;
  sourceMessageId: number | null;
}

const sensorMention = /(传感器|探头|设备|读数|数据)/;
const untrustedSignal =
  /(没|未|没有).{0,8}(插|接|连接|放进土)|不真实|不可信|不准|假的|模拟数据|测试数据|放在桌|摆在桌|坏了|故障/;
const trustedSignal =
  /插好了|接好了|重新插|重新接|已插入|已经插入|已接入|已经接入|恢复正常|现在真实|真实数据|现在可信|现在准了|已经连接/;

const trustFromText = (text: string): boolean | null => {
  if (!sensorMention.test(text)) return null;
  if (untrustedSignal.test(text)) return false;
  if (trustedSignal.test(text)) return true;
  return null;
};

export const getSensorTrust = (plantId: string): SensorTrust => {
  const messages = recentMessages(plantId, 40);
  for (const message of [...messages].reverse()) {
    if (message.role !== "user") continue;
    const trusted = trustFromText(message.content);
    if (trusted === null) continue;
    return {
      trusted,
      reason: trusted
        ? "主人最近确认传感器已经恢复可信"
        : `主人最近说明传感器读数不可信：${message.content.slice(0, 80)}`,
      sourceMessageId: message.id
    };
  }
  return { trusted: true, reason: "没有发现读数不可信的说明", sourceMessageId: null };
};
