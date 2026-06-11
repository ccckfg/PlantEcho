import type { CareRecord, CreateCareRecordInput } from "@dyn/shared";
import { ServiceError } from "../../shared/serviceError.js";
import { nowIso } from "../../shared/time.js";
import { getPlant } from "../plants/plantRepository.js";
import { publishSyncEvent } from "../sync/syncBus.js";
import { insertCareRecord, listCareRecords } from "./careRecordRepository.js";

export const getPlantCareRecords = async (
  plantId: string,
  limit?: number
): Promise<CareRecord[]> => {
  const plant = await getPlant(plantId);
  if (!plant) throw new ServiceError(`Plant ${plantId} not found`, 404, "PLANT_NOT_FOUND");
  return listCareRecords(plantId, limit);
};

export const createCareRecord = async (
  plantId: string,
  input: CreateCareRecordInput
): Promise<CareRecord> => {
  const plant = await getPlant(plantId);
  if (!plant) throw new ServiceError(`Plant ${plantId} not found`, 404, "PLANT_NOT_FOUND");
  const record = await insertCareRecord({
    plantId,
    type: input.type,
    note: input.note?.trim() ?? "",
    source: input.source ?? "panel",
    performedAt: input.performedAt ?? nowIso()
  });
  await publishSyncEvent({
    type: "care_records.changed",
    plantId,
    payload: { recordId: record.id, action: "created", recordType: record.type }
  });
  return record;
};
