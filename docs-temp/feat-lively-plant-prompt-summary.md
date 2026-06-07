# feat/lively-plant-prompt 分支总结

## 目标

本分支优化植物聊天 Prompt 的时间感和身体表达，同时保持事实可靠性与现有状态职责边界：

- 让植物知道距离主人上次说话过去了多久。
- 在客户端提供可靠时区时，让植物知道用户当地时间段。
- 把传感器读数转换为结构化感官状态，减少仪表盘式表达。
- 不允许 Physical State 污染 Inner State、记忆或主动发言。

## 最终设计

### 时间上下文

聊天 Prompt 新增 `temporal_context`：

```json
{
  "timeSinceUserSpoke": "2小时前聊过",
  "currentTime": "2026/06/07 21:30:00",
  "timeOfDay": "晚上"
}
```

- `timeSinceUserSpoke` 根据当前 turn 之前最后一条用户消息计算，主动消息不会干扰。
- 普通聊天与流式聊天请求都会发送客户端 IANA 时区。
- 时区缺失或无效时，仅提供互动间隔，不根据服务器时间猜测用户当地时间。
- 已删除仅凭月份推断季节的逻辑。

### 结构化感官状态

`physical_state` 新增 `sensoryFeelings`：

```json
{
  "freshness": "fresh",
  "moisture": "below_range",
  "light": "unknown",
  "temperature": "within_range"
}
```

状态只表达可信的本地规则结果：

- `below_range`
- `above_range`
- `within_range`
- `unknown`

设备离线或没有有效读数时，各项状态为 `unknown`。缺失的 `null` 读数不会被误判为 0。

### Prompt 安全取舍

- 保留 Physical / Inner / Relationship / Intention 四层职责边界。
- Physical State 只能影响本轮身体表达，不会写入 Inner State 或产生主动发言。
- 删除 Few-Shot 示例，避免模型机械模仿或编造外界画面。
- 删除季节、气孔闭合等依赖地区或物种的假设。
- 时间只能影响语气，不可作为天气、环境或植物生理行为的事实依据。

## 接口变化

以下聊天接口请求体新增可选字段：

- `POST /api/v1/plants/:plantId/chat`
- `POST /api/v1/plants/:plantId/chat/stream`

```json
{
  "content": "晚上好",
  "timezone": "Asia/Shanghai"
}
```

`timezone` 最长 100 个字符。无效时区会被忽略，不影响聊天。

客户端通过以下 API 自动读取设备时区：

```ts
Intl.DateTimeFormat().resolvedOptions().timeZone
```

## Docker 部署

`docker-compose.yml` 新增容器时区：

```yaml
environment:
  TZ: ${TZ:-Asia/Shanghai}
```

服务器可在环境文件中覆盖：

```env
TZ=Asia/Shanghai
```

容器时区用于服务器自身的本地时间行为；聊天中的用户当地时间仍以客户端上传时区为准。

正式 `1.0.0` 发布同时完善了部署配置：

- Compose 默认使用 `ccckfg/dyn:1.0.0`，允许通过 `DYN_IMAGE` 覆盖。
- HTTP、MQTT 宿主端口和数据目录均可配置。
- 增加 Node.js `/health` 容器健康检查、init 进程和停止宽限期。
- `.env.example` 补齐设备配置重试、认证、主副模型、Embedding、rerank、天气和主动发言参数。
- npm 工作区与 Tauri/Cargo 版本统一为 `1.0.0`。

## 主要文件

- `apps/server/src/modules/chat/promptBuilder.ts`：时间上下文与结构化感官状态组装。
- `apps/server/src/modules/chat/messageRepository.ts`：查询当前 turn 之前最后一条用户消息。
- `apps/server/src/modules/chat/chatService.ts`：将时区传入 Prompt 组装。
- `apps/server/src/modules/chat/routes.ts`：接收并校验可选时区。
- `apps/server/src/modules/chat/prompts.ts`：时间和感官表达规则。
- `apps/server/src/modules/chat/promptBuilder.test.ts`：时间、缺失读数和 Prompt 结构测试。
- `apps/desktop/src/lib/timezone.ts`：读取客户端 IANA 时区。
- `apps/desktop/src/lib/api.ts`：普通聊天发送时区。
- `apps/desktop/src/lib/chatStream.ts`：流式聊天发送时区。
- `docker-compose.yml`、`.env.example`：容器时区配置。

## 验证结果

2026-06-07 本地验证：

- `npm run test --workspace @dyn/server`：56/56 通过。
- `npm run build`：共享包、服务端、桌面/移动共用前端全部通过。
- `cargo check --locked`：通过。
- `git diff --check`：通过。
- `docker compose config --no-env-resolution`：通过。
- `ccckfg/dyn:1.0.0` 与 `ccckfg/dyn:latest`：本地构建通过。
- 临时 `1.0.0` 容器：`GET /health` 返回正常，容器内后端版本为 `1.0.0`。

桌面前端构建仍有原有的 Vite 大 chunk 提示，与本分支无关。

## 后续建议

- 使用真实 LLM 对晚上问候、久别重逢、设备离线和缺失单项传感器四类场景做对话质感评估。
- 若继续扩展时间或感官逻辑，应将其从 `promptBuilder.ts` 拆分到独立模块，避免 Prompt 组装器继续膨胀。
