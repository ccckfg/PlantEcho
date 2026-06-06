# Proactive Speech Engine

主动发言不再由传感器异常直接触发。植物可以产生一个悬着的念头，但是否开口由独立决策决定；沉默、完成和放弃都是正常结果。

## 输入来源

- `Intention`：来自用户约定、聊天复用的 `inner_patch`、重要 Episode。
- 明确提醒：用户说“十分钟后提醒我浇水”等，到点必须发送。
- 天气：可选，默认关闭。

传感器读数只进入 `sensor_readings`、Physical 和聊天 Prompt，不生成主动消息。

## Intention 生命周期

```text
结构化事件
  -> 本地规则创建 Intention
  -> 周期扫描每株植物最多选择一个
  -> 决策 LLM: speak | keep | complete | dismiss
  -> speak 写入 assistant 消息
```

每个 Intention 有优先级、冷却时间、考虑次数、失败次数和过期时间。普通念头不会因为“到时间了”就强制发言；有效决策才会消耗考虑次数。模型请求失败或返回非法决策时，按 30 分钟到 12 小时指数退避，避免固定扫描周期持续重试。

## 模块

```text
apps/server/src/modules/intentions/
  intentionRepository.ts       Intention 持久化与状态更新
  intentionService.ts          本地创建规则与候选选择

apps/server/src/modules/proactive/
  engine.ts                    周期考虑 Intention、提醒和可选天气
  intentionProactiveService.ts 决定说、沉默、完成或放弃
  reminder*.ts                 明确提醒
  weatherTriggers.ts           可选天气候选
```

## 配置

```env
PROACTIVE_ENABLED=true
PROACTIVE_LLM_ENABLED=true
PROACTIVE_SCAN_INTERVAL_MS=300000
PROACTIVE_WEATHER_ENABLED=false
PROACTIVE_WEATHER_COOLDOWN_MS=21600000
PROACTIVE_REMINDER_MAX_DAYS=30
```

`PROACTIVE_ENABLED=false` 会停止周期考虑 Intention 和天气。已进入 `background_jobs` 的明确提醒仍由通用 job worker 执行。

## 可靠性边界

- 每轮扫描每株植物最多考虑一个 Intention。
- 没有可用 LLM 时，普通 Intention 保持沉默，不使用规则模板强行说话。
- 决策失败不消耗正常考虑次数，并通过 `not_before` 指数退避。
- 明确提醒独立于 Intention，保证到点发送。
- 主动消息写入现有 `messages`，并通过 `sync_events` 刷新客户端。
