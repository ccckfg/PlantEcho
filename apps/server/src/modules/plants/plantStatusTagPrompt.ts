import type { PlantSummary } from "@dyn/shared";
import type { LayeredPlantState } from "@dyn/shared";

export const statusTagSystemPrompt = `
你为植物生成 1 到 2 个短状态标签。
这些标签表达较长期、较稳定的植物状态感，不是一秒一变的传感器瞬时读数。
只输出 JSON：{"tags":["标签1","标签2"]}。
规则：
- 每个标签 2 到 4 个中文字符。
- 不要和主标签重复。
- 不要输出解释、标点或 Markdown。
- 如果没有足够依据，输出 {"tags":[]}。
- 不要把离线设备的旧读数当作当前身体事实。
- 不要生成恐慌、催促、诊断式标签。
`.trim();

export const buildStatusTagPrompt = (
  plant: PlantSummary,
  state: LayeredPlantState,
  primaryLabel: string
): string => JSON.stringify({
  task: "generate_stable_secondary_status_tags",
  primaryLabel,
  plant: {
    name: plant.name,
    species: plant.species,
    backgroundInfo: plant.backgroundInfo
  },
  physical: {
    connection: state.physical.connection,
    lastReadingAt: state.physical.lastReadingAt,
    facts: state.physical.facts,
    issues: state.physical.issues.map((issue) => issue.label)
  },
  inner: {
    mood: state.inner.mood,
    concern: state.inner.concern,
    thought: state.inner.thought
  },
  relationship: {
    stage: state.relationship.stage,
    summary: state.relationship.summary
  },
  constraints: [
    "secondary tags describe stable recent state, not real-time sensor swings",
    "if connection is offline, do not infer current thirst or current sunlight from old readings",
    "return empty tags when uncertain"
  ]
});
