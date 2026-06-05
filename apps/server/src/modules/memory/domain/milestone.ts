import type { EpisodeMemory } from "@dyn/shared";

export interface MilestoneMark {
  isMilestone: boolean;
  milestoneReason: string;
}

const exceptionalImportanceThreshold = 5;
const meaningfulTransitionPattern =
  /(第一次|首次|周年|生日|开花|发芽|新叶|换盆|搬家|搬到|移到|认领|接入|重逢|告别|康复|恢复生长|重新长出|重要决定|新工作|毕业|离职|住院|失去|离开)/i;
const routineSensorSourcePattern = /^(sensor:|rule:closed_sensor_episode)/i;

const memoryText = (memory: EpisodeMemory): string =>
  [memory.title, memory.content, memory.keywords.join(" "), memory.sourceType].join("\n");

export const deriveMilestoneMark = (memory: EpisodeMemory): MilestoneMark => {
  if (routineSensorSourcePattern.test(memory.sourceType)) {
    return { isMilestone: false, milestoneReason: "" };
  }

  if (memory.importance >= exceptionalImportanceThreshold) {
    return { isMilestone: true, milestoneReason: "难得的重要时刻" };
  }

  if (memory.importance >= 4 && meaningfulTransitionPattern.test(memoryText(memory))) {
    return { isMilestone: true, milestoneReason: "真正发生了转折" };
  }

  return { isMilestone: false, milestoneReason: "" };
};

export const withMilestoneMark = (memory: EpisodeMemory): EpisodeMemory => ({
  ...memory,
  ...deriveMilestoneMark(memory)
});
