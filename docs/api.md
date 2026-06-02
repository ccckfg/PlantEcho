# PlantEcho Server API

默认地址：`http://127.0.0.1:8787`

## Health

```http
GET /health
```

## App Auth

应用接口现在使用账号密码登录后返回的 token。除 `/health`、设备上报、
`/api/v1/auth/status`、`/api/v1/auth/register`、`/api/v1/auth/login`
外，客户端应携带：

```http
Authorization: Bearer <login_token>
```

登录与注册：

```http
GET /api/v1/auth/status
POST /api/v1/auth/register
POST /api/v1/auth/login
GET /api/v1/auth/check
GET /api/v1/auth/me
GET /api/v1/auth/sessions
DELETE /api/v1/auth/sessions/:sessionId
```

首个注册用户会成为管理员。用户管理不暴露前端界面，改用后端 CLI：

```powershell
npm run user --workspace @dyn/server -- list-users
npm run user --workspace @dyn/server -- create-user --username owner --password garden-pass-1 --role admin
npm run user --workspace @dyn/server -- list-sessions
```

前端账号弹窗只管理当前用户自己的登录会话，可查看登录设备/IP/User-Agent/最近活跃时间，并撤销指定会话。

请求示例：

```json
{
  "username": "owner",
  "password": "at-least-8",
  "displayName": "小绿的主人"
}
```

## Plants

```http
GET /api/v1/plants
POST /api/v1/plants
GET /api/v1/plants/:plantId
GET /api/v1/plants/:plantId/readings/latest
GET /api/v1/plants/:plantId/readings?limit=120
GET /api/v1/plants/:plantId/messages
GET /api/v1/plants/:plantId/memories
GET /api/v1/plants/:plantId/understandings
```

创建植物：

```json
{
  "name": "小绿",
  "species": "绿萝",
  "location": "书桌旁"
}
```

## Device Upload

```http
POST /api/v1/devices/:deviceId/readings
```

Payload:

```json
{
  "capturedAt": "2026-05-18T12:00:00+08:00",
  "soilRaw": 2210,
  "soilPercent": 48,
  "airTempC": 25.6,
  "airHumidityPercent": 62.1,
  "lightLux": 850,
  "rssi": -54,
  "batteryMv": null
}
```

未知设备上传时不会写入植物读数，而是返回：

```json
{
  "status": "PENDING_DEVICE",
  "deviceId": "esp32-new"
}
```

桌面端认领后，设备需要在 `x-api-key` 中携带认领时生成的设备密钥。MQTT
设备会在认领后自动收到该密钥并保存；HTTP-only 设备仍需手动配置。

## Device Claim

待认领设备列表和认领接口受登录 token 保护：

```http
GET /api/v1/devices
GET /api/v1/devices/pending
POST /api/v1/devices/:deviceId/claim
POST /api/v1/devices/:deviceId/ignore
POST /api/v1/devices/:deviceId/rotate-key
PATCH /api/v1/devices/:deviceId
DELETE /api/v1/devices/:deviceId
POST /api/v1/devices/bulk
```

停用设备会保留绑定与历史读数，但后续设备密钥校验不再通过；删除为软删除，设备继续上报时会重新进入待认领。

绑定已有植物：

```json
{
  "mode": "existingPlant",
  "plantId": "plant-demo",
  "deviceName": "书桌 ESP32"
}
```

新建植物并绑定：

```json
{
  "mode": "newPlant",
  "plant": {
    "name": "小绿",
    "species": "绿萝",
    "location": "书桌旁"
  },
  "deviceName": "书桌 ESP32"
}
```

认领和轮换密钥会返回一次性明文：

```json
{
  "device": { "id": "esp32-new", "plantId": "plant-demo", "hasApiKey": true },
  "deviceApiKey": "dyn_dev_...",
  "deliveredToDevice": true
}
```

如果设备当前通过 MQTT 在线，后端会向 `dyn/devices/:deviceId/config` 发布：

```json
{
  "type": "device.credentials",
  "deviceId": "esp32-new",
  "apiKey": "dyn_dev_...",
  "issuedAt": "2026-05-28T00:00:00.000Z"
}
```

ESP32 固件收到后会写入 NVS 并自动重连。`deviceApiKey` 仍只显示一次，作为设备离线时的手动兜底。

`ignore` 用于隐藏误上报或不再使用的待认领设备，不会删除已绑定设备。

端到端烟测：

```powershell
npm run dev:server
npm run smoke:device-claim
npm run smoke:memory-chat
npm run smoke:rerank
```

如果服务端不在默认地址，可设置：

```powershell
$env:SERVER_URL="http://127.0.0.1:8787"
$env:SMOKE_PLANT_ID="plant-demo"
npm run smoke:device-claim
```

`smoke:memory-chat` 会发送带唯一标记的三轮普通对话，并等待后台
`memory.consolidation` 生成包含该标记的长期记忆。它要求真实 LLM 可用；如果聊天走
fallback，会直接报出原因，避免把未完成的记忆链路误判为通过。
运行该脚本会把烟测对话发送到服务端已配置的 LLM Provider。

`smoke:rerank` 会使用当前 rerank 配置调用 `Qwen/Qwen3-Reranker-8B`。

## OpenAI-compatible API

小项目上线场景下，后端提供常见客户端可用的 OpenAI-compatible 子集：

```http
GET /v1/models
GET /v1/models/:model
POST /v1/chat/completions
```

`POST /v1/chat/completions` 支持标准 `messages`、`model`、`stream`、
`stream_options.include_usage` 以及常见采样参数的宽松解析。这里的 `model`
表示上游 LLM 模型；植物路由从 system/developer/user 消息里的
`<植物名>小绿</植物名>` 解析，匹配失败或未提供时回落到 `DEFAULT_PLANT_ID`。
非流式响应返回 `chat.completion`，流式响应返回 `text/event-stream` 的
`chat.completion.chunk` 与最终 `data: [DONE]`。当前不支持 tool calling、
`n > 1` 或完整 OpenAI 平台级资源。

示例：

```json
{
  "model": "gemini-3-flash-preview",
  "messages": [
    { "role": "system", "content": "<植物名>小绿</植物名>" },
    { "role": "user", "content": "你现在怎么样？" }
  ],
  "stream": true
}
```

如果 `RERANK_API_URL` / `RERANK_API_KEY` 为空，服务端会复用主 LLM 连接，
从 `LLM_API_URL` 派生 `/rerank`，并使用 `LLM_API_KEY`。

## Chat

```http
POST /api/v1/plants/:plantId/chat
POST /api/v1/plants/:plantId/chat/stream
```

Payload:

```json
{
  "content": "我今天工作有点累，你怎么样？"
}
```

如果未配置 `LLM_API_URL`、`LLM_API_KEY`、`LLM_MODEL_ID`，服务端会使用规则引擎 fallback 回复。

流式接口返回 Server-Sent Events：

```text
event: meta
data: {"turn":5}

event: delta
data: {"delta":"..."}

event: done
data: {"turn":5,"usedLlm":true}
```

## Weather

天气接口由后端代理和风天气/QWeather，前端不直接接触天气 API Key。

```http
GET /api/v1/weather/now
GET /api/v1/weather/now?location=101200113
GET /api/v1/weather/locations?q=北京
```

后端支持 API Key 模式配置：

```text
WeatherKey=...
WeatherUrl=ne2tupmg2b.re.qweatherapi.com
WeatherLocation=101200113
```

也可使用 `QWEATHER_API_KEY` / `QWEATHER_API_HOST` / `QWEATHER_DEFAULT_LOCATION`。

## Photos

```http
GET /api/v1/plants/:plantId/photos
POST /api/v1/plants/:plantId/photos
DELETE /api/v1/plants/:plantId/photos/:photoId
GET /media/photos/:photoId
```

上传照片：

```json
{
  "fileName": "leaf.png",
  "dataUrl": "data:image/png;base64,...",
  "caption": "新叶展开了",
  "capturedAt": "2026-05-19T12:00:00+08:00"
}
```

支持 `jpeg`、`png`、`webp`、`gif`，单张图片最大 5MB。

删除照片会移除数据库记录并尝试删除本地文件；如果该照片正作为植物头像，会同步清空头像并发布
`plants.changed`。

## Sync

客户端实时同步使用后端事件流。数据本身仍以各业务表为准，`sync_events`
只记录“资源变化通知”，客户端收到后再拉最新数据。

```http
GET /api/v1/sync/events?since=0&limit=200
GET /api/v1/sync/stream?since=0
```

`/stream` 返回 Server-Sent Events：

```text
event: hello
data: {"latestEventId":12}

event: sync
data: {"id":13,"type":"readings.changed","resource":"readings","plantId":"plant-demo","payload":{"readingId":1},"createdAt":"..."}

event: ping
data: {"at":1779256485913}
```

当前事件资源：

```text
plants, readings, status, messages, memories, understandings, photos, devices
```

## Background Jobs

`background_jobs` 是服务端内部表，目前没有公开 HTTP API。聊天和设备上报会自动写入
`memory.consolidation` 任务，由内置 worker 负责失败重试、pending turn 补跑和 stale job 恢复。

主动提醒会写入 `proactive.reminder` 任务。用户在聊天里说“十分钟后提醒我浇水”一类表达后，
后端会解析提醒时间，写入 `proactive_reminders`，到点后通过同一套 `messages.changed`
同步事件显示为植物主动发言。

主动发言 Engine 的设计见 `docs/proactive-engine.md`。
