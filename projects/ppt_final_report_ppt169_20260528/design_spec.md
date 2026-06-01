# DYN Plant Pal (PlantEcho) 期末汇报 PPT - Design Spec

## I. Project Information

| Item | Value |
| ---- | ----- |
| **Project Name** | DYN Plant Pal (PlantEcho) 期末汇报 |
| **Canvas Format** | PPT 16:9 (1280x720) |
| **Page Count** | 17 页 |
| **Design Style** | Verdant Echo (温润人文主义森林风格) |
| **Target Audience** | 答辩评审教授、全栈开发技术同行、人文交互设计师 |
| **Use Case** | 课程期末项目答辩、工程落地技术分享 |
| **Created Date** | 2026-05-28 |

---

## II. Canvas Specification

| Property | Value |
| -------- | ----- |
| **Format** | PPT 16:9 |
| **Dimensions** | 1280x720 |
| **viewBox** | `0 0 1280 720` |
| **Margins** | 左/右 60px, 上/下 50px |
| **Content Area** | 1160x620 |

---

## III. Visual Theme

### Theme Style

* **Style**: Verdant Echo (森林与土壤配色，拒绝冷冰冰的传感器看板，融入温润植物温度)
* **Theme**: 浅色温润模式 (Light Organic Theme)
* **Tone**: 人文关怀、温暖共情、精致严谨、工程落地

### Color Scheme

| Role | HEX | Purpose |
| ---- | --- | ------- |
| **Background** | `#F4F6F4` | 浅雪花石膏绿白，富有机感和温润纸质感，护眼，有温度 |
| **Secondary bg** | `#FFFFFF` | 纯白卡片，突出呼吸感悬浮 |
| **Primary** | `#2B583E` | 森林暗绿 (Forest Green)，象征生命与植物主体 |
| **Accent** | `#8E5B3C` | 泥土褐 (Earth Brown)，象征养护基底与硬件稳重性 |
| **Secondary accent** | `#DDA43B` | 温暖琥珀 (Warm Amber)，代表阳光、警示与活力，柔和不刺眼 |
| **Body text** | `#1C2E24` | 墨绿深黑，比纯黑更柔和，阅读舒适 |
| **Secondary text** | `#4D5F54` | 墨绿灰，用于次要说明与属性值 |
| **Tertiary text** | `#809085` | 页脚、备注文案、页码 |
| **Border/divider** | `#D1DAD4` | 淡绿灰，用于精细的渐变和卡片描边 |
| **Success** | `#3B8756` | 嫩芽绿，正向操作与健康读数 |
| **Warning** | `#D64535` | 琥珀红，状态异常与干枯提醒 (柔和警告) |

### Gradient Scheme

```xml
<!-- Title gradient: 森林暗绿渐变到泥土褐，突显人文与土地的交融 -->
<linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#2B583E"/>
  <stop offset="100%" stop-color="#8E5B3C"/>
</linearGradient>

<!-- Warm glow: 柔和的植物发光背景微动效式渐变 -->
<radialGradient id="organicGlow" cx="90%" cy="10%" r="60%">
  <stop offset="0%" stop-color="#2B583E" stop-opacity="0.08"/>
  <stop offset="60%" stop-color="#DDA43B" stop-opacity="0.04"/>
  <stop offset="100%" stop-color="#F4F6F4" stop-opacity="0"/>
</radialGradient>

<!-- Green to brown accent gradient -->
<linearGradient id="accentGradient" x1="0%" y1="100%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#2B583E"/>
  <stop offset="100%" stop-color="#DDA43B"/>
</linearGradient>
```

---

## IV. Typography System

### Font Plan

* **Typography direction**: 温暖圆润亲和体结合现代无衬线体 (Rounded Friendly & CJK Sans)
* **Design intent**: 标题使用极具亲和力、微圆角的 `Quicksand` 作为英文，搭配圆润清新的 `"Microsoft YaHei"`（雅黑）用于中文，符合“系统说人话”的温暖人设；正文采用高度精巧、可读性极佳的 `Plus Jakarta Sans`，确保在 dense 布局下依然保持清爽的“呼吸感”。

| Role | Chinese | English | Fallback tail |
| ---- | ------- | ------- | ------------- |
| **Title** | `"Microsoft YaHei"` | `Quicksand` | `sans-serif` |
| **Body** | `"Microsoft YaHei"` | `Plus Jakarta Sans` | `sans-serif` |
| **Emphasis** | `"Microsoft YaHei"` | `Quicksand` (Bold) | `sans-serif` |
| **Code** | — | `Consolas` | `monospace` |

**Per-role font stacks** (SVG `font-family` strings, formatted verbatim):

* Title: `Quicksand, "Microsoft YaHei", "PingFang SC", sans-serif`
* Body: `"Plus Jakarta Sans", "Microsoft YaHei", "PingFang SC", sans-serif`
* Emphasis: `Quicksand, "Microsoft YaHei", sans-serif`
* Code: `Consolas, "Courier New", monospace`

### Font Size Hierarchy

**Baseline**: Body font size = `18px` (由于期末汇报涉及全栈软硬件架构细节、数据库设计以及指标压测，属于信息量偏大的 **Dense (高密度)** 结构，故基线选择 18px 以保证图表与数据呈现的极度精致与工整)。

| Level | Ratio to body | px @ body=18 (Dense) | Weight / Style |
| ----- | ------------- | -------------------- | -------------- |
| Cover title | 3.5x | 63px | Bold / Heavy |
| Chapter opener | 2.2x | 40px | Bold |
| Page title | 1.8x | 32px | Bold |
| Hero number (KPI) | 2.0x | 36px | Bold |
| Subtitle | 1.33x | 24px | SemiBold |
| **Body content** | **1x** | **18px** | Regular |
| Annotation / caption | 0.78x | 14px | Regular |
| Page number / footer | 0.55x | 10px | Regular |

---

## V. Layout Principles

### Page Structure

* **Header area** (Height: 90px): 包含汇报所属板块的精细 Chip 标签 (例如：`起源与初心`、`服务端大脑`)，优雅的页标题 (Page Title, 32px)，以及顶部的森林绿细窄线饰。
* **Content area** (Height: 520px): 内容主舞台，采用圆角卡片 (border-radius: 12px)、阴影柔和渐变以及宽敞留白。
* **Footer area** (Height: 40px): 包含植物口吻的“温润呼吸金句” (例如：*“我正朝着阳光伸展... — 小绿”*)、答辩人组员信息、细分的页码标记。

### Layout Pattern Library

我们有意识地将布局结构化地在不同页面间切换，打造呼吸跳动的叙事体验，严禁出现单调的“千页一网格”反模式：
* **Single column centered**: 用于封面 (P01)、期中与期末蜕变过渡 (P13) 和谢幕 (P17)。
* **Symmetric split (5:5)**: 用于人文关怀原则 (P03)、Tauri与Tauri客户端体验 (P10, P11)。
* **Asymmetric split (3:7)**: 用于整体架构 (P04)、硬件物联 (P05) 以及记忆生命周期 (P08)。
* **Top-bottom split**: 用于硬件OTA与长跑稳定性 (P06) 以及未来展望 (P16)。
* **Three/four column cards**: 用于数据库结构设计、核心API以及质量保障测试 (P07, P14)。
* **Full-bleed + floating text**: 用于引发痛点反思 (P02) 以及人文慢交互体验页面 (P12)。

### Spacing Specification

**Universal Spacing**:
* 页面安全边距 (Safe margin): `60px`
* 卡片间距 (Card gap): `28px`
* 文本段落行高 (Line height): `1.5` (27px)
* 图标与文字间距 (Icon-text gap): `12px`

**Card Details**:
* 边框圆角 (Border radius): `12px`
* 卡片阴影: `drop-shadow(0px 8px 24px rgba(43, 88, 62, 0.04))`
* 描边粗细: `1px` (`#D1DAD4`)

---

## VI. Icon Usage Specification

### Source

* **Icon Library**: `tabler-filled`
* **Syntax**: `<use data-icon="tabler-filled/icon-name" .../>`
* **Brand Library**: `simple-icons` (仅用于 Docker、GitHub 等产品图标)

### Recommended Icon List

为了绝对保障 PPT 的设计精致性，我们在 `tabler-filled` 库中预选了以下高频词汇图标，Executor在画图时必须直接采用且严禁混用其他库：

| Core Concept | Icon Path | Purpose / Used Page |
| ------------ | --------- | ------------------- |
| 植物 / 生命 | `tabler-filled/leaf` | 封面、人文关怀、温室主页 |
| 聊天 / 共情 | `tabler-filled/message-circle` | 植物会说话、主动发言引擎、植响对话 |
| 传感器 / 科技 | `tabler-filled/device-cpu` | 整体架构、硬件感知层、OTA更新 |
| 数据库 / 记忆 | `tabler-filled/database` | 记忆系统架构、SQLite数据库表 |
| 大脑 / AI | `tabler-filled/brain` | LLM大脑、AgentGal 长期记忆 |
| 相册 / 记录 | `tabler-filled/photo` | 成长成长相册、慢节奏交互 |
| 天气 / 阳光 | `tabler-filled/sun` | 和风天气代理、一键浇水 |
| 质量 / 测试 | `tabler-filled/shield-check` | 验证状态与压测、100%检索率 |
| 容器 / 发布 | `simple-icons/docker` | 部署发布、Docker Hub 镜像推送 |
| 发展 / 规划 | `tabler-filled/rocket` | 未来规划、下一步二阶段二期 |
| 目标 / 结语 | `tabler-filled/heart` | 总结与谢幕、自然呼吸 |

---

## VII. Visualization Reference List

为了严谨地对项目技术实现进行建模，Strategist 经过检索确定，使用以下 `templates/charts/` 下的专属关系图表模版：

```
Catalog read: 42 templates / 9 categories
Runners-up considered:
  - causal_chain (rejected: 仅适合表达单向因果关系，无法呈现项目的双回路循环架构)
  - pyramid_diagram (rejected: 层次分明但无法体现“硬件-云端-客户端”并行的扁平物联状态)
  - multi_donut_chart (rejected: 项目测试结果用直观的柱状图即可，多圈环形图过于花哨)
```

| Visualization Type | Reference Template | Used In | Purpose |
| ------------------ | ------------------ | ------- | ------- |
| **system_architecture** | `templates/charts/layered_architecture.svg` | Slide 04 | 展示硬件端、服务端大脑与客户端的三层物联通信机制 |
| **milestone_timeline** | `templates/charts/process_timeline.svg` | Slide 13 | 呈现期中到期末开发历程的蜕变里程碑 |
| **vector_memory_cycle** | `templates/charts/loop_process.svg` | Slide 08 | 表现 AgentGal 式记忆生命周期的流动 consolidate 状态 |
| **growth_kpi_dashboard**| `templates/charts/kpi_dashboard.svg` | Slide 14 | 以 MBB 等级的卡片仪表盘展现 SQLite-vec 检索与测试数据 |

---

## VIII. Image Resource List

本项目主要以自主绘制的高品质矢量 SVG 插图和架构图呈现。为了渲染温暖人文的自然呼吸感，部分特色页面将引入极高品质的氛围意境插画。

| Filename | Dimensions | Ratio | Purpose | Type | Status | Generation Description |
| -------- | --------- | ----- | ------- | ---- | ------ | --------------------- |
| `cover_nature.png` | 1280x720 | 1.78 | 封面底纹，烘托清新森林氛围 | Background | Pending | "Dreamy double exposure of a lush green indoor plant leaf and gentle morning sunrays, warm particles, soft forest green and warm amber tones, organic texture, beautiful bokeh, extremely aesthetic" |
| `pain_point.png` | 400x520 | 0.77 | 展现干瘪冰冷的表格现状，形成反差 | Illustration | Pending | "A cold, technical gray bar chart on a computer monitor with neon red grid lines, isolated in a dark minimalistic space, symbolizing cold industrial sensor telemetry" |
| `human_care.png` | 500x380 | 1.31 | 拟人化温暖共情示意，植物开花微笑 | Illustration | Pending | "Flat vector illustration of a cute potted green plant with a friendly smiling face, surrounded by warm floating bubble thoughts of green hearts, aesthetic organic design" |

---

## IX. Content Outline

### Part 1: 起源与设计哲学 (P01 - P03)

#### Slide 01 - Cover (PPT 封面页)
* **Page Rhythm**: `anchor`
* **Layout**: Asymmetric Figure-text overlap (左侧清爽大气的 Quicksand 英文字符，右侧悬浮融合 `cover_nature.png` 自然露水绿叶底图)
* **Title**: 与植物一起呼吸的陪伴 (63px, Bold, #2B583E)
* **Subtitle**: 基于 ESP32 与大语言模型的智能植物陪伴系统 (24px, Medium, #8E5B3C)
* **Content**: 
  * 汇报人：邓雅宁、程宇择 (18px)
  * 指导教师：智农小组成员 2501 (18px)
* **Speaker Notes**: 开场问候，向评委阐述 DYN Plant Pal 诞生的故事，这不只是一套监控软件，而是一个可以让生命“呼吸”并与人对话的情感载体。

#### Slide 02 - 痛点与思考：突破“冷冰冰的看报表” (痛点引入)
* **Page Rhythm**: `breathing`
* **Layout**: Asymmetric split (3:7, 左侧为 30% 氛围留白与高对比度文字，右侧为 70% 引入冷色系数据网格插图 `pain_point.png`)
* **Title**: 为什么传统的智能养护总是“冷冰冰”？
* **Content**:
  * 🔴 读数孤岛：满屏的“水分: 23%”，并没有让用户产生真正的牵挂与照料动力。
  * 🔴 缺乏语境：传感器读数并不等于植物心情，简单地阈值报警容易引发用户焦虑。
  * 🔴 单向监控：没有植物的及时回馈与记忆，养护退化为一件被动的“物理打理”。
* **Speaker Notes**: 指出痛点，现在的智能硬件看板充斥着枯燥的数据，我们在思考如何将冰冷的数据转换成温柔的、植物人设视角的真诚对话。

#### Slide 03 - 核心哲学：人文关怀五原则 (设计基石)
* **Page Rhythm**: `dense`
* **Layout**: Three column cards (3列暖绿圆角卡片横向平铺，每张卡片含 tabler-filled 图标)
* **Title**: 让代码拥有温度：五大“人文关怀”原则
* **Content**:
  * **原则 1：系统说人话** (第一人称植物视角，否定句变邀请句)
  * **原则 2：尊重用户节奏** (5秒撤销 toast 替代强硬弹窗，呼吸感 380ms 缓动切换)
  * **原则 3：操作信任与诚实** (本地预设兜底如实告知，撤销 > 强确认，控制权归用户)
* **Speaker Notes**: 汇报项目的五大设计哲学：系统说人话、慢节奏宽容设计、操作诚实、高敏感共情细节、微交互的自然呼吸感。这是指引系统前后端所有设计的灵魂。

---

### Part 2: 软硬件整体架构 (P04 - P06)

#### Slide 04 - 整体架构：硬件、服务端与客户端 (系统全景图)
* **Page Rhythm**: `dense`
* **Layout**: Asymmetric split (3:7, 左侧为文字阐述，右侧为精细绘制的三层 layered_architecture 拓扑图)
* **Title**: 硬件感知 · 服务端大脑 · 跨平台终端
* **Visualization**: `layered_architecture` (呈现 ESP32 采集层、Node.js 记忆引擎层、Tauri 客户端层)
* **Content**:
  * **硬件端 (ESP32)**：多源传感器高频采集，通过 MQTT 主动推流，具备OTA与持久化能力。
  * **服务端 (Node.js)**：基于 Fastify 的多模块高并发后端，掌管 SQLite 数据库与 AgentGal 记忆引擎。
  * **客户端 (Tauri v2)**：基于 React+Vite 构建的轻量级桌面端，多植物路由控制， SSE 实时数据同步。
* **Speaker Notes**: 解释系统三大层级的紧密互联：底层的传感器实时捕获环境，云端中枢负责将数据转化为带有情感和长期记忆的“植物反思”，前端进行温柔的呼吸感落地呈递。

#### Slide 05 - 硬件端：多传感器感知与 MQTT 通信 (硬件层)
* **Page Rhythm**: `dense`
* **Layout**: Two column symmetric split (左侧为硬件板卡与接线图示卡片，右侧为传感器工作原理)
* **Title**: ESP32 核心感知与毫秒级 MQTT 接入
* **Content**:
  * **高灵敏传感芯片**：
    * 土壤湿度 (ADC) + 温湿度 SHT40 (I2C 0x44)
    * 光照强度 GY-302/BH1750 (I2C 0x23)
  * **MQTT 主动上报**：使用极低开销的 `dyn/devices/:deviceId/readings` 进行秒级状态同步。
  * **SoftAP 极简配网**：长按 BOOT 键 3 秒，开启 SoftAP 供用户手机/电脑轻松认领设备。
* **Speaker Notes**: 展示真实的硬件端设计，ESP32 挂载了高精度的传感器，通过 NVS 芯片持久化存储密钥，并通过 SoftAP 实现了小白级别的傻瓜配网。

#### Slide 06 - 固件弹性：数据持久化与 OTA 更新 (稳定防线)
* **Page Rhythm**: `breathing`
* **Layout**: Top-bottom split (上方为大尺寸 NVS 密钥下发交互流程，下方为 OTA Manifest 安全防线结构)
* **Title**: 持久化与在线更新：硬件生命的持久护航
* **Content**:
  * **认领密钥自动下发**：MQTT config 主题自动下发 API Key 并安全写入 NVS 持久区。
  * **OTA 在线更新机制**：系统通过 manifest 校验版本并拉取最新 bin 文件，实现无感热升级。
  * **离线安全守护**：在网络抖动或后端离线时，固件启动降级保护，闪存存储防丢失。
* **Speaker Notes**: 汇报硬件的高可用性设计，哪怕在离线情况下，设备也能正常运作，并展示了通过 OTA 实现远程无缝刷机的稳定路径。

---

### Part 3: 云端大脑与向量记忆系统 (P07 - P09)

#### Slide 07 - 服务端中枢：分层模块化设计 (后端技术)
* **Page Rhythm**: `dense`
* **Layout**: Three column cards (3张并列卡片，从底层到外展清晰解构 Node.js 服务端)
* **Title**: 基于 Node.js + TypeScript 的分层高并发服务端
* **Content**:
  * **Fastify 核心框架**：配合 Zod 进行极其严苛的输入校验，确保设备密钥轮换的接口安全。
  * **SQLite 数据底座**：在轻量嵌入式场景下兼顾多表复杂级联，并通过 WAL 模式应对多线程写入。
  * **实时同步机制**：通过 SQLite 产生的 `sync_events` 实时触发 Server-Sent Events (SSE) 推流。
* **Speaker Notes**: 介绍后端精细的技术栈选型。在单机资源受限的设备上，我们选用了 Fastify 配搭 SQLite WAL 模式，实现了超高强度的吞吐稳定性。

#### Slide 08 - 记忆系统：AgentGal 生命周期的优雅落地 (核心创新)
* **Page Rhythm**: `dense`
* **Layout**: Asymmetric split (3:7, 左侧讲解长期记忆理论，右侧为循环 loop_process 的流式演进图)
* **Title**: 从碎片读数到人生感悟：记忆系统的演进
* **Visualization**: `loop_process` (展示 Drafts → Consolidation → Episode → Understanding)
* **Content**:
  * **Drafts (草稿)**：高频环境读数与用户聊天内容被快速写入临时流水区。
  * **Consolidation (整合)**：异步后台任务定时唤醒，将流水片段提炼为有因果逻辑的 Episode。
  * **sqlite-vec 向量检索**：结合 BM25 文本匹配，对记忆进行 Hybrid（混合）双路检索。
  * **Rerank 重排序**：内置 Reranker 模块对记忆回溯，杜绝大模型幻觉，实现100%匹配精度。
* **Speaker Notes**: 这是服务端的最大亮点。项目参考了 AgentGal 生命周期理论，把植物每天经历的寒冷、干旱和用户的聊天片段，进行自主沉淀、向量化检索，形成植物的长期生命记忆。

#### Slide 09 - 主动发言 Engine 与天气代理 (主动共情)
* **Page Rhythm**: `breathing`
* **Layout**: Symmetric split (5:5, 左侧为事件事实发生流，右侧为大模型温润人设渲染后的植物口吻)
* **Title**: 主动发言引擎：赋予植物真诚的嘴巴
* **Content**:
  * **事件事实事实生成**：缺水、天气降雨、降温、离线等状态首先由后台 Engine 转化为客观逻辑。
  * **冷却隔离机制**：设置严格的发言冷却机制，避免过多通知打扰用户，做到“恰到好处的问候”。
  * **和风天气数据融合**：深度集成 QWeather 天气数据，下雨前植物会俏皮地提醒你带它回家晒太阳。
* **Speaker Notes**: 介绍系统的主动发言机制，这并非硬编码的报警，而是结合天气 API 并在 LLM 修饰下的共情表达。

---

### Part 4: 桌面客户端与人文慢交互 (P10 - P12)

#### Slide 10 - 桌面端设计：Verdant Echo 的视觉交融 (UI设计)
* **Page Rhythm**: `dense`
* **Layout**: Two column symmetric split (展示 Tauri v2 的技术图与温室 Dashboard 卡片大图)
* **Title**: Tauri v2 客户端：指尖上的温润森林
* **Content**:
  * **Tauri v2 + Rust**：底层轻量化，极致的开销控制，冷启动仅需极少毫秒与内存。
  * **Verdant Echo 配色方案**：Forest-to-Soil 配色在 `tailwind.config.js` 中严密内嵌。
  * **温室主页 Dashboard**：集成时段问候、天气预报、卡片式多植物状态大网格。
* **Speaker Notes**: 汇报我们的桌面客户端。虽然我们有大量的技术硬实力，但客户端外观极为优雅温润，启动极快。

#### Slide 11 - 植响对话与里程碑成长日记 (核心功能)
* **Page Rhythm**: `dense`
* **Layout**: Asymmetric split (3:7, 左侧为聊天与日记功能概述，右侧展示卡片式交互流与 Bento StatCard)
* **Title**: 植响对话与里程碑式成长日记
* **Content**:
  * **植响对话系统**：支持流式与非流式对话切换，聊天框中完全由“用户浇水 chip”替代伪造用户身份的消息。
  * **Bento 结构日记卡**：精美的里程碑时间线呈现，每一次有价值的长期记忆产生都会被视觉高亮。
  * **留言情感闭环**：用户鼠标悬停在里程碑卡片上，即可对植物进行“空中寄语”，激发双向共鸣。
* **Speaker Notes**: 展示核心交互场景。聊天室并非冷酷的信息框，而是通过各种精美组件让互动充满了爱与信任。

#### Slide 12 - 呼吸感交互细节 (视觉交互)
* **Page Rhythm**: `breathing`
* **Layout**: Full-bleed + floating text (柔和的卡片高透渐变图做背景，前景悬浮几点微交互亮点)
* **Title**: 触手可及的柔软：微交互的极致细节
* **Content**:
  * **渐变遮罩边缘**：滚动列表两端采用高精度的 alpha 渐变淡出，拒绝硬邦邦的边界切割。
  * **无突变缓动**：路由切换与抽屉弹出均固定在 380ms 弹性过渡，营造植物呼吸的节奏感。
  * **微动作反馈**：所有按钮默认附带 `active:scale-[0.97]` 的细微点击回弹，操作手感极佳。
  * **键盘友好环**：使用 `:focus-visible` 锁定聚焦环，杜绝非必要的杂质视觉残留。
* **Speaker Notes**: 这是最能体现人文关怀细节的页面。从渐变边界到弹性按钮缩放，我们对所有微小的视觉动效都做了极致雕琢，旨在带给用户最治愈的体验。

---

### Part 5: 项目开发史诗与完成度 (P13 - P15)

#### Slide 13 - 蜕变：期中与期末的工程奇迹 (汇报核心)
* **Page Rhythm**: `anchor`
* **Layout**: Center single column with process_timeline (精细时间轴从左往右穿过)
* **Title**: 开发史诗：从“零代码”到“全面交付”
* **Visualization**: `process_timeline` (对比期中立项与期末落地)
* **Content**:
  * **期中立项阶段**：
    * ❌ 核心代码：0 行
    * ❌ 硬件连接：筹备购买，缺乏物联经验
    * ❌ 功能开发：停留在架构图纸阶段
  * **期末交付阶段**：
    * ✅ 核心代码：后端 90% 全面实现，客户端 87% 完全交付
    * ✅ 硬件落成：ESP32 真实板卡完美上电，配网与 OTA 顺畅跑通
    * ✅ 交付水准：完成了从单元测试、Smoke压测到 Docker 容器上云的全栈闭环
* **Speaker Notes**: 这是项目的重要历程汇报。我们在期中还是纸上谈兵，而在期末我们用极高的意志力攻克了硬件、云端与多端交互，实现了一个全面落地的生产级系统。

#### Slide 14 - 严谨检验：Smoke 压测与检索率 (质量保障)
* **Page Rhythm**: `dense`
* **Layout**: Four column cards (4张KPI StardCard展示，顶部含金色重点标注)
* **Title**: 严谨的技术保障：全面的单元测试与链路压测
* **Visualization**: `kpi_dashboard` (以大KPI卡片突出测试指标)
* **Content**:
  * **Fastify 服务端测试**：内置 25 个核心单元测试，100% 覆盖关键业务流。
  * **全链路 Smoke 闭环**： claim认领锁、 memory长期记忆与 citation引用定位链路 100% 测试通过。
  * **向量记忆性能**： 混合 BM25 与 sqlite-vec 双路检索在 120 条真实语料下，Top-1/Top-3/MRR 精度均达成 **100%**。
  * **文件质量自律**：遵循严苛规范，TS/TSX 单个文件代码量全量控制在 **300 行以内**，职责极其清晰。
* **Speaker Notes**: 解释我们在质量保证上下的功夫。项目不仅具有人文关怀，在工程保障上也无可挑剔，检索与测试指标皆为优等。

#### Slide 15 - 容器化与云端发布 (部署上线)
* **Page Rhythm**: `dense`
* **Layout**: Asymmetric split (3:7, 左侧为容器化配置规范，右侧为 Docker Hub 官方镜像拉取与单实例灰度部署)
* **Title**: 云端发布：Docker Hub 官方镜像与单键部署
* **Content**:
  * **高水准 Dockerfile**：分阶段多级构建，极大压缩镜像层数，移除冗余垃圾，极致的安全防护。
  * **Docker Hub 推送落成**：官方正式推送镜像 `ccckfg/dyn:latest`，在拉取测试中全部通过。
  * **一键轻量部署**：封装 `docker-compose.yml` 方便单实例灰度发布，极简命令 `docker compose up -d` 即可开箱即用。
* **Speaker Notes**: 说明我们在生产环境交付上的最后闭环。不仅能在本地跑，我们还编译打包并向 Docker Hub 推送了官方镜像，具备直接上云发布的能力。

---

### Part 6: 未来展望与致谢 (P16 - P17)

#### Slide 16 - 二期规划与未来展望 (下一步规划)
* **Page Rhythm**: `breathing`
* **Layout**: Top-bottom split (上方为长远大图景，下方为三个具体的二期研发功能 Chip)
* **Title**: 下一步：向更深处扎根，向更广处伸展
* **Content**:
  * **智能硬件二期**：加入干土/湿土现场精密校准算法，进行长达半年的真实户外 MQTT 长跑耐久度观察。
  * **客户端二阶段**：深入落地深色模式视觉方案，完成头像精细裁剪构图工具与养护提醒管理 UI。
  * **算法压测**：使用长尾更加多样的真实世界养护语料压测 LLM 闭环机制，引入更低损耗的端侧大模型。
* **Speaker Notes**: 虽然我们完成了核心功能，但对未来的长远规划极其清晰，项目将深入拓展长跑测试和客户端功能。

#### Slide 17 - Thank You (谢幕页)
* **Page Rhythm**: `anchor`
* **Layout**: Center single column (纯净高雅的森林绿背景卡片，正中暖白色 Quicksand 英文与 Leaf 图标)
* **Title**: 与植物一起，静静呼吸 (40px)
* **Subtitle**: DYN Plant Pal 感谢您的聆听 (24px)
* **Content**: 
  * 汇报人：邓雅宁、程宇择
  * 班级：智农 2501 班
* **Speaker Notes**: 总结项目体验，感谢所有评审老师的聆听与包容，祝愿大家能和自己的植物一起，静静享受生命的呼吸。

---

## X. Speaker Notes Requirements

所有的演讲备注（Speaker Notes）将采取高度自然有感染力的“口吻式”表述：
* **命名规范**: 单独分割的文件统一输出为 `notes/slide01.md` ~ `notes/slide17.md`，内容包含该页的汇报要点与情感转换语。
* **排版规格**: 主文件 `notes/total.md` 包含所有分章节信息，切分后的各分文件绝不包含带有 `#` 开头的多级标题行，直接为纯文本备注，防止 PPT 转换器乱码。

---

## XI. Technical Constraints Reminder

为保证 SVG 完美编译为 PPTX，Executor 必须死守以下底层技术准则：
1. **尺寸边界**：所有页面 viewBox 锁定在 `0 0 1280 720`，严禁产生视口漂移。
2. **文本包装**：全面排斥 `<foreignObject>` 和 `<style>`，所有文本强制包裹在 `<tspan>` 中，并运用绝对坐标 `x` 和 `y` 控制换行。
3. **描边与不透明度**：`<g>` 上绝对禁止直接定义 `opacity`。透明度必须逐个元素在 `fill-opacity` 或 `stroke-opacity` 中细密配置。
4. **特殊实体排斥**：所有特殊字符（如 em dash `—`，版权符号 `©`，箭头 `→`）一律书写为原始 Unicode 字符，绝对禁止书写为 `&mdash;` 或 `&copy;` 等 HTML 字符实体。XML 原生保留字符 `<`、`>`、`&` 强制使用实体转义 `&lt;`、`&gt;`、`&amp;`。
5. **卡片绘制**：所有卡片均以基础 `<rect>` 元素绘制，禁止使用复杂的剪裁路径，以免 PPT 兼容性崩塌。
