# LLM 调用与主副模型路由

文本模型调用统一经过 `modules/llm/client.ts`。业务使用 `phase` 标记任务类型，
`config/llmRouting.ts` 决定使用主模型还是副模型。

## 当前调用清单

| Phase | 模型 | 触发时机 | 职责 |
|---|---|---|---|
| `chat.reply` | 主模型 | 每次普通或流式植物对话 | 生成可见回复与隐藏 Inner Patch |
| `proactive.intention` | 主模型 | 主动扫描选出一个可考虑 Intention 后 | 决定说、保留、完成或放弃，并生成主动发言 |
| `proactive.event` | 主模型 | 预留给需要模型判断的主动事件 | 当前 reminder 直接发送、rain 保持沉默，因此现有事件不会实际调用 |
| `memory.closure` | 副模型 | 每累计 3 个新 turn 的后台整理任务 | 判断对话主题闭合边界 |
| `memory.episode` | 副模型 | 每个闭合情节 | 生成结构化 Episode |
| `memory.understanding` | 主模型 | Episode 成功写入后 | 判断是否更新长期理解与关系 |
| `plant.care-profile` | 副模型 | 用户请求生成养护参数建议时 | 生成结构化 care profile |

`memory.understanding` 保留在主模型，因为它会长期改变植物如何理解主人。
主动发言也使用主模型，保证主动与被动对话保持同一个人格和判断能力。

## 配置

主模型使用现有变量：

```env
LLM_API_URL=https://example.com/v1
LLM_API_KEY=...
LLM_MODEL_ID=strong-chat-model
LLM_TEMPERATURE=0.7
```

若要启用副模型，需要显式配置模型 ID。URL 与 Key 留空时复用主模型供应商：

```env
SECONDARY_LLM_API_URL=
SECONDARY_LLM_API_KEY=
SECONDARY_LLM_MODEL_ID=cheap-structured-model
SECONDARY_LLM_TEMPERATURE=0.2
```

副模型未配置时，分配给副模型的任务自动使用主模型，并按主模型价格记录用量。
植物对话仍只要求主模型与 embedding API 已配置。

## 其他模型 API

以下调用不走主副文本模型路由：

- embedding：聊天检索时生成 Episode 与 Understanding 查询向量；存在未索引记忆时还会批量补索引。
- rerank：配置后，聊天检索会分别对 Episode 与 Understanding 候选进行重排。

因此一次普通聊天通常包含 1 次主模型调用、2 次查询 embedding；配置 rerank 时最多再
有 2 次 rerank 调用。存在新记忆未索引时，还会增加一次批量 embedding。
