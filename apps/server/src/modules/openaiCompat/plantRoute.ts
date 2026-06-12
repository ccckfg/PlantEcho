import { getPlant, listPlants } from "../plants/plantRepository.js";

export interface PlantRoute {
  plantId: string;
  plantName: string;
  requestedModel: string | null;
  matched: boolean;
  source: "model";
}

const plantModelPrefix = "plant:";

export const plantModelId = (plantId: string): string =>
  `${plantModelPrefix}${plantId}`;

export const plantIdFromModel = (model: string): string | null => {
  const trimmed = model.trim();
  if (!trimmed.startsWith(plantModelPrefix)) return null;
  const plantId = trimmed.slice(plantModelPrefix.length).trim();
  return plantId || null;
};

export const listCompatModels = async (userId?: string | null) =>
  (await listPlants(userId)).map((plant) => ({
    id: plantModelId(plant.id),
    object: "model",
    created: 0,
    owned_by: "dyn",
    dyn: {
      plant_id: plant.id,
      plant_name: plant.name,
      species: plant.species
    }
  }));

export const resolvePlantRoute = async (
  model: string,
  userId?: string | null
): Promise<PlantRoute | null> => {
  const plantId = plantIdFromModel(model);
  const plant = plantId ? await getPlant(plantId, false, userId) : null;
  if (!plant) return null;
  return {
    plantId: plant.id,
    plantName: plant.name,
    requestedModel: model,
    matched: true,
    source: "model"
  };
};
