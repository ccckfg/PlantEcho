import { z } from "zod";

/**
 * 养护记录类型。每一项对应用户对植物的一次照料动作。
 * key 用于数据库存储与图标/文案映射，顺序即面板里快捷按钮的展示顺序。
 */
export const CARE_RECORD_TYPES = [
  { key: "water", label: "浇水", icon: "water_drop" },
  { key: "fertilize", label: "施肥", icon: "eco" },
  { key: "prune", label: "修剪", icon: "content_cut" },
  { key: "sunlight", label: "晒太阳", icon: "light_mode" },
  { key: "repot", label: "换盆", icon: "potted_plant" },
  { key: "other", label: "其他", icon: "edit_note" }
] as const;

export type CareRecordType = (typeof CARE_RECORD_TYPES)[number]["key"];

export const CARE_RECORD_TYPE_KEYS = CARE_RECORD_TYPES.map((item) => item.key) as [
  CareRecordType,
  ...CareRecordType[]
];

export const careRecordTypeSchema = z.enum(CARE_RECORD_TYPE_KEYS);

export const CARE_RECORD_NOTE_MAX_LENGTH = 200;
export const careRecordNoteSchema = z.string().trim().max(CARE_RECORD_NOTE_MAX_LENGTH);

/** 来源：用户在面板手动添加 / 主页一键浇水 / 聊天里的快捷记录。 */
export const careRecordSourceSchema = z.enum(["panel", "dashboard", "chat"]);
export type CareRecordSource = z.infer<typeof careRecordSourceSchema>;

export const createCareRecordSchema = z.object({
  type: careRecordTypeSchema,
  note: careRecordNoteSchema.optional(),
  source: careRecordSourceSchema.optional(),
  performedAt: z.string().datetime().optional()
});

export type CreateCareRecordInput = z.infer<typeof createCareRecordSchema>;

export interface CareRecord {
  id: string;
  plantId: string;
  type: CareRecordType;
  note: string;
  source: CareRecordSource;
  performedAt: string;
  createdAt: string;
}

const CARE_RECORD_TYPE_META: Record<CareRecordType, { label: string; icon: string }> =
  Object.fromEntries(
    CARE_RECORD_TYPES.map((item) => [item.key, { label: item.label, icon: item.icon }])
  ) as Record<CareRecordType, { label: string; icon: string }>;

export const careRecordTypeLabel = (type: CareRecordType): string =>
  CARE_RECORD_TYPE_META[type]?.label ?? "其他";

export const careRecordTypeIcon = (type: CareRecordType): string =>
  CARE_RECORD_TYPE_META[type]?.icon ?? "edit_note";
