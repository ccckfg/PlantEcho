# DYN Plant Pal

基于 ESP32 与大语言模型的智能植物陪伴与养护系统。

当前仓库包含：

- `hardware/esp32_oled`：ESP32 + OLED 验证固件。
- `apps/server`：Node.js/TypeScript 服务端，负责设备读数、植物档案、规则养护、聊天和长期记忆。
- `packages/shared`：设备 payload 与植物类型等共享 schema。
- `AgentGal`：记忆系统参考项目，当前不作为运行时依赖。

## 快速启动服务端

```powershell
npm install
npm run build
npm run dev:server
```

服务端默认监听 `http://127.0.0.1:8787`。

## 模拟设备

```powershell
npm run simulate
```

模拟脚本会每隔数秒向默认设备上传传感器读数。

