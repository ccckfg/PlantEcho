# PlantEcho Desktop (Tauri v2)

DYN Plant Pal 的 Windows / 跨平台桌面客户端。基于 **Tauri v2 + React + Vite + TypeScript + Tailwind**，UI 严格沿用 Verdant Echo 设计 token（Forest-to-Soil 配色、Quicksand + Plus Jakarta Sans）。

## 页面

| 路由 | 对应设计稿 | 数据源 |
| --- | --- | --- |
| `/` | `dashboard/code.html` | `GET /api/v1/plants` + `GET /api/v1/plants/:id/readings/latest` |
| `/plant/:plantId` | dashboard 卡片点入的详情页 | `GET /api/v1/plants/:id` + `readings` |
| `/chat`, `/chat/:plantId` | `plant_chat/code.html` | `POST /api/v1/plants/:id/chat/stream` + `GET /messages` |
| `/journal`, `/journal/:plantId` | `growth_journal/code.html` | `GET /memories` + `GET /understandings` |
| `/album` | `photo_album/code.html` | `GET /photos` + `POST /photos` + `/media/photos/:photoId` |

Dashboard 顶部天气卡由 `GET /api/v1/weather/now` 驱动；和风天气密钥只保存在后端 `.env`。

## 实时同步

桌面端连接后会在 App 根部订阅 `GET /api/v1/sync/stream`。后端通过
`sync_events` 记录资源变化，客户端收到事件后按 `plants/readings/status/messages/memories/understandings/photos`
刷新对应页面。数据本身始终从后端 API 拉取，适合多个桌面客户端同时连接同一个后端。

## 工程结构

```
apps/desktop/
├── index.html              字体、Material Symbols 引入
├── package.json            @dyn/desktop workspace
├── vite.config.ts          Tauri 推荐的 Vite 配置（端口 5173 / strictPort / TAURI_DEV_HOST）
├── tailwind.config.js      Verdant Echo color/spacing/typography token
├── postcss.config.js
├── tsconfig.json
├── public/
├── src/
│   ├── main.tsx            HashRouter 入口（Tauri file://，避免 history mode）
│   ├── App.tsx             路由聚合
│   ├── styles.css          Tailwind base + 全局组件类
│   ├── components/         AppShell / SideNav / BackendConnect / Album / UI
│   ├── pages/              Dashboard / PlantDetail / Chat / Journal / Album
│   └── lib/                api.ts、chatStream.ts、connection.ts、format.ts、mood.ts、useAsync.ts
└── src-tauri/
    ├── Cargo.toml
    ├── build.rs
    ├── tauri.conf.json     productName / identifier / bundle 配置
    ├── capabilities/default.json
    ├── icons/icon.ico      Windows / installer 图标（由正式 logo 生成）
    ├── icons/icon.png      正式 logo PNG 源图
    └── src/
        ├── main.rs
        └── lib.rs
```

## 本地开发

```powershell
# 1. 启动后端（另一个终端）
npm run dev:server          # 默认 127.0.0.1:8787

# 2. 启动 Tauri 桌面端（首次会下载 wry / webview2 等 Rust 依赖）
npm run tauri:dev

# 仅纯 Web 调试（不打开 Tauri 窗口）
npm run dev:desktop         # http://localhost:5173
```

> 桌面端启动后会显示连接页，用户手动输入后端地址与访问密钥。连接信息保存在本机 localStorage，后续请求统一注入 `x-api-key` 与 `Authorization: Bearer`。

## Windows 打包交付

```powershell
npm run tauri:build
```

输出位于 `apps/desktop/src-tauri/target/release/bundle/`：
- `msi/PlantEcho_0.1.0_x64_*.msi`
- `nsis/PlantEcho_0.1.0_x64-setup.exe`
- `target/release/PlantEcho.exe`（裸可执行）

首次构建需要 ~5 GB 磁盘 + 较长时间编译 Rust 依赖；后续增量构建只需几秒。

## 与后端联调

- 跨域：后端已开 `@fastify/cors origin: true`，Tauri 内嵌的 webview 直接走 `fetch` 即可。
- CSP：`tauri.conf.json` 已允许动态 HTTP/HTTPS/WebSocket 后端连接和 Google Fonts。
- 默认演示植物：`apps/server` 启动会 seed 一个 demo plant；前端拿到的第一个植物即默认对话目标。
- 想看完整链路：`npm run simulate` 模拟 ESP32 上传，dashboard / 详情页会出现“口渴/光照”等 mood。
- 多端同步：同时打开两个客户端或一个 Tauri + 一个 Web 调试页，任意一端上传照片、发送消息或模拟器上报读数，另一端会通过 `/api/v1/sync/stream` 自动刷新。

## 后续可补
- 设备自动发现 / 认领 UI：后端 pending device / claim API 落地后接入。
- 相册增强：删除、编辑描述、收藏、封面、缩略图。
- 通知 / 提醒：依赖后端调度落地后再接。
- 品牌图标迭代：替换 `src-tauri/icons/icon.png` 并重新生成 `icon.ico` 即可。
