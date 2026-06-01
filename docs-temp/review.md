# 服务端代码审查报告

> 审查时间：2026-05-18  
> 审查范围：`apps/server/src/` 全模块，对照期中汇报设计目标与 AgentGal 记忆系统

---

## 一、整体评价

服务端骨架扎实，模块划分合理（plants / devices / readings / chat / memory / llm），TypeScript + Fastify + SQLite 技术选型符合期中汇报方向。记忆系统底层（向量索引、BM25、混合检索、重排）与 AgentGal 的设计对齐良好。主要问题集中在以下几个方向：期中汇报核心卖点缺失、LLM 记忆整合管线未实现、一处安全漏洞、若干逻辑 Bug。

---

## 二、对齐期中汇报核心设计

### 已实现 ✅

| 设计目标 | 实现位置 |
|---|---|
| ESP32 通过 HTTP 推传感器数据 | `POST /api/v1/devices/:deviceId/readings` |
| 植物档案管理 | `modules/plants/` |
| 传感器评估规则引擎（water/light/temp/humidity） | `modules/readings/rules.ts` |
| 对话历史存储 + 滑动窗口 | `modules/chat/historyWindow.ts` |
| LLM 中间件调用（上游 OpenAI 兼容） | `modules/llm/client.ts` |
| 长期记忆（EpisodeMemory + Understanding） | `modules/memory/` |
| RAG 检索注入 Prompt | `modules/chat/promptBuilder.ts` |
| 拟人化 Prompt + 植物人格 | `modules/chat/prompts.ts` + `config/careProfiles.ts` |

### 关键缺失 ❌

| 期中汇报设计 | 现状 | 优先级 |
|---|---|---|
| **对外提供 OpenAI Chat Completion 兼容接口** | 只有自定义 `/api/v1/plants/:plantId/chat`，第三方客户端无法直接接入 | 🔴 高 |
| 天气 API 接入（用于养护建议） | 未实现 | 🟡 中 |
| 主动提醒（用户长时间不打开 App） | 未实现 | 🟡 中 |
| MQTT 支持 | 仅 HTTP | 🟢 低 |

> **说明**：OpenAI 兼容接口是期中汇报中"架构图"的核心卖点——"官方客户端和第三方支持 OpenAI API 的客户端都可以直接接入"。缺少它意味着 Tauri 客户端和其他工具都必须走自定义协议，架构优势消失。

---

## 三、记忆系统对齐 AgentGal

### 对齐情况

| 机制 | AgentGal | DYN Server | 备注 |
|---|---|---|---|
| EpisodeMemory + Understanding 双层架构 | ✅ | ✅ | 字段结构完全对应 |
| SQLite vec0 向量索引 | ✅ | ✅ | |
| FTS5 BM25 全文检索 | ✅ | ✅ | |
| 混合检索融合（向量 + BM25 加权） | ✅ | ✅ | 权重可配置 |
| 重排（Rerank） | ✅ | ✅ | 支持外部 rerank 服务 |
| 时间衰减 recency scoring | ✅ | ✅ | 指数衰减，半衰期可配 |
| importance 权重（1-5 归一化） | ✅ | ✅ | |
| memory_drafts 草稿暂存 | ✅ | ✅ | |
| 调用后更新 `last_recalled_at` | ✅ | ✅ | |

### 关键未对齐点

#### 1. LLM 驱动的记忆整合缺失（最重要）

AgentGal 的核心是 `consolidation/flow.py`：每轮对话结束后，通过 LLM 把原始消息提炼成结构化记忆（自动提取 title、keywords、importance，更新 Understanding）。

DYN 的 `memory/prompts/` 目录为**空**，`ruleConsolidator.ts` 只有两个硬编码规则：
- 传感器异常 → 写入记忆
- 用户消息命中关键词正则 → 写入"日常聊天"记忆

**影响**：大部分有价值的对话内容（日常问答、植物状态反馈、用户的植物知识）**不会进入记忆**，长期记忆质量会很差，RAG 检索实际上几乎没有内容可以召回。

#### 2. Recency 计算方式差异

- **AgentGal**：`RECENCY_DATE_WEIGHT × event_score + RECENCY_RECALL_WEIGHT × recall_score`（加权平均）
- **DYN**：`Math.max(recencyScore(createdAt), recencyScore(lastRecalledAt))`（取最大值）

取最大值会让"最近刚被召回的旧记忆"得到异常高的 recency 分，可能导致高频召回的旧记忆一直排名靠前。建议改为加权平均，与 AgentGal 保持一致。

---

## 四、其他问题

### 4.1 安全漏洞（应优先修复）

**设备 API 无认证**

`devices` 表中存在 `api_key_hash` 字段，但 `modules/devices/routes.ts` 中完全不验证。

```ts
// 当前：任何人知道 deviceId 就能推送数据
app.post("/api/v1/devices/:deviceId/readings", async (request, reply) => {
  const { deviceId } = request.params as { deviceId: string };
  const payload = deviceReadingSchema.parse(request.body);
  // ← 没有任何认证
  const result = recordDeviceReading(deviceId, payload);
  ...
});
```

攻击者可以伪造传感器数据，触发错误的养护建议（如推送"极度缺水"让植物被过度浇水）。

**修复方案**：在请求头读取 `X-Api-Key`，与数据库中的 `api_key_hash` 比对（bcrypt/argon2）。

### 4.2 关系状态不会演化

`chatService.ts` 中每次对话结束都把 `relationship` 覆盖成固定字符串：

```ts
updatePlantStatus(plantId, { relationship: "和主人有了持续互动", focus: content.slice(0, 80) });
```

这会清掉任何通过记忆系统积累的关系描述，`plant_status.relationship` 字段实际上失去了意义。

### 4.3 传感器记忆的 turn 硬编码为 0

`readingService.ts` 中：

```ts
rememberSensorIssues(plantId, 0, reading, health);
```

传感器记忆写入 `memory_drafts` 时 `turn = 0`，虽然传感器事件确实与对话 turn 无关，但统一写 0 会导致所有传感器 draft 在数据库中无法区分。建议用 `null` 或专用负数区间，或直接不写 draft（传感器事件可以跳过草稿直接写 episode）。

### 4.4 `rememberUserMessage` 阈值过于简单

```ts
if (cleaned.length < 8 && !emotionalPattern.test(cleaned)) return;
```

8 个字的硬编码截断会丢弃很多有价值的短句（如"好喝""谢谢""浇水了"）。且 `emotionalPattern` 是一个简单的关键词正则，无法捕获隐含情绪。这是 LLM 整合缺失的直接后果——没有 LLM 就只能靠规则降级处理。

---

## 五、修复优先级建议

| 优先级 | 问题 | 工作量 |
|---|---|---|
| 🔴 高 | 设备 API 认证漏洞 | 小 |
| 🔴 高 | OpenAI Chat Completion 兼容接口 | 中 |
| 🔴 高 | LLM 驱动记忆整合管线 | 大 |
| 🟡 中 | Recency 改为加权平均 | 小 |
| 🟡 中 | `relationship` 演化逻辑 | 小 |
| 🟡 中 | 天气 API 集成 | 中 |
| 🟢 低 | 传感器 draft turn 语义 | 小 |
| 🟢 低 | MQTT 支持 | 大 |
