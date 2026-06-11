import type { CareRecordSource, CareRecordType } from "@dyn/shared";
import { api } from "@/lib/api";

/** 快捷动作文案 → 养护记录类型。用于把「一键浇水」「已施肥」等动作落进养护记录。 */
const LABEL_TO_TYPE: Array<{ match: RegExp; type: CareRecordType }> = [
  { match: /浇水|淋水|喝水/, type: "water" },
  { match: /施肥|肥料/, type: "fertilize" },
  { match: /修剪|剪枝|打理/, type: "prune" },
  { match: /晒太阳|光照|日照/, type: "sunlight" },
  { match: /换盆|移盆/, type: "repot" }
];

export const careTypeFromLabel = (label: string): CareRecordType | null => {
  for (const { match, type } of LABEL_TO_TYPE) {
    if (match.test(label)) return type;
  }
  return null;
};

/**
 * 记录一次养护动作：写入结构化养护记录。
 * 静默失败（由调用方决定如何提示），返回是否成功。
 */
export const logCareRecord = async (
  plantId: string,
  type: CareRecordType,
  source: CareRecordSource,
  note?: string
): Promise<boolean> => {
  try {
    await api.createCareRecord(plantId, { type, source, note });
    return true;
  } catch {
    return false;
  }
};
