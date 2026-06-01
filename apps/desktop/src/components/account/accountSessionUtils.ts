export const formatSessionTime = (value: string): string =>
  new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });

export const avatarGradientFor = (value: string): string => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  const gradients = [
    "from-primary/25 via-secondary/15 to-primary-fixed-dim/20 text-primary-container border-primary-container/10",
    "from-secondary/25 via-primary-container/20 to-secondary-fixed/20 text-on-secondary-fixed-variant border-secondary/10",
    "from-tertiary-fixed-dim/35 via-tertiary/10 to-primary/15 text-on-tertiary-fixed-variant border-tertiary/10",
    "from-primary-fixed/35 via-secondary/15 to-secondary-fixed-dim/25 text-on-primary-fixed-variant border-secondary-fixed-dim/15"
  ];
  return gradients[Math.abs(hash) % gradients.length];
};

export const parseUserAgent = (userAgent: string) => {
  const lower = userAgent.toLowerCase();
  let icon = "globe";
  let deviceName = "未知设备";

  if (lower.includes("iphone")) {
    icon = "smartphone";
    deviceName = "iPhone 手机";
  } else if (lower.includes("ipad")) {
    icon = "smartphone";
    deviceName = "iPad 平板";
  } else if (lower.includes("android")) {
    icon = "smartphone";
    deviceName = "Android 手机";
  } else if (lower.includes("windows")) {
    icon = "monitor";
    deviceName = "Windows PC";
  } else if (lower.includes("macintosh") || lower.includes("mac os x")) {
    icon = "monitor";
    deviceName = "macOS 电脑";
  } else if (lower.includes("linux")) {
    icon = "monitor";
    deviceName = "Linux PC";
  }

  let browser = "";
  if (lower.includes("edg/")) {
    browser = "Edge";
  } else if (lower.includes("chrome/") && !lower.includes("chromium")) {
    browser = "Chrome";
  } else if (lower.includes("safari/") && !lower.includes("chrome/")) {
    browser = "Safari";
  } else if (lower.includes("firefox/")) {
    browser = "Firefox";
  }

  return {
    icon,
    label: browser ? `${deviceName} (${browser})` : deviceName
  };
};
