import { compact } from "../../../shared/text.js";
import { addMemoryDraft } from "../repositories/memoryRepository.js";

export const rememberUserMessage = (plantId: string, turn: number, content: string): void => {
  const cleaned = compact(content);
  if (!cleaned) return;
  addMemoryDraft(plantId, turn, `主人说：${cleaned}`, {
    sourceType: "interaction:user_message"
  });
};
