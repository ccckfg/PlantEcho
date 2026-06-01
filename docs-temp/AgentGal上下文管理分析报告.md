# AgentGal 上下文管理深度分析报告

> 目标读者：希望将 AgentGal 的上下文管理思路借鉴到植物陪伴系统的开发者
>
> 分析基准版本：本报告基于对项目源码的完整阅读，覆盖 `engine/`、`memory/`、`prompts/`、`storage/`、`consolidation/` 等全部核心模块。

---

## 一、整体架构鸟瞰

AgentGal 是一套**多角色、持久记忆、信息隔离**的对话系统。其上下文管理可以拆成三个相互协作的层次：

```
┌─────────────────────────────────────────────────────────┐
│  上下文层次                                              │
│                                                          │
│  ① 角色定义层（soul.md）        — 不变的性格内核        │
│  ② 运行时状态层（status.md）    — 当前心境/关系/意图    │
│  ③ 长期记忆层（memory.jsonl）   — 经历形成的情节记忆    │
│  ④ 稳定认知层（understanding.jsonl）— 持久信念/判断模式  │
│  ⑤ 对话历史层（raw JSONL）      — 近期多轮原始对话      │
└─────────────────────────────────────────────────────────┘
```

每次 LLM 调用时，这五层内容按照特定规则被组装成一条大 user message 送入模型，而不是简单地把所有历史塞进 context window。

---

## 二、一句"你好"的完整旅程

下面逐步追踪用户发送一条消息后系统的完整处理流程。

### 2.1 入口：玩家消息进入系统

**文件：`server.py` → `storage/message_router.py`**

```
玩家输入 "你好"
  │
  ▼
message_router.broadcast_player_message(targets, "你好")
  │
  ├─ 记录到 narrator/raw/YYYY-MM-DD.jsonl
  │    message = { role:"player", content:"你好", visible_to:[...全部targets], turn:N }
  │
  └─ turn 号不递增（turn 由 narrator 发言时递增）
```

每条消息携带 `visible_to` 字段，表示哪些角色"看得到"这条消息。这是实现**信息隔离**的基础。

---

### 2.2 第一步：Narrator 路由决策

**文件：`engine/character.py` → `Narrator.route()`**

Narrator 是整个系统的"场控"，它需要首先决定：
- 当前场景是什么（时间、地点）
- 哪些角色应该参与这一轮对话

#### Narrator 的 System Prompt 结构

```
<goal>
通过控制时间、地点、人物三要素，让玩家本轮有事可做、有人可以回应。
</goal>

<soul>
{narrator 的 soul.md 内容}
</soul>

<task>
读玩家输入与当前状态，判断玩家意图，推导场景和人物...
</task>

<context_usage> ... </context_usage>
<new_characters> ... </new_characters>
<writing_boundaries> ... </writing_boundaries>
<output_format> ... </output_format>
```

System prompt 保持**完全稳定**（只有 soul 内容会变），动态内容全部放入 user message，这是为了最大化 prompt cache 命中率。

#### Narrator 的 User Message 组装顺序

**文件：`engine/prompt_builder.py` → `build_user_message()`**

```
① <player>                  ← 玩家的显示名
② <fields>                  ← 所有可用角色的 id/显示名/identity 列表
③ 最近对话历史:\n{history}  ← 近 N turn 对话（经过高低水位窗口截断）
④ <status>                  ← narrator 的 status.md（场景/时间/角色位置/待触发事件）
⑤ 玩家新消息：你好
```

各部分之间用 `\n\n---\n\n` 分隔，整体构成一条完整的 user message。

#### Narrator 的结构化输出 `NarratorOutput`

Narrator 以 JSON 格式输出：

```json
{
  "targets": ["美月"],
  "date": "4月15日 星期二",
  "time": "16:30",
  "location": "教室走廊",
  "present_characters": {
    "你": "靠在窗边",
    "美月": "整理书包，抬起头"
  },
  "scene_description": "放学铃声刚响，走廊渐渐热闹起来。",
  "new_characters": []
}
```

---

### 2.3 第二步：角色 Agent 构建 Prompt

**文件：`engine/character.py` → `Character.run()` → `_build_prompt()`**

这是系统最核心的部分。角色在回应之前，会执行一套完整的**记忆检索 + 上下文组装**流程。 

#### 2.3.1 构造检索查询

**文件：`engine/memory_query_builder.py`**

```python
# 从 status.md 读取角色当前"在意的事"
concern = extract_status_field(status, "在意的事")
# 从最近消息中提取当前位置
location = 最近一条 narrator 输出的 location

# 情节记忆查询 = 在意的事 + 当前位置 + 玩家输入
episode_query = concern + "\n" + location + "\n" + user_input

# 稳定认知查询 = 在意的事 + 玩家输入（不含位置，认知不绑定地点）
understanding_query = concern + "\n" + user_input
```

检索时会同时准备**向量检索查询**（完整文本）和 **BM25 检索查询**（截断到 700 字符，用于关键词精确匹配）。

#### 2.3.2 记忆检索管线（五步流程）

**文件：`memory/retrieval.py`**

```
Step 1: 嵌入查询文本 → 查询向量 qvec

Step 2: 向量候选检索
  → sqlite-vec ANN 搜索，取 VECTOR_CANDIDATE_LIMIT 条（默认约20条）
  
Step 3: BM25 候选检索（可选）
  → jieba 分词 → FTS5 全文搜索，取 BM25_CANDIDATE_LIMIT 条
  
Step 4: Hybrid Fusion（向量+BM25 融合）
  → 对两个候选集合并去重
  → 向量相关度 = 1 - distance / 2
  → BM25 相关度做 min-max 归一化
  → relevance = 0.75 * vector_relevance + 0.25 * bm25_relevance

Step 5: Rerank（可选，需要 rerank API）
  → 用 rerank 模型重新打分，替换 relevance

Step 6: Recency + Importance 加权排序
  → recency = exp(-ln2 * days_ago / half_life)
      基于游戏内日期衰减，考虑：事件发生日期 + 最近被召回日期
  → importance = (importance_1_to_5 - 1) / 4.0
  → final_score = 0.5*relevance + 0.4*recency + 0.1*importance

Step 7: 更新被召回记忆的 last_recalled_at
  → 越常被回忆的记忆越不容易被遗忘（recency 得分保持高位）
```

#### 2.3.3 角色 User Message 最终组装

**文件：`engine/prompt_builder.py` → `build_user_message()`**

按以下顺序拼接（越靠前越稳定，越靠后越动态）：

```
① <my_schedule>
   周一至周五 08:00 → 学校（教室）
   周一至周五 16:30 → 部室 / 走廊
   ...
</my_schedule>

② （仅 narrator 才有）<player>显示名</player>
③ （仅 narrator 才有）<fields>角色列表</fields>

④ 最近对话历史:                  ← 经高低水位窗口截断，只含 visible_to 包含当前角色的消息
   旁白: 放学后，走廊...
   你: 你好
   美月: ...

⑤ <status>
   身份: 学生，料理部成员
   心境: 对他有些期待，但还在试探
   和玩家的关系: 有好感，常一起聊天
   在意的事: 他今天留下是真心的吗
   打算: 【还便当盒】4月16日把便当盒还给玩家
</status>

⑥ <relevant_memories>
   ## 4月10日
   - **标题**：和他第一次单独放学
   - **时间**：16:45
   - **地点**：校门口
   - **在场**：我、他
   - **内容**：他主动等我，说..."
</relevant_memories>

⑦ <relevant_understandings>
   ## 他的性格
   他在说重要事情之前会先沉默一下，不是在回避，是在组织语言...
</relevant_understandings>

⑧ 玩家新消息：你好
```

---

### 2.4 第三步：LLM 生成回应并写回文件

#### 角色的结构化输出 `CharacterOutput`

```json
{
  "content": "## 美月\n（放下书包，回头）诶，你今天没先走？",
  "memory": "## 4月15日\n- **放学后/教室走廊/我、他**：他喊我，我以为他要先走，结果他在等我。他说「你好」，有点奇怪，像在试着开口又不知道怎么说。我有点心跳加速。",
  "status": {
    "心境": "有些意外，心情比平时好",
    "在意的事": "他今天主动说话是因为什么"
  },
  "triggered": [],
  "add_event": []
}
```

#### 写回规则

| 字段 | 写入位置 | 机制 |
|------|----------|------|
| `content` | 广播到对话历史 | `message_router.broadcast_agent_response()` |
| `memory` | `memory_draft.jsonl`（追加） | 等待后台 consolidation 归并为正式 EpisodeMemory |
| `status` | `status.md`（字段合并更新） | `update_status(agent_name, field, content)` |
| `triggered` | 从 `status.md` 的"打算"段删除对应条目 | `mark_event_triggered()` |
| `add_event` | 向 `status.md` 的"打算"段追加 | `add_pending_event()` |

---

### 2.5 第四步：三条并行后台任务

角色回应发送给用户后，系统同时启动三条异步任务：

```
┌─────────────────────────────────────────────────────────┐
│  A. 选项生成（choices）                                  │
│     根据当前场景和角色回应，生成 2-3 个玩家可选行动      │
│     完成后持久化到 last_choices.json                      │
│                                                          │
│  B. 状态更新（state_updater）                            │
│     更新 narrator/status.md：                            │
│     当前场景/时间/角色位置/叙事焦点/待触发事件           │
│     同时同步各角色的"和玩家的关系"到 narrator/status.md   │
│                                                          │
│  C. 记忆整理（detect_and_consolidate）                   │
│     检测对话情节闭合点                                   │
│     将 memory_draft 归并为正式 EpisodeMemory             │
│     更新 understanding.jsonl                              │
└─────────────────────────────────────────────────────────┘
```

---

## 三、记忆存储体系详解

### 3.1 五种持久化文件

每个角色在 `data/runtime/characters/{agent_name}/` 目录下有以下文件：

#### `soul.md` — 不变的性格内核

```markdown
<identity>
美月，17岁，高二，料理部成员...
</identity>

<goal>
找到一个真正理解自己的人...
</goal>

<dynamic>
表面有点冷淡，但对熟悉的人会突然软化...
</dynamic>

<behavior>
不会主动发起话题，但如果对方聊到她在意的事会停不下来...
</behavior>

<voice>
用词简洁，句子短，偶尔反问，少用感叹号...
</voice>
```

整个游玩过程中 `soul.md` **只读不写**，是角色人格的宪法。

---

#### `status.md` — 运行时动态状态

每轮对话后可能更新，记录角色当前最真实的状态：

```markdown
## 身份
学生，料理部成员

## 心境
对他有点期待，但还在观察

## 和玩家的关系
常在放学后聊天的同班同学，有好感但还没明确表示

## 在意的事
他今天主动说话是真心的吗

## 打算
- 【还便当盒】4月16日课间把便当盒还给玩家
```

"打算"段由 `add_event`/`mark_triggered` 逐条维护，禁止整段覆写——这保证了事件的原子性更新。

---

#### `memory.jsonl` — 长期情节记忆

每行是一个 `EpisodeMemory` JSON 对象：

```jsonl
{"id":"a1b2c3d4...","date":"4月10日","time":"16:45","location":"校门口","participants":"我、他","keywords":["等待","第一次单独放学"],"importance":4,"content":"他主动等我一起走，说想聊聊料理部的事...我有点高兴，假装没事地应了。","title":"第一次单独放学回家","memory_owner":"mizuki","raw_dialogue":"[turn=5] 旁白: 校门口...\n[turn=5] 他: 等一下...","last_recalled_at":"4月14日"}
```

字段说明：
- `importance` 1-5：重要程度，影响检索排序权重
- `raw_dialogue`：原始对话文本（仅用于 consolidation，不被向量化）
- `last_recalled_at`：最近被检索到的游戏日期，用于 recency 计算

---

#### `memory_draft.jsonl` — 待归并的记忆草稿

每轮对话后，角色的 `output.memory` 字段先写入此文件：

```jsonl
{"turn": 12, "text": "## 4月15日\n- **放学后/走廊/我、他**：他主动打招呼..."}
{"turn": 13, "text": "## 4月15日\n- 他让我帮忙找他的笔记..."}
```

当后台检测到一个叙事情节已经闭合（`EpisodeClosureDetector`），就把相关 turn 的 draft 切出来，交给 `EpisodeMemoryGenerator` 生成正式的结构化 `EpisodeMemory`，追加到 `memory.jsonl`，并从 draft 中删除已处理的条目。

---

#### `understanding.jsonl` — 稳定认知与判断模式

区别于具体事件，这里记录的是从多个事件中提炼出的**持久信念**：

```jsonl
{"id":"u001...","memory_owner":"mizuki","subject":"他的性格","keywords":["说话方式","沉默","组织语言"],"content":"他在说重要事情之前会先沉默，不是在回避，是在组织语言，说出来的话通常都是认真的。","linked_episodes":["a1b2c3...","d4e5f6..."],"history":[{"episode_id":"a1b2c3...","date":"4月10日","title":"第一次单独放学","content":"（初版认知）"}]}
```

理解会随新情节进化：`history` 字段记录认知的演变轨迹。

---

### 3.2 向量数据库（sqlite-vec）

**文件：`storage/vector_store.py`**

使用 `sqlite-vec` 扩展实现本地向量存储，包含：

- `EpisodeMemory` 表：存储所有情节记忆（带 BM25/FTS5 索引）
- `EpisodeMemory_vec` 表：存储对应的嵌入向量

被向量化的文本是记忆的**内容摘要**（content 字段），包含 title、time、location、participants、keywords 等元数据，但不包含 raw_dialogue（对话原文太长，且不适合语义检索）。

---

## 四、对话历史的窗口管理

### 4.1 单一数据源 + 信息隔离

所有对话消息只写入一个文件：`narrator/raw/YYYY-MM-DD.jsonl`。

```jsonl
{"role":"player","content":"你好","visible_to":["mizuki","narrator"],"turn":12}
{"role":"narrator","content":"放学铃响...","visible_to":["mizuki","narrator"],"turn":13}
{"role":"mizuki","content":"诶，你没先走？","visible_to":["mizuki","narrator"],"turn":13}
```

角色读取历史时，只能看到 `visible_to` 包含自己名字的消息——不同角色的视角完全独立。

### 4.2 高低水位窗口

**文件：`engine/prompt_builder.py` → `_apply_high_low_watermark()`**

```
HISTORY_HIGH = 30  （触发截断阈值）
HISTORY_LOW  = 20  （截断后保留的 turn 数）

当可见消息跨越的不同 turn 数 > HIGH
  → 滑动窗口，只保留最近 LOW 个不同 turn 的消息
  → 把新的窗口起始 turn 持久化到 .history_window_state.json
```

这保证了：
1. 短对话：完整历史都在窗口内
2. 长对话：最近的 20 个 turn 始终在上下文里，更早的依靠长期记忆检索

---

## 五、记忆整理（Consolidation）流程

后台记忆整理是整个系统最精妙的部分，让角色的"记忆"具有类人特征。

**文件：`consolidation/flow.py`**

```
每轮对话结束后异步触发：

Step 1: EpisodeClosureDetector
  输入：最近若干 turn 的带编号对话历史
  输出：{ "mizuki": [{ end_turn:13, old_theme:"初见打招呼", new_theme:"...", reason:"..." }] }
  作用：检测叙事情节的"闭合点"（话题结束/场景转换/时间跳跃）

Step 2: 若检测到闭合点
  → 从 memory_draft.jsonl 中切取 until_turn 之前的草稿
  → 连同对应的 raw_dialogue 送给 EpisodeMemoryGenerator

Step 3: EpisodeMemoryGenerator
  输入：记忆草稿文本 + 原始对话文本 + memory_owner 约束
  输出：结构化 EpisodeMemory（date/time/location/participants/keywords/importance/content/title）
  注意：用第一人称"我"写记忆，输出视角强制转换为当前角色

Step 4: 写入 memory.jsonl + 向量索引
  → 追加到 memory.jsonl（UUID id，注入 memory_owner, raw_dialogue）
  → 异步 embed 并写入 sqlite-vec 向量数据库

Step 5: UnderstandingPatch
  输入：现有 understanding.jsonl + 新的 EpisodeMemory
  输出：需要新增或更新的 Understanding 条目
  作用：从具体事件中提炼/更新持久信念
```

### Consolidation 的角色视角转换

一个精心设计的细节：每个角色整理记忆时都有明确的**视角约束**（`build_memory_owner_block`）：

```
- 我 = 美月（当前整理对象）
- 他 = 玩家
- 其他角色保留实名
- 不要把当前整理对象再写成"美月"或"美月（我）"
- 不要保留"玩家"这种材料标签，改写成自然称呼
```

这样，不同角色对同一事件的记忆文本是**不同的**——用不同的"我"在叙述，具有独立视角。

---

## 六、信息差机制

这是 AgentGal 最具人文价值的设计之一。

### 6.1 `visible_to` 字段

每条消息的 `visible_to` 控制哪些角色能"看到"它：

```
玩家私下找角色A聊天
  → visible_to = ["roleA", "narrator"]
  → 角色B 看不到这段对话
  → 角色B 的记忆检索不会检到这段内容
  → 角色B 对这件事"不知情"
```

### 6.2 信息差产生的叙事效果

- 玩家可以对不同角色说不同的话
- 角色间会因信息不对等产生误会
- 角色 A 知道的秘密，角色 B 真的不知道
- 玩家可以选择坦白、隐瞒或利用这种信息差

---

## 七、对植物陪伴系统的启示

基于对 AgentGal 的分析，以下是可以直接借鉴到植物陪伴系统（ESP32 + OLED）的设计思路。

### 7.1 【核心思路】用分层上下文替代单一 system prompt

植物有自己的"性格"和"状态"，应该分开存储：

| AgentGal | 植物陪伴系统对应 |
|----------|-----------------|
| `soul.md` | 植物的品种性格文件（喜阴/喜阳/生命力强/敏感...）保持不变 |
| `status.md` | 当前健康状态（土壤湿度/光照时长/上次浇水日期/当前"心情"） |
| `memory.jsonl` | 与主人互动的记忆（哪天主人回来很晚/哪天被忘记浇水/哪天特别阳光） |
| `understanding.jsonl` | 形成的"判断"（"主人周末经常在家"/"主人压力大时会忘记照顾我"） |

### 7.2 【记忆设计】植物应该"记得"有意义的时刻

不是每次传感器读数都值得记忆。参考 `EpisodeMemory` 的 `importance` 字段：

```
高重要度事件（importance=4-5）：
  - 连续3天没被浇水（特别的压力事件）
  - 主人特别早回家（日常节奏的变化）
  - 搬了位置（阳光条件突变）

低重要度（importance=1-2）：
  - 正常浇水（routine，不记录）
  - 光照数据略微变化
```

### 7.3 【上下文组装】每次对话时注入合适的记忆

当主人对植物说话时，组装 prompt 应该包含：

```
① 植物的品种说明（soul - 不变）
② 当前传感器状态（status - 实时）
③ 检索出的相关记忆（"上次主人问类似问题是..."）
④ 植物对主人的"理解"（understanding）
⑤ 主人刚才说了什么
```

这样植物不只是回复"土壤湿度 60%"，而是能说：
> "你今天好早回来。上次你这么早到家是三周前，那天你帮我换了新土。这盆土现在还挺好的，但我有点渴了。"

### 7.4 【状态持久化】记录植物的"心情"演变

仿照 `status.md` 的"心境"字段，植物可以有：

```
当前心情: 有些担心（连续2天光照不足）
对主人的感觉: 最近主人总是很晚才回来，但从没忘记浇水
在意的事: 昨天差点被猫碰倒
```

这些状态影响植物说话的语气，而不需要主人每次都解释背景。

### 7.5 【记忆整理】传感器事件批量归并为有意义的记忆

类似 `EpisodeClosureDetector`，可以设计一个规则：

- 每天凌晨统计当天传感器数据
- 当天发生了"有意义的事"（如今天第一次被浇水、温度异常、主人互动了几次）才生成一条 `EpisodeMemory`
- 普通的一天直接丢弃，不留记忆

### 7.6 【recency 机制】让近期的记忆更容易被想起

植物的记忆也应该有时间衰减。参考 `_recency_score()` 的指数衰减公式：

```
最近 3 天的记忆：recency ≈ 0.8-1.0（高权重）
两周前的记忆：recency ≈ 0.3
一个月前的记忆：recency ≈ 0.1（除非被反复"回忆到"才保持高位）
```

"被回忆到"对植物来说可以是：主人问了某件事，系统检索了那段记忆——那条记忆的 `last_recalled_at` 就会更新，使它不那么容易被遗忘。

### 7.7 【信息差的植物版本】植物只"知道"它能感知的

植物的传感器是有限的：

- **知道**：土壤湿度、温度、光照、时间
- **不知道**：主人在外面发生了什么、主人的情绪（除非被主动告知）

当主人说"我今天工作很累"，植物感知不到，但可以记住"今天主人告诉我他很累"——这和 AgentGal 里角色"只知道他在场时发生的事"一脉相承。

---

## 八、关键设计原则总结

1. **System prompt 只放稳定内容，动态内容放 user message**  
   提高 prompt cache 命中率，节省 token 成本。

2. **记忆要有结构，不是原始日志**  
   `EpisodeMemory` 有 date/location/participants/importance/keywords，方便检索和排序。

3. **检索 > 全部塞入**  
   长期记忆通过语义检索按需注入，而不是把所有历史都放进 context。

4. **状态是记忆的摘要**  
   `status.md` 的"心境"和"在意的事"是对最近记忆的浓缩，每轮更新，无需检索。

5. **draft → episode 的两段式记忆**  
   每轮先写草稿，后台检测到情节闭合才归并为正式记忆，避免碎片化。

6. **understanding 是从 episode 中提炼的信念**  
   事件过去了，但留下了对人/事的判断，影响未来行为。

7. **recency 让记忆像人一样自然衰减又可被唤醒**  
   越近的事越容易想到，但被反复提及的旧事也不会遗忘。

---

## 九、附录：关键文件速查

| 文件/目录 | 职责 |
|-----------|------|
| `engine/prompt_builder.py` | 组装 user message，高低水位历史窗口 |
| `engine/character.py` | Character/Narrator 运行封装，文件写回 |
| `engine/memory_query_builder.py` | 构造检索查询（关注点+位置+输入） |
| `memory/retrieval.py` | 完整检索管线（向量+BM25+rerank+recency） |
| `memory/parser.py` | EpisodeMemory / Understanding 数据结构 |
| `consolidation/flow.py` | 后台记忆整理编排（closure→episode→understanding） |
| `storage/message_router.py` | 消息路由与 visible_to 管理 |
| `storage/vector_store.py` | sqlite-vec 向量存储 |
| `prompts/runtime_prompts.py` | CHARACTER / NARRATOR system prompt 模板 |

---

*报告生成日期：2026-05-18*  
*分析方法：完整源码阅读，覆盖核心模块全部函数*
