import type { CareRecord } from "@dyn/shared";

export const CARE_RECORD_FETCH_LIMIT = 50;
export const CARE_RECORD_DEFAULT_VISIBLE = 7;
export const CARE_RECORD_MAX_VISIBLE = 20;

const DATE_TIME_LOCAL_LENGTH = 16;

export const toDateTimeLocalValue = (date = new Date()): string => {
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, DATE_TIME_LOCAL_LENGTH);
};

export const dateTimeLocalToIso = (value: string): string | null => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const timestamp = (iso: string): number => {
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? 0 : value;
};

export interface CareRecordWindow {
  records: CareRecord[];
  start: number;
  end: number;
  total: number;
  isJumped: boolean;
}

export const selectCareRecordWindow = (
  records: CareRecord[],
  targetIso: string | null
): CareRecordWindow => {
  if (!targetIso) {
    const visible = records.slice(0, CARE_RECORD_DEFAULT_VISIBLE);
    return {
      records: visible,
      start: visible.length ? 1 : 0,
      end: visible.length,
      total: records.length,
      isJumped: false
    };
  }

  const target = timestamp(targetIso);
  const firstNotNewer = records.findIndex((record) => timestamp(record.performedAt) <= target);
  const startIndex = firstNotNewer >= 0 ? firstNotNewer : Math.max(0, records.length - CARE_RECORD_MAX_VISIBLE);
  const visible = records.slice(startIndex, startIndex + CARE_RECORD_MAX_VISIBLE);

  return {
    records: visible,
    start: visible.length ? startIndex + 1 : 0,
    end: startIndex + visible.length,
    total: records.length,
    isJumped: true
  };
};
