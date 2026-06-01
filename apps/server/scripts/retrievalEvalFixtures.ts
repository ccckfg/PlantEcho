export interface MemoryFixture {
  label: string;
  title: string;
  content: string;
  keywords: string[];
  importance: number;
}

export interface QueryFixture {
  id: string;
  text: string;
  expected: string;
  note: string;
}

export const targetMemories: MemoryFixture[] = [
  ["east-window", "从客厅搬到了东窗边", "主人把我从客厅移到东窗边，说那里上午光线更柔和，想让我慢慢适应新位置。", ["东窗", "位置", "光照"], 4],
  ["north-balcony", "短暂去北阳台透气", "主人下午把我放到北阳台通风十五分钟，又担心风太大很快搬回书桌旁。", ["北阳台", "通风"], 3],
  ["friday-water", "周五浇水习惯", "主人说以后每周五晚上检查土壤，如果表层发干就少量浇水，不再凭感觉猛浇。", ["周五", "浇水"], 4],
  ["overwater-lesson", "上次浇太多的教训", "主人提到上次一次性浇太多，托盘积水半天，所以这周想改成分次少量浇。", ["积水", "过湿"], 4],
  ["exam-week", "考试周压力", "主人说这周准备考试很紧张，希望我在桌边陪他复习到晚上十一点。", ["考试", "复习", "压力"], 5],
  ["late-work", "连续加班的一晚", "主人说今天加班到很晚，回家只想安静坐一会儿，看我叶子舒展开会放松。", ["加班", "放松"], 4],
  ["business-trip", "三天出差安排", "主人说周三到周五要出差，拜托室友帮忙看土壤湿度，不要让阳光直晒。", ["出差", "室友"], 5],
  ["cat-warning", "猫会扒土", "主人提醒家里的猫最近总想扒花盆土，所以晚上要把我放到高一点的架子上。", ["猫", "花盆"], 4],
  ["yellow-leaf", "发现一片黄叶", "主人发现底部有一片老叶发黄，决定先剪掉并观察新叶是否健康。", ["黄叶", "修剪"], 4],
  ["new-leaf", "新叶展开", "主人很开心地说我长出一片浅绿色新叶，叶尖已经完全展开。", ["新叶", "生长"], 5],
  ["coffee-chat", "咖啡味的早晨", "主人早上端着拿铁坐在我旁边，说咖啡香和植物味道让书桌像小花园。", ["咖啡", "早晨"], 2],
  ["music-preference", "听轻音乐写代码", "主人说写代码时喜欢放很轻的钢琴曲，声音太大会分心，也怕影响我安静。", ["音乐", "代码"], 3],
  ["birthday", "生日愿望", "主人说生日愿望是把房间整理成绿色角落，希望我和其他植物都好好长大。", ["生日", "绿色角落"], 5],
  ["low-light-rain", "雨天光照不足", "连续阴雨时读数显示光照偏低，主人说会把窗帘拉开并补一点植物灯。", ["雨天", "光照", "植物灯"], 4],
  ["hot-afternoon", "午后温度偏高", "下午温度升高时主人把我从窗边挪开，避免叶片被直晒晒蔫。", ["高温", "直晒"], 4],
  ["humidity-spray", "克制喷雾", "主人本想频繁喷雾，后来决定先看空气湿度读数，不让叶面长期潮湿。", ["喷雾", "湿度"], 3],
  ["fertilizer-plan", "薄肥计划", "主人说春天只用很稀的营养液，两周一次，不想让我被浓肥刺激。", ["施肥", "营养液"], 4],
  ["pot-rotation", "转盆方向", "主人发现我总朝窗户方向偏，于是决定每周把花盆转九十度。", ["转盆", "朝向"], 3],
  ["soil-calibration", "干湿土校准", "主人用干土和湿土分别记录传感器数值，说要把土壤湿度百分比校准得更准。", ["校准", "湿度"], 5],
  ["photo-album", "拍照记录新叶", "主人拍了三张新叶照片放进相册，想以后对比我每个月的变化。", ["相册", "照片"], 3],
  ["desk-lamp", "台灯距离调整", "主人把台灯从我头顶移到侧前方，担心灯太近会让叶片局部发热。", ["台灯", "距离"], 3],
  ["winter-cold", "冬天夜里偏冷", "主人说冬天夜里窗边会冷，晚上会把我往房间里面挪一点。", ["冬天", "低温"], 4],
  ["friend-visit", "朋友来访夸叶子", "朋友来家里时夸我的叶子很亮，主人听了很开心，还说会继续认真照顾。", ["朋友", "夸奖"], 2],
  ["softap-plan", "想做配网按钮", "主人提到以后想给设备加长按配网按钮，这样换 Wi-Fi 不用重新烧录。", ["配网", "按钮"], 4]
].map(([label, title, content, keywords, importance]) => ({
  label: String(label),
  title: String(title),
  content: String(content),
  keywords: keywords as string[],
  importance: Number(importance)
}));

export const distractors: MemoryFixture[] = Array.from({ length: 96 }, (_, index) => {
  const topics = [
    "整理书架", "擦拭叶面", "移动键盘", "购买花盆", "打开窗户", "关闭空调",
    "记录读数", "清理托盘", "观察根系", "调整窗帘", "整理照片", "聊天陪伴"
  ];
  const topic = topics[index % topics.length]!;
  return {
    label: `distractor-${index + 1}`,
    title: `${topic}的普通记录 ${index + 1}`,
    content: `这是一次日常记录：主人提到${topic}，但没有包含关键测试问题中的特定安排。编号 ${index + 1} 用于增加检索干扰。`,
    keywords: [topic, "干扰项"],
    importance: (index % 5) + 1
  };
});

export const queries: QueryFixture[] = [
  ["q-east-window", "我是不是被从客厅挪到东窗边过？", "east-window", "位置变化"],
  ["q-north-balcony", "哪次我去北阳台只是通风了一小会儿？", "north-balcony", "短时通风"],
  ["q-friday-water", "主人说以后固定什么时候检查土壤再浇水？", "friday-water", "浇水习惯"],
  ["q-overwater", "之前哪次提到托盘积水所以要少量分次浇？", "overwater-lesson", "过湿教训"],
  ["q-exam", "主人考试周希望我怎么陪他？", "exam-week", "情绪压力"],
  ["q-late-work", "加班很晚回家想看叶子放松是哪条记忆？", "late-work", "工作疲惫"],
  ["q-trip", "主人出差时拜托谁帮忙看土壤？", "business-trip", "出差安排"],
  ["q-cat", "为什么晚上要把花盆放到高架子上？", "cat-warning", "猫扒土"],
  ["q-yellow", "底部老叶发黄时主人打算怎么处理？", "yellow-leaf", "黄叶处理"],
  ["q-new-leaf", "哪条记忆说我长出浅绿色新叶？", "new-leaf", "生长事件"],
  ["q-coffee", "咖啡香和植物味让书桌像什么？", "coffee-chat", "生活片段"],
  ["q-music", "主人写代码时喜欢放什么音乐？", "music-preference", "偏好"],
  ["q-birthday", "主人生日想把房间整理成什么？", "birthday", "生日愿望"],
  ["q-rain-light", "连续阴雨光照不足时主人准备怎么补光？", "low-light-rain", "弱光"],
  ["q-hot", "午后温度偏高时为什么把我从窗边挪开？", "hot-afternoon", "高温"],
  ["q-spray", "主人为什么决定不要频繁喷雾？", "humidity-spray", "湿度判断"],
  ["q-fertilizer", "春天营养液计划是什么频率和浓度？", "fertilizer-plan", "施肥"],
  ["q-rotation", "主人为什么每周把花盆转九十度？", "pot-rotation", "转盆"],
  ["q-calibration", "干土湿土读数是为了校准什么？", "soil-calibration", "传感器校准"],
  ["q-album", "主人拍三张新叶照片是想以后做什么？", "photo-album", "相册"],
  ["q-lamp", "台灯为什么从头顶移到侧前方？", "desk-lamp", "灯距"],
  ["q-winter", "冬天夜里窗边冷时主人会怎么移动我？", "winter-cold", "低温"],
  ["q-friend", "朋友来访夸了我的什么？", "friend-visit", "朋友来访"],
  ["q-softap", "换 Wi-Fi 不重新烧录需要加什么功能？", "softap-plan", "配网"],
  ["q-east-alt", "哪条记忆和上午柔和光线、东窗有关？", "east-window", "同义查询"],
  ["q-trip-alt", "谁会在主人周三到周五不在时照看湿度？", "business-trip", "同义查询"],
  ["q-calibration-alt", "土壤百分比不准时主人做了哪种校准实验？", "soil-calibration", "同义查询"],
  ["q-rerank-hard", "不是普通移动键盘，是那次把植物换到窗边的位置调整", "east-window", "干扰区分"],
  ["q-light-hard", "和窗帘、植物灯有关的阴雨记录是哪条？", "low-light-rain", "干扰区分"],
  ["q-water-hard", "不要猛浇、看表层土干不干，这个规则是什么？", "friday-water", "干扰区分"],
  ["q-hot-alt", "哪条记忆说叶片可能被直晒晒蔫？", "hot-afternoon", "同义查询"],
  ["q-spray-alt", "叶面长期潮湿这个风险对应哪条记录？", "humidity-spray", "同义查询"],
  ["q-fertilizer-alt", "浓肥刺激这个担心出现在什么计划里？", "fertilizer-plan", "同义查询"],
  ["q-rotation-alt", "为了不一直朝窗户偏，主人准备怎么做？", "pot-rotation", "同义查询"],
  ["q-album-alt", "每个月对比变化这件事和什么记录有关？", "photo-album", "同义查询"],
  ["q-lamp-alt", "局部发热是主人调整哪个物品时担心的？", "desk-lamp", "同义查询"],
  ["q-winter-alt", "晚上往房间里面挪一点是为了避开什么？", "winter-cold", "同义查询"],
  ["q-friend-alt", "主人因为别人夸叶子亮而开心是哪件事？", "friend-visit", "同义查询"],
  ["q-softap-alt", "长按按钮和换网络不用重新烧录说的是哪条计划？", "softap-plan", "同义查询"],
  ["q-cat-alt", "高一点的架子和花盆土被扒有什么关系？", "cat-warning", "同义查询"],
  ["q-birthday-alt", "绿色角落是主人什么时候提到的愿望？", "birthday", "同义查询"],
  ["q-music-alt", "声音太大会分心，所以主人写代码放什么？", "music-preference", "同义查询"],
  ["q-coffee-alt", "哪条记忆把书桌比作小花园？", "coffee-chat", "同义查询"],
  ["q-new-leaf-alt", "浅绿色叶尖完全展开对应哪条成长记录？", "new-leaf", "同义查询"],
  ["q-yellow-alt", "剪掉并观察新叶健康是因为什么？", "yellow-leaf", "同义查询"],
  ["q-late-work-alt", "看叶子舒展开会放松，这和主人哪天状态有关？", "late-work", "同义查询"],
  ["q-exam-alt", "复习到晚上十一点这件事发生在什么时期？", "exam-week", "同义查询"],
  ["q-overwater-alt", "分次少量浇水是为了避免重复哪次问题？", "overwater-lesson", "同义查询"]
].map(([id, text, expected, note]) => ({
  id: String(id),
  text: String(text),
  expected: String(expected),
  note: String(note)
}));
