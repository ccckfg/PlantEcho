export const proactivePresenceHeartbeatMs = 45_000;

export const talkativenessOptions = [
  {
    value: "quiet",
    label: "安静",
    detail: "每天约 1 次",
    icon: "bedtime"
  },
  {
    value: "moderate",
    label: "适中",
    detail: "每天约 2 次",
    icon: "eco"
  },
  {
    value: "active",
    label: "活跃",
    detail: "每天约 4 次",
    icon: "auto_awesome"
  }
] as const;

export type Talkativeness = (typeof talkativenessOptions)[number]["value"];
