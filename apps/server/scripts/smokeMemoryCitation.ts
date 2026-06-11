import { migrate } from "../src/db/migrate.js";
import { closeDb } from "../src/db/connection.js";
import { createPlant } from "../src/modules/plants/plantRepository.js";
import { addEpisodeMemory } from "../src/modules/memory/repositories/memoryRepository.js";
import { chatWithPlant } from "../src/modules/chat/chatService.js";

const main = async (): Promise<void> => {
  await migrate();
  const plant = await createPlant({
    name: "引用评估绿萝",
    species: "绿萝",
    location: "东窗边"
  });

  const memory = await addEpisodeMemory({
    plantId: plant.id,
    date: "2026-05-20",
    time: "09:00",
    location: "客厅到东窗边",
    participants: "主人",
    title: "从客厅搬到了东窗边",
    content: "主人把我从客厅搬到东窗边，说那里上午光线更柔和，想让我慢慢适应新位置。",
    keywords: ["东窗", "位置", "光照"],
    importance: 5,
    sourceType: "smoke:memory_citation",
    rawDialogue: "[turn=1] 主人: 我把你从客厅搬到东窗边。",
    rawPayload: {}
  });

  const remember = await chatWithPlant(plant.id, "你还记得我把你搬到哪里了吗？");
  if (!remember.memoryCitations.some((item) => item.id === memory.id)) {
    throw new Error(`Expected memory citation for direct memory question: ${remember.reply}`);
  }
  if (!/记得|东窗|客厅/.test(remember.reply)) {
    throw new Error(`Expected reply to naturally mention recalled memory: ${remember.reply}`);
  }

  const status = await chatWithPlant(plant.id, "现在湿度和温度怎么样？");
  if (status.memoryCitations.length) {
    throw new Error(`Expected no memory citations for status-only question: ${status.reply}`);
  }

  console.log(`Memory citation smoke complete. cited=${remember.memoryCitations[0]?.title}`);
};

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}).finally(() => closeDb());
