# Walkthrough

本轮已将项目从“硬件验证 + 设计文档”推进到可运行的 Node.js/TypeScript 服务端 MVP。

## 新增内容

- `apps/server`：Fastify 服务端。
- `packages/shared`：设备上传 payload 和植物 care profile schema。
- `docs/api.md`：当前 API 协议。
- `docs/memory-design.md`：植物记忆系统设计。
- `.env.example`、`.gitignore`、根 `README.md`。

## 核心流程

1. ESP32 或模拟器调用：

```http
POST /api/v1/devices/:deviceId/readings
```

2. 服务端会：

- 校验 payload。
- 自动关联或创建设备。
- 写入 `sensor_readings`。
- 用 care profile 判断缺水、弱光、温湿度风险。
- 更新 `plant_status`。
- 对重要异常生成长期记忆。

3. 用户调用：

```http
POST /api/v1/plants/:plantId/chat
```

4. 聊天服务会：

- 保存用户消息。
- 将重要用户表达写入植物记忆。
- 召回相关 `plant_memories` 与 `plant_understandings`。
- 检索管线按 AgentGal 对齐：embedding、sqlite-vec 向量候选、FTS5/BM25、hybrid fusion、可选 rerank、recency/importance 排序。
- 组装植物档案、实时读数、规则判断、近期历史和长期记忆。
- 有 LLM 配置时调用 OpenAI-compatible API；没有配置时使用规则 fallback。

## 常用命令

```powershell
npm install
npm run build
npm run test
npm run dev:server
npm run simulate
```

服务端默认地址：

```text
http://127.0.0.1:8787
```

## 验收建议

1. 启动服务端。
2. 运行模拟器上传数据。
3. 打开 `GET /api/v1/plants` 查看默认植物。
4. 打开 `GET /api/v1/plants/plant-demo/readings/latest` 查看健康判断。
5. 调用聊天接口，确认回复能提到当前传感器事实。
6. 打开 `GET /api/v1/plants/plant-demo/memories` 查看长期记忆。

## 下一步

- 把 ESP32 固件改为上传真实传感器数据。
- 为前端/Tauri 原型接入这些 API。
- 增加每日记忆整理任务，把多条草稿归并成更自然的 EpisodeMemory。
