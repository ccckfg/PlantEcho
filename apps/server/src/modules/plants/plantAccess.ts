import type { AppUser, PlantSummary } from "@dyn/shared";
import type { FastifyRequest } from "fastify";
import { ServiceError } from "../../shared/serviceError.js";
import { getPlant } from "./plantRepository.js";

export const requireCurrentUser = (request: FastifyRequest): AppUser => {
  if (!request.currentUser) {
    throw new ServiceError("请先用账号密码登录。", 401, "UNAUTHORIZED");
  }
  return request.currentUser;
};

export const requireOwnedPlant = async (
  plantId: string,
  user: Pick<AppUser, "id">
): Promise<PlantSummary> => {
  const plant = await getPlant(plantId, false, user.id);
  if (!plant) {
    throw new ServiceError(`Plant ${plantId} not found`, 404, "PLANT_NOT_FOUND");
  }
  return plant;
};
