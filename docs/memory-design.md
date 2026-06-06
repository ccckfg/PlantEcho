# 植物记忆系统设计

本项目借鉴 AgentGal 的上下文管理，但只保留适合植物陪伴系统的部分。

## 分层上下文

| 层次 | 植物系统实现 |
| --- | --- |
| 稳定个性 | `plants.persona_profile_id` + `config/careProfiles.ts` |
| 当前状态 | `plant_status`：心情、关系、当前关注点、最近摘要 |
| 近期对话 | `messages`：按 plant 和 turn 存储 |
| 情节记忆 | `plant_memories`：从对话中形成的、有意义的情节 |
| 稳定理解 | `plant_understandings`：从事件中形成的长期判断 |

## 记忆写入

传感器读数只进入 `sensor_readings` 与 Physical 状态，不进入长期记忆。

长期记忆只从对话中生成，重点保留：

- 主人主动告诉植物自己的状态、情绪或重要日常。
- 关系、承诺、偏好或生活阶段发生的有意义变化。

写入流程是：

```text
事件发生 -> memory_drafts -> background_jobs(memory.consolidation)
        -> closure detector -> EpisodeMemory generator
        -> plant_memories -> UnderstandingPatch -> plant_understandings
```

这条链路已经按 AgentGal 对齐：

- 每次用户消息先写入 `memory_drafts`。
- 每累计 3 个新 turn 调度一次 `scheduleDetectAndConsolidate`；会话超时则闭合当前主题。调度只负责写入/合并后台任务，不阻塞聊天响应。
- `background_jobs` 持久化 consolidation 任务，支持 dedupe、失败重试和 stale running job 恢复。
- 如果已有整理任务正在运行，新 turn 会写入 `memory_consolidation_state.pending_turn`，等当前任务结束后补跑。
- 整理成功后才标记 draft 为 consumed；失败时 draft 保留，下次重试。
- `raw_dialogue` 会落入 `plant_memories`，作为可追溯来源，但不进入向量索引文本。
- `UnderstandingPatch` 会把新 episode id 注入 linked memories，并在内容变化时追加 history。

Closure、Episode 与 Understanding 的模型输出都会经过运行时 schema 校验。输出非法时任务失败并由后台 job 重试，不使用本地生成 fallback。

## 严格对齐后的记忆召回

聊天时构造查询：

```text
episode semantic = 最近可见对话 + 当前关注点 + 主人新消息
episode BM25     = 当前关注点 + 最近可见对话 + 主人新消息
understanding semantic = 关系摘要 + 当前关注点 + 最近可见对话 + 主人新消息
understanding BM25     = 关系摘要 + 当前关注点 + 主人新消息
```

检索管线按 AgentGal 的阶段拆分：

```text
1. embedding query
2. sqlite-vec 向量候选
3. SQLite FTS5 / BM25 候选
4. hybrid fusion: vector relevance 0.75 + BM25 relevance 0.25
5. optional rerank
6. recency + importance 最终排序
7. 更新 lastRecalledAt
```

最终排序：

```text
final = relevance * 0.50 + recency * 0.20 + importance * 0.30
```

其中 relevance 来自 hybrid fusion 或 rerank，recency 使用指数衰减，importance 来自记忆重要度。

检索模块本身仍支持 FTS5/BM25 候选，但植物对话入口要求 embedding API 已配置；配置后会自动建立 `sqlite-vec` 向量索引。

Embedding provider 可通过 `EMBEDDING_PROVIDER` 切换：

- `openai-compatible`：默认值，调用 OpenAI-compatible `/embeddings`，适合现有代理、OpenAI、SiliconFlow 等兼容服务。
- `dashscope`：调用 DashScope 原生文本 embedding endpoint，适合 Qwen `text-embedding-v4` 等模型。

切换 provider、模型或维度时，系统会重建向量索引，避免不同 embedding 空间混合检索。

## Rerank 配置

检索链路支持可选 rerank。当前默认模型为：

```text
Qwen/Qwen3-Reranker-8B
```

如果 `RERANK_API_URL` / `RERANK_API_KEY` 留空，服务端会自动从主 LLM 连接派生：

```text
LLM_API_URL=https://example.com/v1
LLM_API_KEY=...
RERANK_MODEL_ID=Qwen/Qwen3-Reranker-8B
```

等价于调用：

```text
POST https://example.com/v1/rerank
```

也可以显式覆盖：

```text
RERANK_API_URL=https://api.siliconflow.com/v1/rerank
RERANK_API_KEY=...
RERANK_MODEL_ID=Qwen/Qwen3-Reranker-8B
```

最小 smoke：

```powershell
npm run smoke:rerank
```

检索质量评估：

```powershell
npm run evaluate:retrieval
```

该脚本会在当前数据库中写入评估样本；建议像 smoke 一样通过临时
`DYN_DATA_DIR` 运行。最近一次报告见
`docs/reports/retrieval-quality-20260520.md`。

## 记忆引用策略

聊天不会无条件引用检索到的记忆。后端会根据用户消息和召回相关性生成本轮
`memory_use_policy`：

- 状态/读数类问题优先回答当前传感器，不主动引用旧记忆。
- 明确问“记得/上次/之前”时，允许引用中高相关记忆。
- 高相关且能帮助回答的记忆最多引用 1 条。
- 没有可靠记忆时，prompt 明确禁止说“我记得/你之前说过/上次”。

聊天响应会返回：

```json
{
  "usedMemoryIds": ["..."],
  "memoryCitations": [
    { "id": "...", "title": "从客厅搬到了东窗边", "date": "2026-05-20", "relevance": 0.91 }
  ]
}
```

桌面端会在聊天气泡下方显示轻量的“引用记忆”提示。真实 smoke：

```powershell
npm run smoke:memory-citation
```
