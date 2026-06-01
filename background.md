# Project Background

## 项目概述

DYN Plant Pal 是一个基于 ESP32 与大语言模型的智能植物陪伴系统。它把植物的环境状态、养护规则、长期记忆与拟人化对话结合起来，让用户在养植物的过程中获得真正的陪伴感和反馈感。

当前阶段：Node.js/TypeScript 后端 MVP 可运行；Tauri v2 桌面客户端已交付 Windows 端首版；ESP32 已具备 SoftAP 配网、MQTT 上报和 OTA 在线更新能力；后端已启用主动发言 Engine。后端完成度约 90%，桌面客户端约 87%（未上手机端）。

---

## 设计哲学：人文关怀

PlantEcho 的设计目标不是"高效的传感器看板"，而是"和植物一起呼吸的陪伴软件"。所有产品决策都应在以下五个原则下取舍。

### 1. 让系统说人话

软件最容易冷漠的地方是文案。所有用户可见的字符都要做"翻译"：

- 把"否定句"翻译成"邀请句"。"无法连接到后端"→"我们暂时联系不上 PlantEcho 的家"。
- 把"系统语义"翻译成"植物视角"。"水分: 23%"→"我有点渴了 · 23%"，"sensor_offline"→"我暂时听不到自己的传感器了"。
- 错误是给系统看的，但显示给的是人。技术细节折叠到二级，主信息要让用户看了不慌。

### 2. 尊重用户的节奏

植物本身就是慢的载体，软件的响应也应该耐心。

- 关键操作（浇水记录、删除照片、解绑设备）默认走"5 秒撤销 toast"而非确认弹窗。植物的世界没有"立刻不可逆"。
- 加载文案用"正在看看窗外…/正在记下来…/正在帮你保存这一刻…"而非"读取中/保存中"。
- 路由切换、内容浮现都用 380ms 缓动 + 8px 上推，不做突然出现/瞬切。

### 3. 操作信任：把控制权还给用户

- **快捷动作渲染为系统操作 chip**，而不是伪装成用户消息。例如点"已浇水"应显示居中的「📝 你为小绿记录了一次浇水」气泡，不应让用户在聊天里看到自己说"已浇水"。
- **离线兜底要诚实**：使用本地兜底回复时显式标注"PlantEcho 此刻无法联网，回复来自本地预设"，符合"诚实优先"。
- **未实现的按钮不放出来**。比报错更伤信任的，是让用户点一个不响应的按钮。
- **撤销 > 确认对话框**：destructive 操作首选 toast undo 模式，仅在真的需要思考成本时才用对话框。

### 4. 共情细节

- **时间感问候**：根据时辰显示"早安/午安/下午好/晚上好"，让用户每次进入有"被注视"的感觉。
- **植物视角语言**：caption、empty 状态、错误提示统一用第一人称（"我有点渴了"），而不是第三人称（"它需要浇水"）。
- **里程碑要被庆祝**：高重要度记忆出现时给一次柔和动效，让用户看到植物的"被看到"。
- **里程碑可被回应**：用户可以悬停里程碑卡片直接给植物留言，留言会以系统消息形式发到对话流，让"看见"和"被看见"形成闭环。
- **空状态不是空**：图标 ping 光晕、文案带邀请性，让"还没有"变成"我在等你"。

### 5. 视觉与微交互的呼吸感

- 卡片之间用渐变遮罩柔化边界，不用硬线切割。
- 滚动条默认透明，hover 时柔和显现。
- focus 环只在键盘聚焦时显示（`:focus-visible`），点击不再触发讨厌的浏览器默认环。
- 按钮默认 `active:scale-[0.97]`，给手感一个细小的回应。
- `prefers-reduced-motion` 时所有动效退化为静态。

### 应避免的反模式

- ❌ 用红色/感叹号否定用户（"非法/无效"），改用琥珀色提醒。
- ❌ 在用户阅读时弹 modal 抢焦点（用右上角徽章替代）。
- ❌ 系统主动写入"用户消息"（伪造用户身份）。
- ❌ 没有撤销路径的破坏性操作。
- ❌ 把传感器读数当作植物说的话；植物只能基于真实传感器、规则、用户告知和长期记忆回应。

---

## 整体架构

### 1. 硬件层

- ESP32 为核心控制器，挂载 OLED（I2C `0x3C`）、SHT40（I2C `0x44`）、GY-302/BH1750（I2C `0x23`）、电容式土壤湿度（GPIO34/ADC）。
- 固件可上传 `soilRaw`、`soilPercent`、`airTempC`、`airHumidityPercent`、`lightLux`。
- 默认通过 MQTT topic `dyn/devices/:deviceId/readings` 上报，HTTP 接口保留兼容。
- 长按 BOOT 键约 3 秒进入 SoftAP 配网；配置（Wi-Fi、MQTT、HTTP、设备 ID、OTA manifest）写入 NVS；认领后设备 API Key 可通过 MQTT 自动下发并保存，离线设备仍可手动填写。
- OTA manifest 形如 `{"version":"0.2.1","url":"firmware.bin"}`。
- 仅支持 2.4GHz Wi-Fi。

### 2. 服务端层（`apps/server`）

技术栈：Node.js 24 + TypeScript + Fastify + SQLite + sqlite-vec + Zod。

核心模块：

- **设备**：读数上传、待认领登记、列表/忽略、认领、密钥 hash 校验/轮换，认领/轮换后可通过 MQTT 下发设备密钥。
- **植物**：档案、状态、读数、care profile 建议（LLM/模板）。
- **聊天**：流式 + 非流式植物聊天，含 LLM 不可用时的 fallback。
- **OpenAI-compatible**：`/v1/chat/completions`、`/v1/models`，通过 `<植物名>...</植物名>` 路由植物。
- **记忆**：AgentGal 式生命周期（drafts → consolidation → episode → understanding），FTS5/BM25 + sqlite-vec + hybrid + 可选 rerank。
- **主动发言 Engine**：缺水/离线/降雨/到期提醒先生成事件事实，冷却占位后由 LLM 润色为植物口吻消息。
- **同步**：SQLite `sync_events` + SSE，多端实时刷新。
- **天气**：代理和风天气/QWeather。
- **用户与登录**：前端通过后端地址 + 账号密码登录；后端提供注册、登录、当前用户接口，使用 HMAC token 保护除设备读数/注册登录外的应用接口，并记录登录会话的 IP 与 User-Agent。管理员用户管理交给后端 CLI。`APP_ACCESS_KEY` 仅作为旧版兼容入口与 token secret 兜底。

### 3. 客户端层（`apps/desktop`）

技术栈：Tauri v2 + React 18 + Vite 5 + TypeScript + Tailwind 3 + react-router-dom（HashRouter）。

设计基线：Verdant Echo（Forest-to-Soil 配色、本地系统字体栈、内联 SVG 图标）。所有 token 在 `tailwind.config.js` 内嵌；前端已移除 Google Fonts / Material Symbols 远程字体依赖，Tauri 包内资源可完全本地加载。

页面与路由：

- `/` 温室 Dashboard：时段问候 + 天气卡 + 一键浇水（带 5 秒 undo toast）+ 植物卡片网格。
- `/plant/:plantId` 植物详情：头图 + 头像编辑 + 状态条 + 最新读数 + 读数历史（顶部底部渐变淡出）+ care profile。
- `/chat`、`/chat/:plantId` 植响对话：左侧档案卡 + 右侧聊天，流式回复，快捷动作，hover 评论按钮。
- `/journal`、`/journal/:plantId` 成长日记：Bento StatCard + 里程碑时间线，里程碑悬停可对植物留言。
- `/album` 相册：双层时间分组 + 按植物筛选 + 拖入上传 + 固定尺寸 lightbox + 删除二次确认。

共享 UI 与机制：

- `AppShell`、`SideNav`、`Card`、`Chip`、`Icon`、`ProgressBar`、`Empty`、`Toast`（带 undo action 槽）。
- `BackendConnect`：桌面端与移动端共用启动入口，输入后端地址 + 账号密码登录，或在首次使用时注册账号；登录后本机保存 token 与当前用户信息。
- `UserMenu`：桌面端 Header 与移动端 AppBar 共用账号入口，展示当前账号、后端地址与当前用户登录会话；用户可撤销自己的会话。
- `PlantStatusTagChips`：`GET /api/v1/plants/:id/status-tags` 拉取 1-2 个短标签；不可用时规则兜底。
- `PlantReflectionFooter`：左下角植物口吻一句话，优先 `GET /api/v1/plants/:id/reflection`。
- 同步层：根部订阅 `GET /api/v1/sync/stream`，按 `resource + plantId` 重拉数据。

移动端（Tauri 安卓手机端）：

- 同一套前端按**运行时检测**分流：安卓平台或窄视口（`<768px`）渲染移动外壳，否则桌面外壳；浏览器缩窗即可预览。判定逻辑在 `lib/usePlatform.ts` 的 `useIsMobile()`。
- 移动外壳 `components/mobile/`：`MobileFrame`（不渲染桌面窗口标题栏，留状态栏安全区）+ `MobileShell`（顶部 AppBar：品牌/页标题/设备入口/更换后端）+ `MobileTabBar`（底部 4 Tab，与 SideNav 同导航项）。
- 移动页面 `pages/mobile/`：Dashboard/PlantDetail/Chat/Journal/Album 竖屏重排，复用全部逻辑层（`lib/*`、`hooks/*`、`config/*`）与基础组件；聊天为全屏单栏 + 可折叠状态面板 + 吸底输入；相册为 2 列网格。
- 逻辑层零 Tauri-window 依赖（纯 fetch/localStorage/SSE），安卓 webview 全兼容；桌面渲染路径不变（零回归）。
- 安卓工程：`lib.rs` 已具 `mobile_entry_point`、`Cargo.toml` 已含 `cdylib`；`tauri android init` 与构建/真机验证由本机执行，步骤见 `docs/android-build.md`（含明文 HTTP `usesCleartextTraffic` 与局域网后端说明）。

---

## 代码结构

- `apps/server`：核心后端。
  - `src/db/migrations`：迁移清单（当前 `001_initial_schema` baseline）。
  - `src/modules/iot`：MQTT broker + topic + 读数入库。
  - `src/modules/proactive`：主动发言 Engine。
- `apps/desktop`：Tauri v2 桌面客户端（React + Rust）。
  - `src/components/Toast.tsx`：全局 toast 系统，支持 undo action。
  - `src/lib/mood.ts`：传感器读数 → 心情/植物视角文案。
- `packages/shared`：共享 schema 和类型定义。
- `hardware/esp32_oled`：ESP32 真实硬件固件。
- `docs`：API、记忆系统、主动发言设计文档。
- `stitch_plant_voice_companion`：Verdant Echo 设计稿原件（已在 Git 中忽略）。
- `projects`：汇报文案及 PPT 生成源文件目录，包含 SVG 与编译产物（已在 Git 中忽略）。
- `AgentGal`：记忆生命周期本地临时存储与实验目录（已在 Git 中忽略）。
- `docs-temp`：临时文档备份与草稿目录（已在 Git 中忽略）。
- `background.md`：本文件。



---

## 数据库表

`plants` / `devices` / `pending_devices` / `sensor_readings` / `plant_status` / `messages` / `plant_photos` / `memory_drafts` / `background_jobs` / `sync_events` / `plant_memories` / `plant_understandings` / `memory_consolidation_state` / `history_window_state` / `proactive_event_log` / `proactive_reminders` / `schema_migrations` / FTS 与向量索引辅助表。

## 核心 API

- 设备：`POST /api/v1/devices/:deviceId/readings`、`GET/POST/PATCH/DELETE/.../api/v1/devices`（认领/忽略/密钥轮换、停用/启用、软删除、批量管理）。
- MQTT：`dyn/devices/:deviceId/readings` 上报读数，`dyn/devices/:deviceId/config` 下发设备密钥；认领设备需 deviceId 作为 username、API Key 作为 password。
- 植物：`GET/POST /api/v1/plants`、`PATCH /api/v1/plants/:id`、`/care-profile/suggest`、`/reflection`、`/status-tags`、`/readings/latest`、`/readings`。
- 聊天：`POST /api/v1/plants/:id/chat`、`/chat/stream`、`GET /messages`。
- 记忆：`GET /memories`、`/understandings`。
- OpenAI-compatible：`POST /v1/chat/completions`、`GET /v1/models`、`/v1/models/:model`。
- 相册：`GET/POST /photos`、`DELETE /photos/:photoId`、`GET /media/photos/:photoId`。
- 同步：`GET /api/v1/sync/events?since=`、`/api/v1/sync/stream?since=`。
- 天气：`/api/v1/weather/now`、`/api/v1/weather/locations?q=`。
- 用户认证：`POST /api/v1/auth/register`、`POST /api/v1/auth/login`、`GET /api/v1/auth/check`、`GET /api/v1/auth/me`、`GET/DELETE /api/v1/auth/sessions`；管理员用户管理使用 `npm run user --workspace @dyn/server -- ...` CLI。

---

## 验证状态

后端：

```powershell
npm run build
npm run test
```

最近一次：服务端测试通过（25 个）。

Smoke 脚本：

- `smoke:device-claim`：unknown → pending → claim → key auth → reading 闭环。已通过。
- `smoke:memory-chat`：三轮对话生成包含唯一标记的长期记忆。已通过。
- `smoke:memory-citation`：直接记忆问题返回 citations，状态/读数问题不会过度引用。已通过。
- `smoke:rerank`：`Qwen/Qwen3-Reranker-8B`。已通过。
- `evaluate:retrieval`：120 条记忆 + 48 个查询，Hybrid + rerank Top-1/Top-3/MRR 均 100%。

Docker / 部署验证（2026-05-28）：

- 已新增后端 Dockerfile 与 `.dockerignore`，镜像 `ccckfg/dyn:latest` 本地构建通过。
- 已新增 `docker-compose.yml`，可用于服务器单实例灰度部署。
- 本地镜像已打 `ccckfg/dyn:latest` 与 `ccckfg/dyn:v0.1.0` 标签。
- 本地临时容器验证通过：`/health`、`APP_ACCESS_KEY` 鉴权、pending 设备、认领并新建植物、设备密钥上报、按新 `plantId` 读取最新读数均正常；测试容器已删除。
- Docker Hub 推送已完成：`ccckfg/dyn:latest` 与 `ccckfg/dyn:v0.1.0` 均已推送，digest 为 `sha256:72c3dc7876f1f415ed05bfa393c7b5587d842f08a968ab84362264848b8b02c8`。
- 部署指南已写入 `docs/docker-deployment.md`。

桌面客户端：

```powershell
npm run build:desktop
npm run tauri:build
```

最近一次 Tauri v2.11.2 + Rust release 已产出 msi + nsis。
2026-05-28：多植物相关路由跳转与 API path 已统一编码 `plantId`，并拆分 Dashboard/Chat/Journal 的复用组件；`npm run build:desktop` 与 `npm run build` 均通过，TS/TSX 文件已无超过 300 行的文件。
2026-05-31：新增移动端（安卓手机）UI —— 运行时检测分流的移动外壳（`components/mobile/`）+ 5 个移动页面（`pages/mobile/`），复用全部逻辑层与基础组件，桌面渲染路径不变。`npm run build:desktop` 通过（tsc + vite，114 模块）。安卓 `tauri android init`/真机验证待本机执行，指南见 `docs/android-build.md`。

ESP32 真实验证（2026-05-25）：OLED/SHT40/GY-302/土壤 ADC 实测可用；HTTP 上传通过；2026-05-27 编译验证含 MQTT 1 秒级上报、断线重连、设备密钥持久化、SoftAP 配网、OTA；2026-05-28 编译验证通过 MQTT config topic 自动接收并保存认领密钥。

---

## 仍未完成

### 后端

- 历史无密钥设备强制迁移。
- 后台任务/同步事件的多实例分布式化（外部 pub/sub）。
- 天气城市切换 UI。
- 生产级日志策略、版本化发布流程、Docker Hub 推送凭证收口。
- 端到端测试（设备 → 状态 → memory → retrieval → chat 全链路）。

### LLM / Embedding

- 闭合 / 生成 prompt 用更长尾的真实语料压测。
- rerank 选用 `Qwen/Qwen3-Reranker-8B`，已真实跑通。
- 无 LLM 时只能闭合传感器异常事件，普通对话型记忆不会完整生成 episode。

### 硬件

- 土壤湿度干土/湿土校准。
- 长期运行稳定性观察。
- ESP32 真实设备 MQTT 长跑、OTA 升级演练。

### 桌面客户端

- 编辑档案表单、删除植物。
- 头像裁剪/构图工具。
- 读数趋势图（折线 / 区域）。
- 提醒管理 UI。
- 深色模式。
- 相册：编辑描述、收藏、设为封面。
- 多用户体系的权限边界细化（当前已支持注册、登录、CLI 用户管理与登录会话记录）。
- 安卓端：`tauri android init` 与 APK/真机验证（需本机 Android SDK/NDK/JDK）尚未在本环境执行，仅 UI + 配置 + 文档就绪。

---

## 完成度

| 模块 | 进度 |
| --- | --- |
| 硬件数据接入后端 | 92% |
| 植物状态/规则引擎 | 65% |
| 聊天接口 | 70% |
| 天气接入 | 75% |
| 记忆系统架构 | 85% |
| 记忆系统生产稳定性 | 75% |
| OpenAI-compatible 接口 | 75% |
| 实时同步 | 75% |
| 工程化/部署/安全 | 50% |
| **整体后端** | **约 90%** |
| Tauri 桌面客户端骨架 | 100% |
| 设计稿落地（5 页） | 100% |
| 后端联调 | 100% |
| Windows 安装包 | 100% |
| 真实图片上传 | 100% |
| 设备认领 UI | 75% |
| **整体桌面客户端** | **约 87%** |

---

## 常用命令

```powershell
# 安装 / 构建 / 测试
npm install
npm run build              # shared + server + desktop
npm run build:desktop      # 仅 shared + desktop（不编译 Rust）
npm run test

# 服务端 / 模拟器
npm run dev:server
npm run simulate           # SIM_SCENARIO=normal/dry/wet/dark/hot/cycle
npm run smoke:device-claim
npm run smoke:memory-chat
npm run smoke:memory-citation
npm run smoke:rerank

# 桌面客户端
npm run tauri:dev          # 全栈联调，自动 spawn vite
npm run dev:desktop        # 仅 web 调试 (http://localhost:5173)
npm run tauri:build        # 重新生成 Windows 安装包
```

默认服务地址：`http://127.0.0.1:8787`。客户端启动后需手动输入后端地址 + 账号密码；首次使用可注册首个管理员账号，之后通过登录 token 访问后端。

---

## 下一步优先级

1. **设备认领闭环**：历史无密钥迁移、真实设备长跑验证。
2. **真实 LLM 深度联调**：用更自然的语料压测 closure / generator prompt。
3. **设备鉴权收口**：ESP32 自动接收认领密钥的真实现场验证，保留离线手动写入兜底。
4. **数据库 migration**：新增 schema 走递增 migration，补备份/回滚。
5. **端到端测试**：覆盖 background_jobs 重试、sync_events 断线补收。
6. **ESP32 现场验证**：MQTT 长跑、OTA 升级演练、土壤校准。
7. **桌面客户端二阶段**：档案表单、趋势图、提醒管理、深色模式。

---

## 当前开发原则

- Python 工具用 `uv`。
- TypeScript 后端保持 API/业务/数据库/记忆/LLM 客户端分层。
- 桌面前端保持 `pages/` 装配、`components/` 复用、`lib/` 派生逻辑分离。
- 单文件控制在 300 行以内。
- 修改架构、接口、完成度、待办或验证结论，必须同步更新本文件。
- 不把未完成能力写成已完成。
- LLM 只能基于传感器、规则、用户告知和长期记忆回答，**不能编造感知**。
- 客户端样式严格走 Verdant Echo token，不引入冲突颜色或字体。
- **所有用户可见文案必须遵循「人文关怀」五原则**：植物视角、撤销 > 确认、诚实优先、共情细节、呼吸感动效。
