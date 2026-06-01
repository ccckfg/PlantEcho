import type { CareProfile } from "@dyn/shared";
import type { PlantHealthIssue, PlantHealthSummary, SensorReading } from "./types.js";
import { formatReadingAge, isReadingOffline, readingAgeMs } from "./freshness.js";

const pushIssue = (
  issues: PlantHealthIssue[],
  code: string,
  severity: PlantHealthIssue["severity"],
  label: string,
  detail: string
): void => {
  issues.push({ code, severity, label, detail });
};

export const evaluateReading = (
  profile: CareProfile,
  latest: SensorReading | null,
  now: Date | number = Date.now()
): PlantHealthSummary => {
  if (!latest) {
    return {
      overall: "watch",
      mood: "还在等待第一条读数",
      issues: [],
      facts: ["暂无传感器数据"],
      advice: "先让设备上传一次读数，我再判断水分、光照和温湿度。"
    };
  }

  if (isReadingOffline(latest, now)) {
    const age = formatReadingAge(readingAgeMs(latest, now));
    return {
      overall: "risk",
      mood: "传感器离线",
      issues: [
        {
          code: "sensor_offline",
          severity: "critical",
          label: "传感器离线",
          detail: `已超过 ${age} 未收到新上报，不能把最后一次读数当作当前状态`
        }
      ],
      facts: [
        "当前没有实时传感器数据",
        `最后一次成功上报在 ${age} 前`,
        "不要使用最后一次读数判断当前水分、光照、温度或湿度"
      ],
      advice: "先检查 ESP32 供电、Wi-Fi、后端地址和设备上传日志，恢复上报后再判断植物状态。"
    };
  }

  const issues: PlantHealthIssue[] = [];
  const facts: string[] = [];
  if (latest.soilPercent !== null) {
    facts.push(`土壤湿度 ${latest.soilPercent.toFixed(0)}%`);
    if (latest.soilPercent < profile.soil.min) {
      pushIssue(issues, "soil_low", "warning", "土壤偏干", `低于建议下限 ${profile.soil.min}%`);
    }
    if (latest.soilPercent > profile.soil.max) {
      pushIssue(issues, "soil_high", "warning", "土壤偏湿", `高于建议上限 ${profile.soil.max}%`);
    }
  }
  if (latest.lightLux !== null) {
    facts.push(`光照 ${latest.lightLux.toFixed(0)} lux`);
    if (latest.lightLux < profile.light.minLux) {
      pushIssue(issues, "light_low", "warning", "光照偏弱", `低于建议下限 ${profile.light.minLux} lux`);
    }
    if (latest.lightLux > profile.light.maxLux) {
      pushIssue(issues, "light_high", "warning", "光照过强", `高于建议上限 ${profile.light.maxLux} lux`);
    }
  }
  if (latest.airTempC !== null) {
    facts.push(`气温 ${latest.airTempC.toFixed(1)}°C`);
    if (latest.airTempC < profile.temperature.minC || latest.airTempC > profile.temperature.maxC) {
      pushIssue(issues, "temperature_out", "warning", "温度不舒适", "超出当前植物的建议温度范围");
    }
  }
  if (latest.airHumidityPercent !== null) {
    facts.push(`空气湿度 ${latest.airHumidityPercent.toFixed(0)}%`);
    if (latest.airHumidityPercent < profile.humidity.min) {
      pushIssue(issues, "humidity_low", "info", "空气偏干", `低于建议下限 ${profile.humidity.min}%`);
    }
  }

  const hasCritical = issues.some((issue) => issue.severity === "critical");
  const overall = hasCritical ? "risk" : issues.length ? "watch" : "healthy";
  return {
    overall,
    mood: overall === "healthy" ? "舒服" : "有点在意环境变化",
    issues,
    facts,
    advice: issues[0]?.detail ?? "当前读数落在建议范围内，继续保持观察就好。"
  };
};
