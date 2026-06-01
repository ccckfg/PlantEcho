# Handoff 2026-05-17

## 项目概况

项目名称：基于 ESP32 与大语言模型的智能植物陪伴与养护系统。

根据 `期中汇报/期中汇报.md`，整体目标是用 ESP32 采集植物环境数据，再由 Node.js 服务端接收、存储并结合大语言模型生成拟人化养护建议，最终通过 Tauri v2 客户端展示植物状态、对话和提醒。

目标架构：

- 硬件端：ESP32 + 土壤湿度、温湿度、光照传感器，通过 HTTP 或 MQTT 上传数据。
- 服务端：Node.js，负责设备数据、用户/植物档案、对话记录、LLM 中间件、长期记忆、RAG、提醒策略。
- 客户端：Tauri v2，支持 Windows、Android、macOS，提供植物档案、状态查看、聊天、提醒。

当前项目已经从“只完成架构设计”推进到了“ESP32 开发环境 + OLED 显示验证已跑通”的状态。

## 当前仓库状态

当前根目录：`C:\Users\Lenovo\Desktop\Project N\DYN`

主要文件：

- `期中汇报/期中汇报.md`：项目期中汇报和总体架构说明。
- `pyproject.toml`：uv 管理的 Python 工具环境，当前只固定 PlatformIO。
- `uv.lock`：uv 锁文件。
- `hardware/esp32_oled/platformio.ini`：ESP32 PlatformIO 工程配置。
- `hardware/esp32_oled/src/main.cpp`：ESP32 + OLED 测试/动画固件。
- `handoff_5_17.md`：本文档。

注意：当前目录还不是 Git 仓库。后续建议先初始化 Git，并添加 `.gitignore`，至少忽略 `.venv/`、`.pio/`、`*.pyc`、构建产物和本地密钥文件。

## 开发环境状态

已经配置为 uv 管理虚拟环境：

- uv 已可用。
- `.venv` 已创建。
- PlatformIO Core 已安装到 `.venv`，版本为 `6.1.19`。
- `pyproject.toml` 当前内容为：

```toml
[project]
name = "dyn-hardware-tools"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = [
    "platformio==6.1.19",
]
```

常用命令：

```powershell
uv sync
.\.venv\Scripts\platformio.exe run -d hardware\esp32_oled
.\.venv\Scripts\platformio.exe run -d hardware\esp32_oled -t upload
.\.venv\Scripts\platformio.exe device monitor -p COM9 -b 115200
```

如果 COM 口变化，需要修改 `hardware/esp32_oled/platformio.ini` 里的：

```ini
upload_port = COM9
monitor_port = COM9
```

## 硬件当前状态

### ESP32

当前开发板通过 CH340 USB 串口连接电脑，正常时显示为：

```text
USB-SERIAL CH340 (COM9)
Status: Started
```

PlatformIO 上传时识别到的芯片信息：

```text
Chip is ESP32-D0WDQ6 (revision v1.0)
Features: WiFi, BT, Dual Core, 240MHz
```

如果电脑看不到 COM9，优先检查 Type-C 线、USB 口、扩展板/主板接触。之前出现过 COM9 断开又恢复的情况。

### OLED 屏幕

当前使用的是 4 针 I2C OLED，丝印为：

```text
GND VCC SCL SDA
```

当前推荐接线：

```text
OLED GND -> ESP32 GND
OLED VCC -> ESP32 3V3
OLED SCL -> ESP32 GPIO22 / D22
OLED SDA -> ESP32 GPIO21 / D21
```

屏幕是 SSD1306 类 128x64 单色 OLED，不能显示 RGB 彩色，只能显示单色像素、文字、图标、线条和黑白位图。

当前固件功能：

- 自动扫描 OLED I2C 地址。
- 自动尝试 `SDA=21/SCL=22` 和反接组合，便于排查接线。
- 屏幕显示 `DYN Plant Pal` 小植物动画。
- 动态显示 Soil、Temp、Sun 三个模拟状态条。
- 底部滚动文字。
- 每帧发送 OLED 唤醒命令。
- 每 15 秒尝试重新初始化 OLED 面板，缓解热插拔后黑屏。
- 串口每 2 秒输出运行状态。

当前稳定运行日志示例：

```text
OLED animation OK, uptime 28s
OLED panel reinitialized
OLED animation OK, uptime 30s
```

### 已知硬件问题

- OLED 热插拔后可能黑屏，但 I2C 仍显示通信正常。这通常是 OLED 控制芯片还在回应，但面板/升压显示部分没有完整重新上电。
- 如果只拔 OLED 的 VCC/GND，SDA/SCL 还连接 ESP32，可能出现“半供电”状态。
- 如果屏幕黑但串口显示 `OLED animation OK`，优先完整断电重启：拔掉 ESP32 Type-C，等 5 秒，确认四根 OLED 线插紧，再重新插上。
- 当前硬件连接曾经出现过接触不稳，建议后续使用面包板、短线或焊接排针来提高可靠性。

## 已购/待购传感器建议

传感器还在运输中时，软件可以先用模拟数据开发。后续硬件建议按这个顺序接入：

1. 电容式土壤湿度传感器
   - 关键词：`电容式 土壤湿度传感器 v1.2` 或 `DFRobot SEN0193`
   - 不建议用裸露金属叉子的电阻式土壤湿度传感器，容易腐蚀。
   - 建议接 ESP32 ADC1 引脚，例如 GPIO32、GPIO33、GPIO34、GPIO35。
   - 避免 ADC2 引脚，因为 ESP32 使用 Wi-Fi 时 ADC2 可能冲突。

2. 温湿度传感器
   - 推荐：SHT40、SHT31 或 AHT20。
   - 优先 I2C 模块，可与 OLED 共用 SDA/SCL。

3. 光照传感器
   - 推荐：BH1750。
   - 输出 lux，更适合植物光照判断。
   - I2C 模块，可与 OLED 共用 SDA/SCL。

建议第一阶段购买/使用：

```text
电容式土壤湿度传感器 x2
SHT40 或 SHT31 温湿度模块 x1
BH1750 光照模块 x1
面包板 x1
杜邦线若干
```

自动浇水功能放到后面再做，届时再考虑：

```text
小水泵
MOSFET 驱动模块或继电器模块
外部电源
水箱液位传感器或浮球开关
```

## 下一步软件开发建议

下面建议按“先跑通闭环，再逐步智能化”的顺序做。传感器未到货时，先用模拟数据开发服务端和客户端。

### 第一步：整理工程结构

建议把仓库整理成：

```text
apps/
  server/          Node.js 服务端
  desktop/         Tauri v2 客户端，后续创建
hardware/
  esp32_oled/      当前 PlatformIO 硬件工程
packages/
  shared/          共享类型、数据协议、校验 schema
docs/
  handoff/         后续交接文档
```

短期不一定要一步到位 monorepo 工具链，但至少建议先建立：

- `.gitignore`
- `README.md`
- `.env.example`
- `docs/api.md`
- `docs/device-payload.md`

### 第二步：先做 Node.js 服务端 MVP

建议从 HTTP 开始，不急着上 MQTT。HTTP 调试更直接，ESP32 和模拟脚本都容易发送。

推荐技术：

- Node.js + TypeScript
- Fastify 或 Express
- SQLite 作为本地数据库
- Drizzle 或 Prisma 管理 schema
- Zod 做请求体校验

第一版核心目标：能接收设备数据、存起来、查最新状态。

建议数据表：

```text
plants
  id
  name
  species
  avatar_url
  location
  care_profile_json
  created_at
  updated_at

devices
  id
  plant_id
  name
  api_key_hash
  last_seen_at
  created_at

sensor_readings
  id
  device_id
  plant_id
  captured_at
  soil_raw
  soil_percent
  air_temp_c
  air_humidity_percent
  light_lux
  rssi
  battery_mv

conversations
  id
  plant_id
  title
  created_at

messages
  id
  conversation_id
  role
  content
  created_at
```

建议第一批 API：

```http
POST /api/v1/devices/:deviceId/readings
GET  /api/v1/plants
POST /api/v1/plants
GET  /api/v1/plants/:plantId
GET  /api/v1/plants/:plantId/readings/latest
GET  /api/v1/plants/:plantId/readings?from=&to=
POST /api/v1/plants/:plantId/chat
```

设备上传 payload 建议先固定为：

```json
{
  "capturedAt": "2026-05-17T12:00:00+08:00",
  "soilRaw": 2210,
  "soilPercent": 48,
  "airTempC": 25.6,
  "airHumidityPercent": 62.1,
  "lightLux": 850,
  "rssi": -54,
  "batteryMv": null
}
```

传感器未到货前，先写一个模拟器脚本：

```text
apps/server/scripts/simulate-device.ts
```

每 5 到 10 秒向服务端 POST 一条假数据。这样客户端可以先开发状态页和图表。

### 第三步：服务端先内置规则引擎

不要一开始就让 LLM 直接决定“该不该浇水”。先做确定性的养护规则，再让 LLM 负责把结论说得自然。

建议先实现：

```text
soilPercent < 阈值        -> 需要浇水
lightLux 连续偏低         -> 需要增加光照
airHumidityPercent 过低   -> 空气偏干
airTempC 过高/过低        -> 温度风险
```

每种植物可以有自己的 care profile：

```json
{
  "soil": { "min": 35, "max": 75 },
  "light": { "minLux": 800, "maxLux": 15000 },
  "temperature": { "minC": 15, "maxC": 30 },
  "humidity": { "min": 40, "max": 80 }
}
```

后续 RAG 和植物知识库可以补充这个 profile，但第一版先手写几种常见植物即可。

### 第四步：客户端先做 Web 原型，再迁 Tauri

Tauri v2 最终要做，但第一阶段建议先用普通 Web 页面跑通交互：

- Vite + React
- 调用本地 Node.js API
- 后续直接作为 Tauri 前端复用

第一版页面：

- 植物列表
- 植物详情页
- 最新传感器状态卡片
- 最近 24 小时趋势图
- 植物聊天窗口

注意界面应该更像一个“工具 + 陪伴”的状态面板，不需要做成营销首页。

### 第五步：LLM 接入策略

服务端需要作为 LLM 中间件，和期中汇报保持一致。建议分两层：

1. 项目内部聊天接口：

```http
POST /api/v1/plants/:plantId/chat
```

2. OpenAI 兼容接口，后续给第三方客户端用：

```http
POST /v1/chat/completions
```

第一版可以先 mock LLM 返回，保证前后端流程通。真实接入时，把 prompt 上下文固定为：

```text
植物档案
植物习性 profile
最新传感器读数
最近趋势摘要
规则引擎判断结果
用户最近对话
```

关键原则：

- 规则引擎负责风险判断。
- LLM 负责拟人化表达和解释。
- 不要让 LLM 直接编造传感器数据。
- 所有养护建议都要能追溯到 profile、实时数据或知识库。

### 第六步：传感器到货后的硬件固件计划

当前 `hardware/esp32_oled` 可以继续演进为正式固件。

建议模块化：

```text
src/
  main.cpp
  display.h / display.cpp
  sensors.h / sensors.cpp
  network.h / network.cpp
  config.h
```

第一版真实传感器目标：

- OLED 显示真实土壤湿度、温度、湿度、光照。
- ESP32 连接 Wi-Fi。
- 每 30 到 60 秒 POST 一次数据到 Node.js 服务端。
- 上传失败时串口输出错误，OLED 上显示离线图标或 `NET ERR`。

土壤湿度必须做校准：

```text
dryRaw = 传感器在空气中读数
wetRaw = 传感器插入湿土/水中读数
soilPercent = map(raw, dryRaw, wetRaw, 0, 100)
```

注意不同土、不同传感器读数差异很大，不要直接相信固定阈值。

## 推荐近期里程碑

### Milestone 1：软件闭环，无真实传感器

目标：

- Node.js 服务端启动。
- 模拟设备脚本持续上传假数据。
- Web 页面能显示最新读数和趋势。
- 聊天接口能基于假数据返回一句拟人化建议。

验收：

```text
打开客户端 -> 看到植物当前状态 -> 模拟数据变化 -> 页面刷新/轮询后更新 -> 聊天能提到当前水分/光照状态
```

### Milestone 2：ESP32 上传真实或半真实数据

目标：

- ESP32 连接 Wi-Fi。
- 在传感器未全到货时，先上传假 soil/temp/light。
- 后续逐个替换成真实传感器读数。

验收：

```text
ESP32 串口显示 HTTP 200
服务端数据库出现 readings
客户端展示 ESP32 上传的数据
```

### Milestone 3：植物角色与规则建议

目标：

- 可以创建植物档案。
- 每个植物有 care profile。
- 服务端根据实时数据生成状态标签：健康、缺水、弱光、温度风险等。
- LLM 把规则结果改写成植物口吻。

验收：

```text
当 soilPercent 低于阈值，聊天回复会明确提醒浇水，并解释依据是土壤湿度偏低
```

## 下一位开发者优先 TODO

1. 初始化 Git，添加 `.gitignore`。
2. 新建 `apps/server`，搭 Node.js + TypeScript 服务端。
3. 先实现 SQLite 数据库和 `POST /api/v1/devices/:deviceId/readings`。
4. 写一个模拟设备脚本，传感器未到货时先用假数据。
5. 新建 Web 原型页面，显示植物状态和最近读数。
6. 固定设备 payload schema，后续 ESP32 固件按这个协议上传。
7. 等传感器到货后，先接 BH1750 和 SHT40/SHT31，再接土壤湿度。

## 当前风险和建议

- 硬件接触仍是最大不确定因素，建议尽快用面包板或焊接固定 OLED/传感器线。
- OLED 黑屏时不要只按 EN，如果 I2C 仍正常但屏幕黑，应完整断电重启 ESP32 和 OLED。
- COM 口可能变化，上传失败时先检查 `USB-SERIAL CH340` 当前 COM 号。
- 传感器到货前不要等硬件，服务端和客户端完全可以用模拟数据推进。
- 第一版不建议同时做 MQTT、RAG、天气、推送。先用 HTTP 跑通设备到服务端到客户端到聊天的主链路。
