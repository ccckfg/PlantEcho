import { compact } from "../../../shared/text.js";
import { addMemoryDraft } from "../repositories/memoryRepository.js";

export const rememberUserMessage = async (plantId: string, turn: number, content: string): Promise<void> => {
  const cleaned = compact(content);
  if (!cleaned) return;
  await addMemoryDraft(plantId, turn, `主人说：${cleaned}`, {
    sourceType: "interaction:user_message"
  });
};

export const rememberAssistantMessage = async (
  plantId: string,
  turn: number,
  content: string,
  sourceType = "interaction:assistant_message"
): Promise<void> => {
  const cleaned = compact(content);
  if (!cleaned) return;
  await addMemoryDraft(plantId, turn, `植物说：${cleaned}`, { sourceType });
};
