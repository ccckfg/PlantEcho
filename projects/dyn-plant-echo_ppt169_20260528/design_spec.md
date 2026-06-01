# DYN Plant Echo - Design Spec

> Human-readable design narrative for the PlantEcho intelligent plant companion system final presentation. Machine-readable execution lock: `spec_lock.md`.

## I. Project Information

| Item | Value |
| ---- | ----- |
| **Project Name** | DYN Plant Echo |
| **Canvas Format** | PPT 16:9 (1280x720) |
| **Page Count** | 18 |
| **Design Style** | A) General Versatile — warm, organic, nature-inspired |
| **Target Audience** | Course instructor and classmates, final presentation |
| **Use Case** | Final course report — showcase technical depth and humanistic design philosophy |
| **Created Date** | 2026-05-28 |

---

## II. Canvas Specification

| Property | Value |
| -------- | ----- |
| **Format** | PPT 16:9 |
| **Dimensions** | 1280x720 |
| **viewBox** | `0 0 1280 720` |
| **Margins** | left/right 60px, top/bottom 50px |
| **Content Area** | 1160x620 (centered) |

---

## III. Visual Theme

### Theme Style

- **Style**: Organic, gentle, nature-inspired — Verdant Echo design language
- **Theme**: Light theme with warm cream background
- **Tone**: Warm, humanistic, approachable — NOT corporate/techy

### Color Scheme

> Directly from the project's own Verdant Echo Forest-to-Soil palette.

| Role | HEX | Purpose |
| ---- | --- | ------- |
| **Background** | `#F5F0E8` | Warm cream white — page background |
| **Secondary bg** | `#FFFFFF` | Card backgrounds, elevated surfaces |
| **Primary** | `#2D5016` | Deep forest green — titles, key decorations |
| **Primary mid** | `#4A7C28` | Medium green — section headers, icons |
| **Accent** | `#E8A849` | Warm amber — highlights, key data, CTAs |
| **Secondary accent** | `#D4A574` | Warm brown — secondary emphasis |
| **Body text** | `#2B2B2B` | Main body text |
| **Secondary text** | `#6B7B6B` | Soft green-gray — captions, annotations |
| **Tertiary text** | `#9B8B7B` | Warm gray — footers, supplementary |
| **Border/divider** | `#E0D8C8` | Warm light border |
| **Success** | `#4A7C28` | Positive indicators (green) |
| **Warning** | `#C45A28` | Alert indicators (warm red) |

### Gradient Scheme

```xml
<!-- Title gradient — forest to amber -->
<linearGradient id="titleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
  <stop offset="0%" stop-color="#2D5016"/>
  <stop offset="100%" stop-color="#4A7C28"/>
</linearGradient>

<!-- Background decorative gradient — warm radial -->
<radialGradient id="bgDecor" cx="80%" cy="20%" r="50%">
  <stop offset="0%" stop-color="#4A7C28" stop-opacity="0.08"/>
  <stop offset="100%" stop-color="#4A7C28" stop-opacity="0"/>
</radialGradient>

<!-- Accent gradient — amber glow -->
<linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#E8A849"/>
  <stop offset="100%" stop-color="#D4A574"/>
</linearGradient>
```

---

## IV. Typography System

### Font Plan

**Typography direction**: modern CJK sans — warm, friendly, humanistic

| Role | Chinese | English | Fallback tail |
| ---- | ------- | ------- | ------------- |
| **Title** | `"Microsoft YaHei", "PingFang SC"` | `Arial` | `sans-serif` |
| **Body** | `"Microsoft YaHei", "PingFang SC"` | `Arial` | `sans-serif` |
| **Code** | — | `Consolas, "Courier New"` | `monospace` |

**Per-role font stacks**:

- Title: `"Microsoft YaHei", "PingFang SC", Arial, sans-serif`
- Body: `"Microsoft YaHei", "PingFang SC", Arial, sans-serif`
- Code: `Consolas, "Courier New", monospace`

### Font Size Hierarchy

**Baseline**: Body font size = 22px (medium density, suitable for final presentation)

| Purpose | Ratio to body | Example @ body=22 | Weight |
| ------- | ------------- | ----------------- | ------ |
| Cover title (hero headline) | 3x | 66px | Bold |
| Chapter / section opener | 2.2x | 48px | Bold |
| Page title | 1.8x | 40px | Bold |
| Hero number | 2x | 44px | Bold |
| Subtitle | 1.3x | 28px | SemiBold |
| **Body content** | **1x** | **22px** | Regular |
| Annotation / caption | 0.75x | 16px | Regular |
| Page number / footnote | 0.55x | 12px | Regular |

---

## V. Layout Principles

### Page Structure

- **Header area**: 50px top margin, page title + subtitle
- **Content area**: 520px height, main content
- **Footer area**: 50px bottom margin, page number + branding

### Layout Pattern Library

| Pattern | Suitable Scenarios |
| ------- | ----------------- |
| **Single column centered** | Covers, conclusions, key points |
| **Asymmetric split (3:7 / 2:8)** | Image vs. caption, data vs. takeaway |
| **Three-column cards** | Feature lists, parallel points |
| **Top-bottom split** | Processes, timelines |
| **Center-radiating** | Core concept + surrounding nodes |
| **Full-bleed + floating text** | Breathing pages, hero quotes |
| **Z-pattern / waterfall** | Storytelling, case studies |

### Spacing Specification

| Element | Recommended Range |
| ------- | ---------------- |
| Safe margin from canvas edge | 60px |
| Content block gap | 28-36px |
| Card gap | 24px |
| Card padding | 24px |
| Card border radius | 12px |
| Icon-text gap | 12px |

---

## VI. Icon Usage Specification

### Source

- **Built-in icon library**: `templates/icons/tabler-filled/`
- **Usage method**: SVG placeholder `<use data-icon="tabler-filled/icon-name" .../>`

### Recommended Icon List

| Purpose | Icon Path | Page |
| ------- | --------- | ---- |
| Plant / Nature | `tabler-filled/leaf` | 01, 02, 05, 11, 12, 18 |
| Water / Moisture | `tabler-filled/droplet` | 05, 09, 11 |
| Sun / Light | `tabler-filled/sun-high` | 05 |
| Temperature | `tabler-filled/temperature-plus` | 05 |
| Home / Dashboard | `tabler-filled/home-2` | 10, 11 |
| Chat / Message | `tabler-filled/message-circle` | 09, 10, 12 |
| Camera / Album | `tabler-filled/camera` | 10, 12 |
| Chart / Data | `tabler-filled/chart-bar` | 06, 07, 16 |
| Clock / Time | `tabler-filled/clock` | 02, 09 |
| Shield / Security | `tabler-filled/shield-check` | 06, 14 |
| Bolt / Speed | `tabler-filled/bolt` | 13 |
| Heart / Care | `tabler-filled/heart` | 01, 03, 18 |
| Bulb / Innovation | `tabler-filled/bulb` | 02, 13 |
| Device / Hardware | `tabler-filled/device-desktop` | 05, 10 |
| Database / Storage | `tabler-filled/database` | 06, 07 |
| Cloud / Weather | `tabler-filled/cloud` | 09 |
| Seedling / Growth | `tabler-filled/seedling` | 01, 17 |
| Star / Milestone | `tabler-filled/star` | 12 |
| Check / Success | `tabler-filled/circle-check` | 14, 15 |
| Settings / Config | `tabler-filled/settings` | 06 |
| Globe / Network | `tabler-filled/globe` | 06, 13 |
| Users / Team | `tabler-filled/users` | 03 |
| Book / Docs | `tabler-filled/book` | 07, 08 |
| Calendar | `tabler-filled/calendar` | 09, 17 |
| Box / Package | `tabler-filled/box-multiple` | 14 |

---

## VII. Visualization Reference List

> Catalog read: checked charts_index.json. This deck is primarily narrative and architectural — fewer than 3 data-heavy viz pages.

| Visualization Type | Reference Template | Used In |
| ------------------ | ------------------ | ------- |
| Progress bars (custom) | No template — custom SVG | Slide 16 |
| Architecture diagram (custom) | No template — custom SVG | Slide 04 |
| Process flow (custom) | No template — custom SVG | Slide 07, 09 |

Runners-up: `vertical_list` (rejected: content is more narrative than list-heavy), `timeline` (rejected: no strict chronological data).

---

## VIII. Image Resource List

> Option D selected — placeholders. No external images needed; all visuals are SVG-drawn organic decorations.

No image resources. All decorative elements are SVG-native (gradients, circles, organic shapes).

---

## IX. Content Outline

### Part 1: Opening (Slides 01-03)

#### Slide 01 - 封面

- **Layout**: Full-screen organic background with centered title
- **Title**: DYN Plant Echo
- **Subtitle**: 与植物一起呼吸的陪伴系统
- **Info**: 智能植物陪伴系统 · 期末汇报 | 2026年5月28日
- **Decoration**: Organic leaf motifs, warm gradient background

#### Slide 02 - 项目愿景

- **Layout**: Single column centered — breathing page
- **Title**: 为什么要做 PlantEcho?
- **Content**:
  - Core message: 不是传感器看板，而是陪伴软件
  - 5 principles in organic card layout
  - Quote: "植物本身就是慢的载体，软件的响应也应该耐心"

#### Slide 03 - 设计哲学：人文关怀

- **Layout**: Five principle cards — dense page
- **Title**: 设计哲学：人文关怀
- **Content**:
  - 说人话: "我有点渴了·23%" not "水分:23%"
  - 尊重节奏: 5秒撤销toast, 380ms缓动
  - 操作信任: 控制权还给用户
  - 共情细节: 时间感问候、里程碑庆祝
  - 呼吸感: 渐变遮罩、柔和动效

### Part 2: System Architecture (Slides 04-06)

#### Slide 04 - 系统全景架构

- **Layout**: Architecture diagram — dense page
- **Title**: 系统全景架构
- **Content**:
  - Three-layer diagram: Hardware → Server → Client
  - Data flow arrows: MQTT/HTTP, SSE/API
  - Tech labels at each layer

#### Slide 05 - 硬件层：ESP32 智能感知

- **Layout**: Asymmetric split — left sensors, right capabilities
- **Title**: 硬件层：ESP32 智能感知
- **Content**:
  - ESP32 core controller
  - 4 sensors: OLED, SHT40, BH1750, Soil Moisture
  - 3 capabilities: SoftAP, MQTT, OTA
  - Data types: soilRaw, soilPercent, airTempC, airHumidityPercent, lightLux

#### Slide 06 - 服务端架构

- **Layout**: Module grid — dense page
- **Title**: 服务端架构
- **Content**:
  - Tech stack: Node.js 24 + TypeScript + Fastify + SQLite + sqlite-vec + Zod
  - 8 modules: Device / Plant / Chat / Memory / Proactive / Sync / Weather / Auth

### Part 3: Core Systems (Slides 07-09)

#### Slide 07 - 记忆系统：AgentGal 生命周期

- **Layout**: Process flow — dense page
- **Title**: 记忆系统：AgentGal 生命周期
- **Content**:
  - Lifecycle: drafts → consolidation → episode → understanding
  - Hybrid retrieval: FTS5/BM25 + sqlite-vec + rerank
  - Final scoring: relevance 50% + recency 20% + importance 30%

#### Slide 08 - 记忆召回与引用策略

- **Layout**: Asymmetric split — policy left, examples right
- **Title**: 记忆召回与引用策略
- **Content**:
  - Smart citation: only when relevant
  - Policy rules: status → sensor first; "记得" → allow memory
  - Honesty: no reliable memory → forbid "我记得"

#### Slide 09 - 主动发言引擎

- **Layout**: Three trigger cards + data flow
- **Title**: 主动发言引擎
- **Content**:
  - Three triggers: sensor anomalies, weather, user reminders
  - Cooldown system prevents spam
  - LLM polishes structured facts into plant-voice messages

### Part 4: Client Design (Slides 10-12)

#### Slide 10 - 桌面客户端设计

- **Layout**: Tech stack + page overview — dense page
- **Title**: 桌面客户端设计
- **Content**:
  - Tech: Tauri v2 + React 18 + Vite 5 + TypeScript + Tailwind 3
  - Design: Verdant Echo (Forest-to-Soil palette)
  - 5 pages: Dashboard / Plant Detail / Chat / Journal / Album

#### Slide 11 - 温室 Dashboard

- **Layout**: Feature showcase — breathing page
- **Title**: 温室 Dashboard
- **Content**:
  - Time-based greeting
  - Weather card + one-click watering (5s undo toast)
  - Plant card grid
  - PlantReflectionFooter: plant-voice one-liner

#### Slide 12 - 植响对话 & 成长日记

- **Layout**: Two-column — chat left, journal right
- **Title**: 植响对话 & 成长日记
- **Content**:
  - Chat: streaming replies, quick actions, hover comment
  - Journal: Bento StatCard + milestone timeline
  - Milestones can be responded to
  - Empty states with invitation copy

### Part 5: Technical Highlights (Slides 13-15)

#### Slide 13 - 技术亮点

- **Layout**: KPI cards — dense page
- **Title**: 技术亮点
- **Content**:
  - 100% Top-1/Top-3/MRR retrieval accuracy
  - Qwen3-Reranker-8B integration
  - OpenAI-compatible API
  - Real-time SSE sync
  - MQTT auto key distribution

#### Slide 14 - 工程化与部署

- **Layout**: Three-column — Docker, Monorepo, Testing
- **Title**: 工程化与部署
- **Content**:
  - Docker: multi-stage build, Docker Hub
  - Monorepo: npm workspaces
  - 25 tests passing, all smoke tests green

#### Slide 15 - 验证状态

- **Layout**: Checklist grid — dense page
- **Title**: 验证状态
- **Content**:
  - Backend: 25 tests passing
  - Retrieval: 100% accuracy
  - Docker: deployment verified
  - Desktop: msi + nsis built
  - ESP32: real hardware verified

### Part 6: Progress & Future (Slides 16-18)

#### Slide 16 - 完成度总览

- **Layout**: Progress bars — dense page
- **Title**: 完成度总览
- **Content**:
  - Hardware: 92%
  - Memory system: 85%
  - Backend: ~90%
  - Desktop client: ~87%
  - Design: 100%

#### Slide 17 - 下一步计划

- **Layout**: Timeline/list — dense page
- **Title**: 下一步计划
- **Content**:
  - Device deletion/batch management
  - Deep LLM integration
  - ESP32 field verification
  - Desktop Phase 2: trends, reminders, dark mode
  - End-to-end testing

#### Slide 18 - 结语

- **Layout**: Full-screen centered — breathing page
- **Title**: 和植物一起呼吸
- **Content**:
  - Closing philosophy
  - Thank you
  - Project info

---

## X. Speaker Notes Requirements

- **Filename**: match SVG name (e.g., `01_封面.md`)
- **Style**: conversational, warm — like talking with the audience
- **Purpose**: inform + inspire
- **Duration**: ~15 minutes total (50 seconds per slide average)
- **Stage markers**: [停顿], [过渡], [互动]

---

## XI. Technical Constraints Reminder

### SVG Generation Must Follow:

1. viewBox: `0 0 1280 720`
2. Background uses `<rect>` elements
3. Text wrapping uses `<tspan>` (`<foreignObject>` FORBIDDEN)
4. Transparency uses `fill-opacity` / `stroke-opacity`; `rgba()` FORBIDDEN
5. FORBIDDEN: `mask`, `<style>`, `class`, `foreignObject`
6. FORBIDDEN: `textPath`, `animate*`, `script`
7. Text: write symbols as raw Unicode; HTML named entities FORBIDDEN
8. `marker-start` / `marker-end` conditionally allowed
9. `clipPath` conditionally allowed only on `<image>` elements

### PPT Compatibility Rules:

- `<g opacity="...">` FORBIDDEN — set on each child individually
- Image transparency uses overlay mask layer
- Inline styles only; external CSS and `@font-face` FORBIDDEN
