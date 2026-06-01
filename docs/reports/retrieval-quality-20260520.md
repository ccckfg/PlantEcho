# 记忆检索质量评估报告

- 日期：2026/5/20 21:04:25
- 数据库：C:\Users\Lenovo\Desktop\Project N\DYN\.codex-smoke\dyn-retrieval-eval-1c704d590cd44f79ada2031df8282c06\dyn.sqlite
- 记忆数量：120（目标 24，干扰 96）
- 查询数量：48
- Embedding：gemini-embedding-001
- Rerank：Qwen/Qwen3-Reranker-8B @ https://api.ccckfg.com/v1/rerank

## 总体指标

| 方法 | Top-1 | Top-3 | Top-5 | MRR |
| --- | ---: | ---: | ---: | ---: |
| bm25 | 100.0% | 100.0% | 100.0% | 1.000 |
| vector | 93.8% | 100.0% | 100.0% | 0.965 |
| hybrid | 100.0% | 100.0% | 100.0% | 1.000 |
| rerank | 100.0% | 100.0% | 100.0% | 1.000 |

## Rerank 明细

| 查询 | 期望记忆 | Rank | Top 3 |
| --- | --- | ---: | --- |
| 我是不是被从客厅挪到东窗边过？ | east-window | 1 | east-window:从客厅搬到了东窗边<br>hot-afternoon:午后温度偏高<br>winter-cold:冬天夜里偏冷 |
| 哪次我去北阳台只是通风了一小会儿？ | north-balcony | 1 | north-balcony:短暂去北阳台透气<br>east-window:从客厅搬到了东窗边<br>distractor-89:打开窗户的普通记录 89 |
| 主人说以后固定什么时候检查土壤再浇水？ | friday-water | 1 | friday-water:周五浇水习惯<br>business-trip:三天出差安排<br>soil-calibration:干湿土校准 |
| 之前哪次提到托盘积水所以要少量分次浇？ | overwater-lesson | 1 | overwater-lesson:上次浇太多的教训<br>friday-water:周五浇水习惯<br>fertilizer-plan:薄肥计划 |
| 主人考试周希望我怎么陪他？ | exam-week | 1 | exam-week:考试周压力<br>late-work:连续加班的一晚<br>distractor-60:聊天陪伴的普通记录 60 |
| 加班很晚回家想看叶子放松是哪条记忆？ | late-work | 1 | late-work:连续加班的一晚<br>distractor-38:擦拭叶面的普通记录 38<br>friend-visit:朋友来访夸叶子 |
| 主人出差时拜托谁帮忙看土壤？ | business-trip | 1 | business-trip:三天出差安排<br>cat-warning:猫会扒土<br>friday-water:周五浇水习惯 |
| 为什么晚上要把花盆放到高架子上？ | cat-warning | 1 | cat-warning:猫会扒土<br>hot-afternoon:午后温度偏高<br>winter-cold:冬天夜里偏冷 |
| 底部老叶发黄时主人打算怎么处理？ | yellow-leaf | 1 | yellow-leaf:发现一片黄叶<br>humidity-spray:克制喷雾<br>overwater-lesson:上次浇太多的教训 |
| 哪条记忆说我长出浅绿色新叶？ | new-leaf | 1 | new-leaf:新叶展开<br>photo-album:拍照记录新叶<br>birthday:生日愿望 |
| 咖啡香和植物味让书桌像什么？ | coffee-chat | 1 | coffee-chat:咖啡味的早晨<br>north-balcony:短暂去北阳台透气<br>birthday:生日愿望 |
| 主人写代码时喜欢放什么音乐？ | music-preference | 1 | music-preference:听轻音乐写代码<br>coffee-chat:咖啡味的早晨<br>exam-week:考试周压力 |
| 主人生日想把房间整理成什么？ | birthday | 1 | birthday:生日愿望<br>distractor-85:整理书架的普通记录 85<br>distractor-73:整理书架的普通记录 73 |
| 连续阴雨光照不足时主人准备怎么补光？ | low-light-rain | 1 | low-light-rain:雨天光照不足<br>east-window:从客厅搬到了东窗边<br>hot-afternoon:午后温度偏高 |
| 午后温度偏高时为什么把我从窗边挪开？ | hot-afternoon | 1 | hot-afternoon:午后温度偏高<br>east-window:从客厅搬到了东窗边<br>winter-cold:冬天夜里偏冷 |
| 主人为什么决定不要频繁喷雾？ | humidity-spray | 1 | humidity-spray:克制喷雾<br>fertilizer-plan:薄肥计划<br>overwater-lesson:上次浇太多的教训 |
| 春天营养液计划是什么频率和浓度？ | fertilizer-plan | 1 | fertilizer-plan:薄肥计划<br>overwater-lesson:上次浇太多的教训<br>humidity-spray:克制喷雾 |
| 主人为什么每周把花盆转九十度？ | pot-rotation | 1 | pot-rotation:转盆方向<br>east-window:从客厅搬到了东窗边<br>cat-warning:猫会扒土 |
| 干土湿土读数是为了校准什么？ | soil-calibration | 1 | soil-calibration:干湿土校准<br>humidity-spray:克制喷雾<br>distractor-79:记录读数的普通记录 79 |
| 主人拍三张新叶照片是想以后做什么？ | photo-album | 1 | photo-album:拍照记录新叶<br>late-work:连续加班的一晚<br>birthday:生日愿望 |
| 台灯为什么从头顶移到侧前方？ | desk-lamp | 1 | desk-lamp:台灯距离调整<br>east-window:从客厅搬到了东窗边<br>low-light-rain:雨天光照不足 |
| 冬天夜里窗边冷时主人会怎么移动我？ | winter-cold | 1 | winter-cold:冬天夜里偏冷<br>pot-rotation:转盆方向<br>hot-afternoon:午后温度偏高 |
| 朋友来访夸了我的什么？ | friend-visit | 1 | friend-visit:朋友来访夸叶子<br>new-leaf:新叶展开<br>east-window:从客厅搬到了东窗边 |
| 换 Wi-Fi 不重新烧录需要加什么功能？ | softap-plan | 1 | softap-plan:想做配网按钮<br>distractor-75:移动键盘的普通记录 75<br>humidity-spray:克制喷雾 |
| 哪条记忆和上午柔和光线、东窗有关？ | east-window | 1 | east-window:从客厅搬到了东窗边<br>hot-afternoon:午后温度偏高<br>north-balcony:短暂去北阳台透气 |
| 谁会在主人周三到周五不在时照看湿度？ | business-trip | 1 | business-trip:三天出差安排<br>friday-water:周五浇水习惯<br>humidity-spray:克制喷雾 |
| 土壤百分比不准时主人做了哪种校准实验？ | soil-calibration | 1 | soil-calibration:干湿土校准<br>pot-rotation:转盆方向<br>friday-water:周五浇水习惯 |
| 不是普通移动键盘，是那次把植物换到窗边的位置调整 | east-window | 1 | east-window:从客厅搬到了东窗边<br>distractor-75:移动键盘的普通记录 75<br>distractor-27:移动键盘的普通记录 27 |
| 和窗帘、植物灯有关的阴雨记录是哪条？ | low-light-rain | 1 | low-light-rain:雨天光照不足<br>distractor-46:调整窗帘的普通记录 46<br>distractor-70:调整窗帘的普通记录 70 |
| 不要猛浇、看表层土干不干，这个规则是什么？ | friday-water | 1 | friday-water:周五浇水习惯<br>humidity-spray:克制喷雾<br>business-trip:三天出差安排 |
| 哪条记忆说叶片可能被直晒晒蔫？ | hot-afternoon | 1 | hot-afternoon:午后温度偏高<br>desk-lamp:台灯距离调整<br>low-light-rain:雨天光照不足 |
| 叶面长期潮湿这个风险对应哪条记录？ | humidity-spray | 1 | humidity-spray:克制喷雾<br>distractor-74:擦拭叶面的普通记录 74<br>distractor-14:擦拭叶面的普通记录 14 |
| 浓肥刺激这个担心出现在什么计划里？ | fertilizer-plan | 1 | fertilizer-plan:薄肥计划<br>distractor-62:擦拭叶面的普通记录 62<br>distractor-26:擦拭叶面的普通记录 26 |
| 为了不一直朝窗户偏，主人准备怎么做？ | pot-rotation | 1 | pot-rotation:转盆方向<br>hot-afternoon:午后温度偏高<br>winter-cold:冬天夜里偏冷 |
| 每个月对比变化这件事和什么记录有关？ | photo-album | 1 | photo-album:拍照记录新叶<br>distractor-19:记录读数的普通记录 19<br>distractor-67:记录读数的普通记录 67 |
| 局部发热是主人调整哪个物品时担心的？ | desk-lamp | 1 | desk-lamp:台灯距离调整<br>hot-afternoon:午后温度偏高<br>north-balcony:短暂去北阳台透气 |
| 晚上往房间里面挪一点是为了避开什么？ | winter-cold | 1 | winter-cold:冬天夜里偏冷<br>hot-afternoon:午后温度偏高<br>cat-warning:猫会扒土 |
| 主人因为别人夸叶子亮而开心是哪件事？ | friend-visit | 1 | friend-visit:朋友来访夸叶子<br>new-leaf:新叶展开<br>photo-album:拍照记录新叶 |
| 长按按钮和换网络不用重新烧录说的是哪条计划？ | softap-plan | 1 | softap-plan:想做配网按钮<br>fertilizer-plan:薄肥计划<br>soil-calibration:干湿土校准 |
| 高一点的架子和花盆土被扒有什么关系？ | cat-warning | 1 | cat-warning:猫会扒土<br>distractor-40:购买花盆的普通记录 40<br>distractor-64:购买花盆的普通记录 64 |
| 绿色角落是主人什么时候提到的愿望？ | birthday | 1 | birthday:生日愿望<br>exam-week:考试周压力<br>east-window:从客厅搬到了东窗边 |
| 声音太大会分心，所以主人写代码放什么？ | music-preference | 1 | music-preference:听轻音乐写代码<br>distractor-63:移动键盘的普通记录 63<br>distractor-51:移动键盘的普通记录 51 |
| 哪条记忆把书桌比作小花园？ | coffee-chat | 1 | coffee-chat:咖啡味的早晨<br>north-balcony:短暂去北阳台透气<br>birthday:生日愿望 |
| 浅绿色叶尖完全展开对应哪条成长记录？ | new-leaf | 1 | new-leaf:新叶展开<br>distractor-74:擦拭叶面的普通记录 74<br>distractor-62:擦拭叶面的普通记录 62 |
| 剪掉并观察新叶健康是因为什么？ | yellow-leaf | 1 | yellow-leaf:发现一片黄叶<br>photo-album:拍照记录新叶<br>new-leaf:新叶展开 |
| 看叶子舒展开会放松，这和主人哪天状态有关？ | late-work | 1 | late-work:连续加班的一晚<br>new-leaf:新叶展开<br>hot-afternoon:午后温度偏高 |
| 复习到晚上十一点这件事发生在什么时期？ | exam-week | 1 | exam-week:考试周压力<br>winter-cold:冬天夜里偏冷<br>late-work:连续加班的一晚 |
| 分次少量浇水是为了避免重复哪次问题？ | overwater-lesson | 1 | overwater-lesson:上次浇太多的教训<br>friday-water:周五浇水习惯<br>fertilizer-plan:薄肥计划 |

## 需要关注的失败/弱项

- Rerank Top-3 无失败项。

## 结论

本次评估使用真实 embedding、sqlite-vec、FTS5/BM25、Qwen rerank 链路。Top-K 指标越高，说明聊天上下文越可能拿到正确长期记忆。
