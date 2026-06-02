/* ============================================================
   PlantEcho 官网 · 常量与配置信息 (constants.js)
   ============================================================ */
(function (global) {
  "use strict";

  global.MOODS = {
    happy:   { label: "舒展",   bubble: "今天我感觉绿意盎然！",     caption: "目前不需要照顾我，谢谢你来看我。", tags: ["状态好", "慢呼吸"], bars: { hydration: 72, light: 64, humidity: 57 } },
    thirsty: { label: "想喝水", bubble: "再来一点水，一滴也好。",     caption: "我有点渴了，可以来点水吗？",       tags: ["想喝水"],          bars: { hydration: 21, light: 60, humidity: 38 } },
    sunny:   { label: "晒太阳", bubble: "这光线刚刚好。",           caption: "我很喜欢现在的阳光。",           tags: ["晒太阳", "向光中"], bars: { hydration: 64, light: 88, humidity: 52 } },
    offline: { label: "在等",   bubble: "我暂时听不到自己的传感器了。", caption: "我在等下一次读数。",             tags: ["待感知"],          bars: { hydration: 0,  light: 0,  humidity: 0 } },
  };

  global.REFLECTIONS = {
    happy:   "安静的生长，从来不急着证明春天。",
    thirsty: "干渴让根向深处走，照料让绿意回到枝头。",
    sunny:   "向光不是急切，是每一天慢慢转身。",
    offline: "沉默，也是生长的一部分。",
  };

  global.PAGE_TIMINGS = {
    heroMoodCycleMs: 3000,
    moodSwitchCycleMs: 2600,
    proactiveCarouselCycleMs: 3200,
  };
})(window);
