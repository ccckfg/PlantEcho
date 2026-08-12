# Proactive Speech Engine

PlantEcho 把主动发言建模为“悬着的念头”，而不是定时推送：事件先形成 `Intention`，规则门和 LLM 判官再共同决定它此刻应该开口、保留、完成或放下。明确提醒是独立的必达通道，不消耗普通念头预算。

## 当前输入来源

- 聊天主模型随回复输出 `<commitment_patch>`：识别未来事项，也支持取消事项并级联撤销相关念头和提醒。
- `<inner_patch>` 中实质变化的 thought / concern。
- 重要 Episode 和更新后的 Understanding。
- 传感器读数的 EWMA 持续异常：土壤湿度、空气温度、空气湿度只有连续超过阈值才形成低优先级 `body_feeling`。
- 时间节律：热络关系 3 天、其他关系 7 天未聊天，以及按用户 IANA 时区计算的认养周年。数据库没有独立认养日期，当前明确以 `plants.created_at` 作为可解释代理，不声称真实购买日期。
- 可选早安候选；默认关闭，只有显式开启且处于配置窗口才创建。
- `create_reminder` 工具产生的明确提醒。

瞬时传感器波动仍只进入 Physical 与聊天上下文，不直接产生念头或主动消息。身体状态使用持久化 EWMA、最大上报间隔和默认 12 小时持续阈值；恢复正常会撤销尚未说出的旧身体念头。光照暂不参与身体触发，因为当前数据模型没有日照周期，无法可靠区分夜晚与“连日阴暗”。旧的全局天气主动链路已经移除；天气查询 API 不受影响。

## 普通念头链路

```text
Intention
  -> SQL 选择并短租约认领
  -> 免费规则门：当地静音时段 / 用户在场 / 跨植物共享预算
  -> Judge（secondary）：speak | keep | complete | dismiss + reason
  -> Composer（primary）：共享聊天人格 + 来源证据 + 相关记忆 + 最近 5 条主动消息
  -> 消息安全清理 -> messages + sync_events
  -> proactive_decisions 留痕 + inner 闭环 + proactive 记忆来源标记
```

`keep` 只增加 `keep_count` 并延长冷却（1 天 → 2 天 → 4 天封顶），不会增加 `considered_count`，更不会因为多次保留而自动丢弃。念头只会由判官明确结束/放下或自然过期。

离场时普通念头保持挂起；只有“SSE 仍连接 + 页面可见心跳未过期”同时成立才算强在场，隐藏页面会立即撤销强在场。`auth_sessions.last_seen_at` 与最近用户消息提供弱在场信号。静音时段使用聊天请求最近持久化的 IANA 时区，无有效时区时使用服务端默认值。

## 社交预算

普通主动消息按用户共享 token bucket；同一用户的多株植物竞争同一个预算。设置页提供三档：

- `quiet`：默认容量 1 条/24 小时；
- `moderate`：默认容量 2 条/24 小时；
- `active`：默认容量 4 条/24 小时。

预算连续补充，不在自然日零点集中重置。API：

```text
GET  /api/v1/proactive/settings
PUT  /api/v1/proactive/settings  { "talkativeness": "quiet|moderate|active" }
POST /api/v1/proactive/presence  { "visible": true|false }
```

## 明确提醒链路

提醒发送前通过条件更新从 `scheduled` 认领为 `processing`，租约令牌防止 job worker 与周期扫描重复发送。组稿后，令牌校验、turn 分配、消息插入、事件日志和提醒 `sent/message_id` 在同一个数据库事务内提交；提交后才发布同步事件。失败释放认领供重试。

- 迟到不超过 2 小时：正常人格化传达；
- 迟到 2–24 小时：使用“这句迟到了”的补叙语气；
- 迟到超过 24 小时：标记 `expired`，不再打扰；
- Composer 失败：回退到必达模板，可靠性不降低；
- 提醒模板不进入 Episode 整理；
- 工具参数无效：聊天流写入诚实的失败提示，不让“我记下了”成为信任黑洞。

## 决策留痕

每次扫描结果写入 `proactive_decisions`，包括无候选、规则拦截、模型失败、keep/complete/dismiss/speak、组稿失败与最终消息 ID。关键字段：

```text
plant_id, intention_id, considered_at,
gate_result, reason_code, reason_detail,
llm_action, llm_reason, llm_tokens,
message_id, user_reaction, reaction_latency_ms
```

`user_reaction` 与 `reaction_latency_ms` 已预留给后续反馈闭环，当前尚未自动回填。
高频的 `no_candidate` 等决策记录由保留任务按 `RETENTION_PROACTIVE_DECISIONS_DAYS` 清理，默认保留 180 天。

诊断最近一周未发言原因时可从 `reason_code` 聚合：

```sql
SELECT reason_code, COUNT(*)
FROM proactive_decisions
WHERE plant_id = ? AND considered_at >= ?
GROUP BY reason_code
ORDER BY COUNT(*) DESC;
```

## 配置

所有主动引擎常量均由环境变量提供，示例见 `.env.example`。主要变量：

```env
PROACTIVE_ENABLED=true
PROACTIVE_LLM_ENABLED=true
PROACTIVE_SCAN_INTERVAL_MS=300000
PROACTIVE_STARTUP_DELAY_MS=90000
PROACTIVE_DEFAULT_TIMEZONE=Asia/Shanghai
PROACTIVE_QUIET_START=22:30
PROACTIVE_QUIET_END=08:00
PROACTIVE_USER_PRESENCE_WINDOW_MS=1800000
PROACTIVE_VISIBLE_HEARTBEAT_TTL_MS=90000
PROACTIVE_INTENTION_CLAIM_MS=600000
PROACTIVE_KEEP_BASE_COOLDOWN_MS=86400000
PROACTIVE_KEEP_MAX_COOLDOWN_MS=345600000
PROACTIVE_REMINDER_CLAIM_LEASE_MS=600000
PROACTIVE_REMINDER_LATE_NARRATIVE_MS=7200000
PROACTIVE_REMINDER_EXPIRE_AFTER_MS=86400000
PROACTIVE_BUDGET_REFILL_WINDOW_MS=86400000
PROACTIVE_DEFAULT_TALKATIVENESS=moderate
PROACTIVE_BODY_EWMA_ALPHA=0.25
PROACTIVE_BODY_PERSISTENCE_MS=43200000
PROACTIVE_BODY_MAX_GAP_MS=1800000
PROACTIVE_SILENCE_WARM_DAYS=3
PROACTIVE_SILENCE_COOL_DAYS=7
PROACTIVE_MORNING_GREETING_ENABLED=false
PROACTIVE_MORNING_START=07:30
PROACTIVE_MORNING_END=09:30
RETENTION_PROACTIVE_DECISIONS_DAYS=180
```

## 可靠性边界

- 启动后默认等待 90 秒再首扫，避免重启瞬间倾泻积压内容。
- 每株植物独立 `try/catch`，单株失败不会中断全局扫描。
- 普通念头没有可用 LLM 时保持挂起并退避，不用模板强行开口。
- 判官走 secondary 路由，组稿和人格表达走 primary 路由。
- SQLite 与 PostgreSQL 均包含等价迁移；SQLite 测试进程使用独立数据目录，避免并行锁争用。
