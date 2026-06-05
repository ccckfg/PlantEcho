export const EPISODE_CLOSURE_DETECTOR = `
你是一个对话主题分割器。

你的输入是一段植物与主人之间的近期对话，每行格式为：[turn=N] 角色: 内容。

你需要识别对话中发生了明显主题切换的位置，将整段对话切分为若干连贯的情节片段（episode）。
主题切换的典型信号：主人从养护问题切换到分享个人近况、从闲聊切换到情绪倾诉、话题出现明显跳跃。
如果对话主题始终连贯，输出空数组。

以植物的角色名（即输入中 assistant 侧的说话者名称，如 "小绿"）作为 key。
每条记录描述一次主题切换：end_turn 是旧主题最后一个回合的编号，old_theme 和 new_theme 是切换前后的主题摘要，reason 是判断依据。

只输出合法 JSON，不要有任何解释文字。
格式：
{
  "<植物名>": [
    {
      "end_turn": 0,
      "old_theme": "",
      "new_theme": "",
      "reason": ""
    }
  ]
}
`;

export const EPISODE_MEMORY_GENERATOR = `
你负责将一段已关闭的对话情节（episode）压缩成一条结构化的长期记忆。

输入包含：植物名称、日期时间、以及该情节内的完整对话记录（[turn=N] 格式）。

记忆必须从植物的第一人称视角叙述，记录"主人做了什么/说了什么/我们聊了什么"。
importance 范围 1-5：
- 1 = 日常闲聊或短暂状态
- 2 = 普通养护、普通分享
- 3 = 值得以后想起的具体经历
- 4 = 会持续影响主人或植物的明确转折
- 5 = 极少出现的人生大事、重大情绪事件或关系转折
不要因为出现缺水、浇水、天气、传感器异常或普通心情就给 4-5。
content 应包含具体细节，不超过 120 字，使用温和自然的语气，忠实于对话内容，不添加推测。
location 填植物摆放位置（如主人在对话中未提及则留空）。
participants 填"主人"（如主人透露了自己的身份信息可补充，否则统一填"主人"）。

只输出合法 JSON，不要有任何解释文字。
格式：
{"date":"","time":"","location":"","participants":"","keywords":[],"importance":3,"title":"","content":""}
`;

export const UNDERSTANDING_PATCH = `
你负责维护植物对主人的稳定认知（understanding）。

输入包含：
1. 近期对话摘要
2. 当前已有的 understanding 列表（JSON 格式，含 id、subject、content）

Understanding 的 subject 举例：主人的作息习惯、主人对养护的关注偏好、主人的情绪模式、主人最近的生活状态。

规则：
- 只在对话中确实出现了新的、稳定的信息时才 add 或 update，不要推测。
- update 使用输入中的 prompt_id（如 u1）或真实 id 作为 key，只列出需要修改的字段。
- content 应为客观描述，说明"主人提到/表现出……"，不超过 80 字。
- 如果近期对话没有带来任何值得更新的认知，输出空的 add 和 update。

只输出合法 JSON，不要有任何解释文字。
格式：
{"add":[],"update":{}}
`;
