import type { EpisodeMemory } from "@dyn/shared";

export interface MilestoneMark {
  isMilestone: boolean;
  milestoneReason: string;
}

const highImportanceThreshold = 4;
const transitionPattern =
  /(第一次|首次|接入|上报|搬到|移到|换盆|修剪|施肥|恢复|好转|恶化|缺水|偏干|偏湿|过湿|光照|温度|湿度|离线|异常|转折|阶段)/i;
const sourceTypePattern = /^(sensor:|rule:closed_sensor_episode|hardware:|care:)/i;

const memoryText = (memory: EpisodeMemory): string =>
  [memory.title, memory.content, memory.keywords.join(" "), memory.sourceType].join("\n");

export const deriveMilestoneMark = (memory: EpisodeMemory): MilestoneMark => {
  if (memory.importance >= highImportanceThreshold) {
    return { isMilestone: true, milestoneReason: "高重要度记忆" };
  }

  if (sourceTypePattern.test(memory.sourceType)) {
    return { isMilestone: true, milestoneReason: "状态转折事件" };
  }

  if (transitionPattern.test(memoryText(memory))) {
    return { isMilestone: true, milestoneReason: "成长状态变化" };
  }

  return { isMilestone: false, milestoneReason: "" };
};

export const withMilestoneMark = (memory: EpisodeMemory): EpisodeMemory => ({
  ...memory,
  ...deriveMilestoneMark(memory)
});
