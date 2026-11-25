# 历史长卷 · Plan

**Goal:** history you can talk about. Each era is told through the stories every Chinese person grew up with (范蠡 sailing off after his king won, 屈原 jumping into the 汨罗江), the festivals, sayings and food that came out of them, and where they happened on today's map. A second scroll runs from the 鸦片战争 to today: how 毛泽东 took power, how power passed from him to 习近平, how Chinese politics works now, and which topics are sensitive and why.

**Status (2026-11-24):** planned, nothing built. Your decisions are in §0, and the rest of the file follows them.

---

## 0. Decisions

From you:

1. **卷二 ships first** (1840 to today), then the dynasties.
2. **Sensitive topics are in:** 1989, the 文革, the famine, 西藏, 新疆, 香港, 台湾 and the rest. Each one is marked 敏感 and says why it's sensitive (§7).
3. **Mostly Chinese sources** in every story (§9).
4. **Pictures in every story,** not just one at the top (§8).
5. **No old maps.** Every map is the app's own map, the same one as the 地图 tab, and you can pan, zoom and tap it (§5).
6. **No merged eras.** 新 and 武周 keep their own tiles.
7. **It works like the 百科:** each story is written once and shows up everywhere it belongs (§3).

Calls I made (say if you disagree):

- **Where it lives:** the 地图 tab gets a **历史** switch next to 分区 that turns the same map back in time. The 长卷 (every era in order) is its own page, and the four series sit on the 书架 (§3).
- **传说时代** stays as the first tile. It's an addition, not a merge.
- **清 appears twice:** 清 (1644–1840) closes 卷一 and 晚清 (1840–1912) opens 卷二, because the 鸦片战争 is where the modern story starts. 中华人民共和国 becomes three chapters: 毛泽东时代, 改革开放, 新时代.
- **楚汉相争** stays inside 西汉. It was never its own period in the data.
- That makes **28 tiles**: 23 in 卷一 and 5 in 卷二, and 28 朝代印 to collect.

---

## 1. What's wrong with the 历史地图 now

From the code (`src/screens/HistoricalAtlas.tsx`, `src/data/history-periods.json`) and the running app:

- **It looks like a different app.** It uses a native `<select>` to pick a period, scanned Wikimedia maps in six different styles (one is a 1930 print), and stamp-sized portraits with licence notes under every one. Everywhere else the app uses chunky tiles, paper reading boxes, photo rows, a 下一站 trail and seals.
- **It's about battles.** The only section is 主要战事: 40 events, most of them wars. Battles are the part of history people talk about least.
- **There's almost nothing to read.** Each era has a 50–90 字 overview and one to three event paragraphs. 春秋 is one paragraph about 城濮之战.
- **Nothing connects.** 春秋 doesn't link to the 勾践, 夫差, 范蠡, 西施 and 伍子胥 pages that already exist in the 百科. No 成语 or festival is mentioned.
- **There's no way to learn it:** no quiz, no 彩蛋 flashcards, no progress, no reason to come back.
- **Modern China is nearly missing.** 中华人民共和国 has three border wars. Nothing about 毛泽东's rise, the 文革, 改革开放 or 习近平.

## 2. The idea

Replace it with a **历史长卷** built on the **朝代歌**, the rhyme every Chinese child memorises:

> 夏商与西周，东周分两段。春秋和战国，一统秦两汉。三分魏蜀吴，二晋前后延。南北朝并立，隋唐五代传。宋元明清后，王朝至此完。

Three things make it work:

- **The map goes back in time.** Flip the 地图 tab to 历史, swipe through the eras, and the map you already know redraws: that era's states over today's provinces, its capital, where each story happened, and routes like 张骞's journey or the 长征.
- **Each era is told through stories.** An era page is built like a 百科 page: a short read, the era's stories with pictures, the traditions and sayings it left behind (聊天彩蛋), its map, and a quiz that stamps an **朝代印**.
- **Every story is a 百科 page.** Written once, it appears on its era, on the map, on its province and city pages, in other stories, in its series, in 刷一刷 and on Today.

After 清 the rhyme ends (王朝至此完) and **卷二 · 近现代** begins: five chapters from 1840 to today, each with a **聊天提示** (what people are proud of, what older people lived through, what not to bring up), the **权力接力** from 毛泽东 to 习近平, **今天的中国怎么运作**, and a **为什么敏感** note on every sensitive story.

The biggest arcs are also **追剧 series** with recall gates: 鸦片战争, 毛泽东：从韶山到天安门, 从毛到习, 吴越争霸. A story told over five episodes is the easiest kind to remember.

---

## 3. Where it lives

### Homes

- **地图 tab, 历史 switch:** the main way in (§4.1). History is the same map, back in time, so it belongs where the map is.
- **历史长卷** (`#/history`): every era in order, with progress, seals and the 朝代歌 game (§4.2). Reached from the 历史 card on the map and from the 书架.
- **书架:** a 历史 shelf with the four series and a 长卷 card.

### One story, many doors

Each story is one file, `content/wiki/<id>.md`, with `era`, `province`, `city` and `at` (where it happened). The 百科 already works this way: the 范蠡 page has `province: [zhejiang, shandong, henan]` and `city: [shaoxing]`. History adds `era`, and from those four fields the page shows up in:

| Where | What you see |
|---|---|
| 地图 · 历史 | a pin at `at` while its era is showing |
| Era page | a card under 故事 |
| 历史长卷 | 先读这几个, for the eight 聊天推荐 picks |
| Province page | a **这里的历史** row, sorted by era (湖南: 屈原 … 毛泽东) |
| City page | the same row for the city (绍兴: 勾践, 王羲之, 鲁迅) |
| Other 百科 pages | [[links]] and 下一站 hooks, some across eras on purpose |
| Series episodes | a link to each person's page, and the page links back to the series |
| 刷一刷 | 你知道吗？ cards made from the page's hook |
| 今天 | **历史上的今天** (10月1日: 开国大典) and the festival line (端午 in 12 days → 屈原) |
| 百科 home | a 按朝代 shelf |
| 集章册 | the 朝代印, next to the province stamps |

Reading progress is shared. Mark a page 读完了 once and it's ticked everywhere, because it's the same `db.wiki` row.

---

## 4. Screens

### 4.1 地图 · 历史

The 地图 tab gets a second chip next to 分区: **历史**. The HomeCard button that now says 历史地图 flips the map into this mode too.

- **Era strip** under the search bar: one chip per era in rhyme order, then the five 卷二 chapters. The chosen chip fills with its era colour, and read eras have a tick. Swiping the strip changes the map.
- **The map** is the same `ExploreMap`. Today's provinces fade to paper colour with thin borders, and the history layer goes on top:
  - **states**, tinted in their own colours, with their names drawn big (the `areas` labels 分区 already uses): 齐 晋 楚 秦 吴 越…
  - **capitals**, pinned with a 都 marker;
  - **story pins** for the era's 百科 pages;
  - **routes** as dashed lines: 张骞出使西域, 郑和下西洋, 京杭大运河, 长征, 邓小平南巡, 习近平's posts from 梁家河 to 北京.

  Pan and zoom work as always, and cities appear as you zoom in, so you can see that 越's capital 会稽 is today's 绍兴.
- **Bottom card,** like the province card: era name, dates, rhyme line, hook, progress ring and seal, three story thumbnails, and two buttons, **读这个朝代** (the era page) and **长卷**.
- **Tap a state:** `越 · 大约是今天的浙江北部（绍兴、宁波、杭州…）`, its stories, and a link to the province.
- **Tap a pin:** the story's photo, lede and 读 →.
- `#/map/history/<era>` opens the map in this mode at that era.

### 4.2 历史长卷 (`#/history`)

- **Top:** title, `已读 23/220 个故事 · 朝代印 3/28`, and a **先读这几个** row: the eight 聊天推荐 picks already in the data (赤壁, 鸦片战争, 长平…), as photo cards.
- **朝代歌 game:** a chunky button that opens fill-in-the-blank on the rhyme (夏商与__，东周分两段). It takes about 30 seconds and makes a good first-day hook.
- **The path:** one heading per rhyme line, in the book font, with a 🔊 button. Under each heading are that line's eras as tiles. A tile has the era's colour band, a small picture of its emblem (越王勾践剑, 兵马俑, 清明上河图…), its name in big type, its dates, its **one-line hook**, a progress ring and its seal (dashed until earned). Read tiles take on colour and unread ones stay pale, the same idea as 点亮中国.
- **都城在哪儿:** a small map (the app's own) tracing the capital across China (西安 → 洛阳 → 开封 → 杭州 → 南京 → 北京). Tapping a capital jumps to its era.
- **卷二 divider** after 清: `王朝至此完 · 卷二 近现代 1840—今天`, then the five chapters.

### 4.3 An era (`#/history/<era>`)

Same skeleton as the 浙江 page: a hero card, a jump bar, folded sections, 聊天彩蛋 near the top.

1. **Hero:** the era's picture, whole and never cropped, its colour band, `春秋` in 36px black type, `公元前770—前476年`, its rhyme line, the hook and the seal.
2. **Jump bar:** 故事 · 彩蛋 · 地图 · 年表 · 人物 · 考一考.
3. **一分钟读懂:** about 200 字 in the paper box with press-to-peek words, and a 再多读一点 fold of 400–600 字: who ruled, what changed, why the era matters today.
4. **故事:** photo cards for the era's 百科 pages (6–10 for big eras, 2–4 for small ones). Each card has a tag (人物 / 传说 / 事件), its hook question, and a 敏感 pill where it applies. If the era has a series, a 追剧 card comes first (`追剧 · 吴越争霸 · 5集`).
5. **聊天彩蛋 · 今天还在:** the traditions, in tabs: **节日** (端午 ← 屈原), **成语** (卧薪尝胆), **吃的** (粽子, 东坡肉, 油条 ← 秦桧), **还在说** (陶朱公 = 财神). Each egg has a `问：` line and becomes a flashcard through the existing `Eggs` component.
6. **地图:** the era's layer on a `StaticMap`, from the same data as the 地图 tab. Tapping it opens the 地图 tab in 历史 mode at this era.
7. **大事年表:** a compact vertical timeline, one line per event, each with its own pin on the map. The 40 old event write-ups live here, folded, with their portraits and sources.
8. **人物:** a `PeopleRow` from the 51 portraits already in `public/history/` and the era's people pages.
9. **考一考:** 4–5 questions drawn from the era's pages, plus one **排一排** (put four events in order). Passing stamps the 朝代印: the era's key character (春, 战, 秦, 汉, 新, 唐, 周…) in the existing `Seal`.
10. **下一站:** the next era's tile with its hook, and the previous era.

### 4.4 A story (five additions to 百科 pages)

1. **Era chip** under the name (`春秋`), in the era's colour, linking back to the era.
2. **Pictures in the text:** besides the hero photo, 2–4 pictures sit under the paragraphs they belong to, each with a one-line caption (§8).
3. **为什么敏感**, a box at the top of sensitive pages (§7), and a 敏感 pill on the page's card wherever the card appears.
4. **读原文:** a fold with one to three lines from the original source, a plain-Chinese version under them, and press-to-peek. 屈原 gets 《离骚》's 路漫漫其修远兮; 范蠡 gets 《史记》's 蜚鸟尽，良弓藏. 卷二 pages use a documented quote instead, such as 毛泽东's 中国人民从此站起来了. He said it on 21 September 1949 at the 政协, not on 天安门 on 1 October, which is itself an egg.
5. **Map:** the era's layer with this story's pin, instead of only a province outline.

Sources stay in a fold at the bottom, now each tagged 原典 · 官方 · 学者 · 媒体 · 百科 (§9).

### 4.5 What the 近现代 chapters add

- **聊天提示**, right after 一分钟读懂: three short rows, **骄傲** (what people are proud of), **长辈经历过** (what someone's parents lived through, which they may want to tell you about) and **少提** (what's censored or risky to bring up, linking to the story's 为什么敏感).
- **权力接力** in 毛泽东时代, 改革开放 and 新时代: portraits joined like a relay. Each shows the leader, their years, **how they got power** in one line, and their phrase:
  - 毛泽东 (1935/1943–1976): 遵义会议进入领导核心，延安整风后成为最高领袖 · 为人民服务
  - 华国锋 (1976–1978): 毛去世前写下“你办事，我放心”；一个月后抓了“四人帮” · 两个凡是
  - 邓小平 (1978–1989/92): 十一届三中全会后的实际领导人，从没当过总书记 · 黑猫白猫
  - 胡耀邦 and 赵紫阳 hang off 邓 as a side branch: 总书记 under him, both removed (1987, 1989)
  - 江泽民 (1989–2002): 1989年由邓小平选中，从上海调到北京 · 三个代表
  - 胡锦涛 (2002–2012): 1992年邓小平“隔代指定” · 和谐社会
  - 习近平 (2012–): 2007年进常委、排在李克强前面，2012年十八大接班 · 中国梦

  Underneath, one paragraph tells the arc: 邓小平 set rules (collective leadership, term limits, picking the successor's successor) so there would never be another 毛, and since 2018 some of those rules have changed.
- **今天的中国怎么运作** (新时代 only): one diagram in the app's style, with press-to-peek words.
  - **Party:** 约1亿党员 → 党代会 (every five years; 2022, then 2027) → 中央委员会 (~200) → 政治局 (24) → 政治局常委 (7) → 总书记.
  - **State:** 全国人大 (两会 every March), 国务院 (总理), 国家主席, 中央军委.
  - **The three posts one person holds:** 总书记, 国家主席, 军委主席, and which one carries the real power.
  - **A political calendar:** 两会 in March, 国庆 on 1 October, 党代会 every fifth autumn (next: 二十一大, 2027).
  - Every name and number is re-checked against the news in the week it's written.
- **敏感话题一览:** one page, linked from every chapter's 少提 row. It explains in plain words why some topics are sensitive in China in the first place:
  - the party's legitimacy, which is why the verdicts on 毛 and on 1989 aren't reopened;
  - national unity: 台湾, 西藏, 新疆, 香港;
  - the leader's image;
  - how censorship works day to day: blocked keywords, deleted posts, closed accounts, and tighter weeks around 6月4日 and party congresses.

  Then it gives one line per topic, linking to its story, including two topics that get no story of their own (法轮功, 新冠的来源). It ends with what's fine to talk about: 内卷, 躺平, 高铁, 外卖.

---

## 5. Maps: one map for everything

- **The old scanned maps go:** all 24 `map-*` images and their credits. The 51 portraits stay.
- **Every history map is the app's own map:** the same land, provinces, rivers, lakes, cities, labels and projection as the 地图 tab, with a history layer on top. The big interactive one is the 地图 tab in 历史 mode. The small ones on era and story pages are `StaticMap` with the same layer, and tapping one opens the big one.
- **The layer** has states (tinted shapes with big names), capitals, story pins (from each page's `at`), event pins (from the 年表) and routes.
- **States are drawn from today's cities.** Each state lists the prefecture-level cities it roughly covered, for example `越: [shaoxing, ningbo, hangzhou, jinhua, quzhou, taizhou]`. The map already has all 365 cities as points. The build gives each city an area (the part of its province closer to it than to any other city, a rough stand-in for its 地级市) and joins a state's areas into one shape. This means:
  - outlines follow real province borders wherever a state's edge did;
  - the list itself teaches today's geography, and the state card reads it out: 大约是今天的绍兴、宁波、杭州…;
  - the shapes are ours, so there's no licence question.

  Where a state reaches past today's cities (匈奴 on the steppe, 西域, 吐蕃, the 元 empire, the 汉 commanderies in Korea and Vietnam), it gets an `outline` of longitude/latitude points instead, cut to the coastline.
- **Accuracy:** borders follow 谭其骧《中国历史地图集》, the standard Chinese historical atlas that textbooks use, checked against the zh.wikipedia era maps. We assign cities by it and don't copy its lines. Every map is captioned 大致范围. Like 谭其骧, the map shows each regime under its own name (唐 and 吐蕃; 宋, 辽 and 西夏).
- **卷二's layers** are mostly pins and routes:
  - 晚清: 虎门, 圆明园, 天京 (南京), 威海卫, the 黄海 battle, and the places taken or leased: 香港 (1842, 1860, 1898), 台湾 (1895), 青岛, 旅顺大连, 澳门.
  - 民国: 南湖, 井冈山, 瑞金, the 长征 route, 延安, 西安, 南京, and the 1940 日占区 as a shaded state.
  - 毛泽东时代: 毛's own route (韶山 → 长沙 → 北京 → 上海/嘉兴 → 井冈山 → 瑞金 → 遵义 → 延安 → 西柏坡 → 北京), 罗布泊, 唐山, and where the 知青 were sent.
  - 改革开放: 小岗村, the five 特区, 浦东, and the 南巡 route (武昌 → 深圳 → 珠海 → 上海).
  - 新时代: 习近平's posts (梁家河 → 正定 → 厦门 → 宁德 → 福州 → 杭州 → 上海 → 北京), 雄安, 一带一路.
- **Changing era** cross-fades the tints and names in about 300 ms, so you watch the 战国七雄 turn into one 秦.

---

## 6. What goes in each era

✅ = the 百科 page already exists. ⚠ = sensitive (§7). **Bold** = the series or page that carries the era. Hooks are drafts. About 220 stories in all: 151 in 卷一 and 71 in 卷二, 14 already written.

### 卷一 · 王朝

| Era | Hook | Stories (百科 pages) | 今天还在 (eggs) | On the map |
|---|---|---|---|---|
| 传说时代 | 中国小孩听的第一批故事 | 盘古开天, 女娲补天, 后羿射日, 嫦娥奔月, **大禹治水**, 精卫填海, 愚公移山, 炎帝和黄帝 | 中秋 ← 嫦娥; 炎黄子孙; 三过家门而不入; 愚公移山 (毛泽东1945年用过, a link into 卷二) | pins only: 黄帝陵 (陕西), 大禹陵 (绍兴 ✅) |
| 夏 | 中国第一个王朝，真的存在吗？ | 大禹传位给启, 二里头, 夏桀 | 家天下 | 夏 around 豫西晋南; 二里头 (偃师) |
| 商 | 三千年前的人，把问题刻在乌龟壳上 | **甲骨文** (王懿荣 found it in a pharmacy's 龙骨, 1899), 妇好 (old text), 纣王和妲己, 哪吒 (封神; the 2025 film) | 酒池肉林; why traders are called 商人 (一种说法) | 商 over 河南 and western 山东; 殷墟 (安阳) |
| 西周 | 一个国王为了让美人笑，点燃了烽火 | 姜太公钓鱼, 武王伐纣 (old text), 周公, 烽火戏诸侯 (and why historians now doubt it: 清华简《系年》) | 愿者上钩; 周公解梦; 一笑千金 | 镐京 (西安), 洛邑; 齐 鲁 燕 晋 卫 宋 lightly tinted |
| 春秋 | 一个国王睡柴草、尝苦胆，二十年后报了仇 | **吴越争霸**: 勾践 ✅ 夫差 ✅ 范蠡 ✅ 西施 ✅ 伍子胥 ✅; 孔子; 老子; 孙武; 管仲和鲍叔牙; 晋文公; 介子推; 鲁班 | 清明和寒食 ← 介子推 (介休 is named after him, 据说); 苏州的端午 ← 伍子胥; 卧薪尝胆, 兔死狗烹, 退避三舍, 管鲍之交, 东施效颦, 班门弄斧; 陶朱公 = 财神 | 齐 鲁 晋 秦 楚 吴 越 郑 宋; 会稽 (绍兴), 姑苏 (苏州), 曲阜 ✅ |
| 战国 | 一位诗人跳进了江里，两千年后我们还在为他划龙舟 | **屈原**; 商鞅; 荆轲刺秦; 蔺相如和廉颇; 赵括 (长平, old text); 孙膑 (马陵, old text); 孟子; 庄子; 李冰和都江堰 | 端午: 粽子, 龙舟, 2009年进联合国非遗名录; 立木为信; 完璧归赵; 负荆请罪; 纸上谈兵; 围魏救赵; 孟母三迁; 狐假虎威; 鹬蚌相争 | 战国七雄; 汨罗江 (湖南); 长平 (高平); 都江堰 ✅ |
| 秦 | 统一了文字和车轮，却只撑了十五年 | **秦始皇**; 兵马俑 (found by farmers digging a well, 1974); 长城和孟姜女 (传说); 焚书坑儒; 赵高; 陈胜吴广; 徐福东渡 (据说); 灵渠 | 书同文、车同轨; the 秦权 weights from the backlog; 秦朝为什么崇尚黑色; 指鹿为马; 王侯将相宁有种乎; 一字千金 | one 秦 beside 匈奴; 咸阳; 长城 drawn as a line; 灵渠 (广西) |
| 西汉 (with 楚汉相争) | 一顿饭，决定了谁当皇帝 | **鸿门宴**; 项羽和虞姬; 韩信; 张骞; 王昭君; 苏武; 司马迁; 卫青和霍去病; 汉武帝 | 汉族、汉字、汉语: why 汉; 楚河汉界 (象棋); 四面楚歌; 霸王别姬; 约法三章; 背水一战; 胯下之辱; 成也萧何败也萧何 | 汉, 匈奴, 西域; 长安; 张骞's route past 敦煌 ✅; 鸿门, 垓下 |
| 新 | 一个皇帝的改革太超前，网友说他是穿越来的 | **王莽** (from 周公再世 to taking the throne); 王莽改制 (land to the state, no selling slaves, money changed again and again); 绿林和赤眉; 昆阳之战 (old text; a storm in the middle of the battle) | 王莽是穿越者 (the meme); the bronze caliper from his reign behind it (to check); 新朝只有一个皇帝 | 长安; 昆阳 (河南叶县); 绿林 (湖北), 赤眉 (山东) |
| 东汉 | 一个太监改进了纸，改变了世界 | 刘秀; 蔡伦; 张衡; 华佗; 张仲景; 班超; 白马寺 | 饺子 ← 张仲景 (据说); 投笔从戎; 不入虎穴焉得虎子 | 洛阳; 班超's route into 西域 |
| 三国 | 三个人在桃园结拜：这件事其实是小说编的 | **桃园结义, 三顾茅庐, 草船借箭, 赤壁 (old text)**; 关羽; 曹操; 诸葛亮; 刘禅; 吕蒙; 《三国演义》和《三国志》的区别 (七分事实，三分虚构) | 关公 = 武财神 (why restaurants and 港 police stations have him); 说曹操曹操到; 望梅止渴; 万事俱备只欠东风; 三个臭皮匠顶个诸葛亮; 乐不思蜀; 刮目相看; 馒头 ← 诸葛亮 (据说) | 魏 蜀 吴; 许昌, 成都 ✅, 建业 (南京); 赤壁 (湖北) |
| 西晋 | 一篇文章，让洛阳的纸涨了价 | 洛阳纸贵; 八王之乱 | 司马昭之心，路人皆知 | one 晋; 洛阳 |
| 东晋十六国 | 一个书法家喝醉了，写出了天下第一行书 | 王羲之 ✅; 淝水之战 (old text); 陶渊明; 谢安; 祖逖 | 桃花源; 不为五斗米折腰; 东山再起; 草木皆兵; 闻鸡起舞; 入木三分; 东床快婿 | 东晋 and 前秦; 建康 (南京); 淝水 (寿县); 兰亭 (绍兴 ✅) |
| 南北朝 | 替父从军的那个女孩，是哪个朝代的？ | 花木兰; 北魏孝文帝; 云冈和龙门石窟; 祖冲之; 梁武帝 | 木兰 (the Disney films); 南朝四百八十寺 | 北魏 and the 南朝; 平城 (大同) → 洛阳; 建康 |
| 隋 | 只活了三十七年，却挖出一条用了一千四百年的河 | **京杭大运河** (on the wanted list); 科举; 隋炀帝 | 扬州琼花 (传说) | 大兴 (长安), 洛阳; the 隋 canals drawn as a route; 扬州 ✅ |
| 唐 | 长安是当时世界上最大的城市 | 玄武门之变; 唐太宗; 玄奘; 鉴真; 杨贵妃; 李白; 杜甫; 安史之乱 (old text); 文成公主; 武则天 (her page is in both 唐 and 武周) | 唐人街, 唐装; 床前明月光; 一骑红尘妃子笑 (《长安的荔枝》); 以人为镜; 口蜜腹剑; 西游记 | 唐, 吐蕃, 突厥; 长安; 玄奘's route west; 鉴真's route to Japan; 文成公主 to 拉萨 |
| 武周 | 中国唯一的女皇帝，给自己的名字造了一个字：曌 | **武则天** (from 才人 to 皇帝); 狄仁杰; 上官婉儿; 来俊臣和请君入瓮; 无字碑 | 请君入瓮; 曌 = 日月当空; 神探狄仁杰 (the TV show); 洛阳牡丹 (传说: she banished the 牡丹 to 洛阳 for not blooming in winter) | 神都 (洛阳); 乾陵 (陕西乾县) |
| 五代十国 | 五十多年，换了五个朝代 | 钱镠 ✅; 吴越国 ✅; 李煜 | 春花秋月何时了 | the ten kingdoms; 开封; 杭州 ✅; 金陵 |
| 北宋 | 一件黄袍披到身上，他就成了皇帝 | 赵匡胤; 包拯; 范仲淹; 王安石; 苏轼 ✅; 《清明上河图》; 毕昇; 澶渊之盟 (old text); 靖康之耻 | 黄袍加身; 杯酒释兵权; 包青天; 先天下之忧而忧; 东坡肉 ✅; 宋朝 = the era people online most want to time-travel to; 汝窑天青 | 北宋, 辽, 西夏, 大理; 开封 ✅; 澶州 (濮阳); 岳阳楼 |
| 南宋 | 为什么中国人吃油条，是在“炸”一个人？ | 南宋 ✅; 岳飞 ✅; 秦桧; 文天祥; 李清照; 辛弃疾; 朱熹; 崖山 | 油条 ← 油炸桧; 精忠报国; 莫须有; 人生自古谁无死; 西湖 ✅ | 南宋, 金, 西夏, 大理; 临安 (杭州 ✅); 崖山 (江门) |
| 元 | 一个骑马的民族，统治了整个中国 | 成吉思汗; 忽必烈; 马可·波罗; 关汉卿; 黄道婆; 黄公望 ✅; 《富春山居图》 ✅ | 比窦娥还冤; 中秋月饼和“杀鞑子” (据说); 大都 = 北京 | 元 as an outline into Mongolia; 大都 (北京); 黄道婆 from 海南 to 松江 |
| 明 | 一个要过饭的和尚，当上了皇帝 | **朱元璋**; 郑和; 永乐和紫禁城; 王阳明; 海瑞 (a link to the 文革, below); 戚继光; 李时珍; 崇祯; 吴三桂; 郑成功 | 光饼 ← 戚继光 (福建); 北京烤鸭; 知行合一; 冲冠一怒为红颜; most of the 长城 you can visit today is 明长城 | 明 and the northern 蒙古; 南京 → 北京; 长城; 郑和's route to Africa; 山海关 |
| 清 (1644–1840) | 一部宫斗剧，让全中国都学会了“本宫” | 剃发和辫子; 康熙; 雍正; 乾隆; 和珅; 曹雪芹; 马戛尔尼 (1793, the bridge into 卷二) | 甄嬛传 (set under 雍正); 乾隆下江南; 宰相刘罗锅; 满汉全席; 红楼梦 | 清 at its height (谭其骧's 1820 map); 北京; 承德; 乾隆's route south |

### 卷二 · 近现代

| Chapter | Hook | Stories | 今天还在 | 聊天提示 (outline) |
|---|---|---|---|---|
| 晚清 1840–1912 | 一个官员在海边销毁了两百多万斤鸦片 | **鸦片战争 (series)**: 林则徐; 虎门销烟; 南京条约和香港; 火烧圆明园; 太平天国 (洪秀全); 曾国藩; 李鸿章和洋务运动; 甲午战争和邓世昌; 马关条约和台湾 ⚠; 戊戌变法和谭嗣同; 慈禧; 义和团和八国联军 ⚠ (patriots or xenophobes? In 2006 the paper 《冰点》 was shut down over an article on how textbooks teach it) | 落后就要挨打; 百年国耻; 师夷长技以制夷; 圆明园兽首回家 (马首, 2020); 宫保鸡丁 ← 丁宝桢; 东亚病夫和霍元甲 | 骄傲: 林则徐; 经历过: none living; 少提: playing down the humiliation, which reads as siding with the 列强. On the mainland 1997 is always 香港回归. |
| 民国 1912–1949 | 十三个人开会，最后一天搬到了一条船上 | 孙中山; 袁世凯 (皇帝当了83天); 五四运动; 鲁迅 ✅; **中共一大和南湖红船** (嘉兴 ✅); 蒋介石和北伐 (old text); 长征; 西安事变; 抗日战争 ⚠ (old text; who did most of the fighting is still argued); 南京大屠杀 ⚠ (the death toll, and denial in Japan); 国共内战和台湾 ⚠ (old text) | every city has a 中山路; 五四青年节; 国家公祭日 (12月13日); 九一八 sirens in 沈阳; 民国范儿 | 骄傲: 抗战; 经历过: grandparents' war stories; 少提: 台湾's status (the mainland view is that 台湾是中国的一部分), and praising 蒋介石 |
| 毛泽东时代 1949–1976 | 一个湖南农民的儿子，怎么成了中国的领袖？ (his rise is the series below) | 开国大典; 土改 ⚠; 抗美援朝 ⚠ (毛岸英; old text); 反右运动 ⚠ (new); 大跃进 ⚠; 大饥荒 ⚠; 西藏1959 ⚠ (new); 两弹一星; 雷锋; 文化大革命 ⚠ (《海瑞罢官》 was its opening shot); 红卫兵 ⚠; 上山下乡; 乒乓外交和尼克松; 林彪 ⚠; 1976年 (周恩来, 四五运动, 唐山, 毛去世, 四人帮) | 为人民服务; 学雷锋日 (3月5日); 毛 on every 人民币 note; 天安门的画像; 红色旅游 (韶山, 井冈山, 延安); 三七开 | 骄傲: 站起来了, 两弹一星; 经历过: 文革, 下乡, hunger (let older people tell it); 少提: blunt criticism of 毛, since many people still revere him. The official verdict is the 1981 决议, which calls the 文革 a 内乱 that brought 严重灾难. Famine numbers are contested (scholars' estimates run from about 15 to 45 million): give the range and who says what. |
| 改革开放 1976–2012 | 十八户农民在一张纸上按了红手印 | 粉碎四人帮; 华国锋; 恢复高考 (1977); 十一届三中全会; 小岗村; 深圳特区 (深圳 ✅); 邓小平; 下海; 独生子女 ⚠; **1989年天安门 ⚠**; 南巡; 香港澳门回归; 入世; 非典 ⚠ (the early cover-up); 杨利伟; 2008年: 奥运和汶川地震 ⚠ (the schools that collapsed) | 春晚 (since 1983); 黑猫白猫; 摸着石头过河; 发展才是硬道理; 铁饭碗; 万元户; 小皇帝; 下岗 (东北) | 骄傲: growth, 奥运, 高铁; 经历过: 高考, 下海, 下岗; 少提: 1989 (see its 为什么敏感); the one-child policy can be personal |
| 新时代 2012–今天 | 他十五岁去了陕北的一个小村子，住了七年窑洞 | **从毛到习 (series)**: 习仲勋; 梁家河; 福建十七年; 浙江 (之江新语); 2007年进常委; 十八大; 打虎拍蝇 ⚠ (薄熙来, 周永康); 中国梦; 一带一路; 精准扶贫; 2018年修宪 ⚠; 香港：从占中到国安法 ⚠ (new); 新疆 ⚠ (new); 台湾海峡 ⚠ (new: 两岸 today); 新冠、清零和白纸运动 ⚠; 二十大和第三个任期; 共同富裕 | 绿水青山就是金山银山 (余村, 安吉, 2005 → 湖州 ✅); 撸起袖子加油干; 内卷, 躺平; 扫码; 高铁; 电动车; 七上八下 | 骄傲: 脱贫, 高铁, 科技; 经历过: 清零 lockdowns; 少提: criticising or joking about the leader (nicknames and memes get deleted); 香港, 新疆 and 台湾, where the official line is firm and many people hold it sincerely; with strangers, politics mostly isn't discussed. Safe to talk about: 内卷, 躺平, 高铁, 外卖. |

Plus the **敏感话题一览** page (§4.5).

### The four series (追剧, with recall gates, on the 书架 and the era pages)

1. **鸦片战争** (晚清, 4集): 一个英国人为什么要卖鸦片 → 虎门销烟 → 南京条约：香港是怎么没的 → 火烧圆明园和十二兽首.
2. **毛泽东：从韶山到天安门** (民国 → 毛泽东时代, 6集): 韶山冲的农民儿子 → 北大图书馆和南湖红船 → 秋收起义、井冈山：“枪杆子里出政权” → 被夺了兵权，长征和遵义会议 → 延安、西安事变、整风：他成了唯一的领袖 → 1949年10月1日.
3. **从毛到习：权力的接力** (6集): 1976年：“你办事，我放心” → 邓小平回来了 → 两个总书记的下台 (胡耀邦, 赵紫阳) → 隔代指定 (江泽民, 胡锦涛) → 梁家河的知青 (习近平的路) → 2012年以后 (反腐, 修宪, 第三任期).
4. **吴越争霸** (春秋, 5集): 夫差报父仇 → 勾践去吴国当仆人 → 卧薪尝胆和西施 → 灭吴 → 范蠡坐船走了，文种留下了. All five 百科 pages exist, so this one is mostly retelling.

Series 2 and 3 answer your two questions directly, and the 权力接力 sums them up in one picture.

---

## 7. Sensitive topics

- The stories marked ⚠ in §6 get `sensitive: true`, which puts a **敏感** pill on their card everywhere it appears. The page opens with a **为什么敏感** box of four short lines:
  - **官方：** the official verdict, quoted from the 1981 or 2021 决议 or an official statement;
  - **争议：** what historians, witnesses and others dispute (numbers, who was responsible), as ranges and with who says what;
  - **在中国：** how it's handled: taught or not, blocked online or not, the anniversaries;
  - **聊天：** how people tend to react, and whether to bring it up.
- The tone is factual. Both sides are given with their sources, and the page doesn't argue for either. The point is that you can follow and take part in a conversation with a Chinese person.
- Example, 1989年天安门 (a draft; the final text is checked against its sources):

  > - 官方：当年称为“反革命暴乱”，后来多称“政治风波”。官方认为，当时果断平息，才有了后来的稳定和发展。
  > - 争议：一共死了多少人，至今没有公布完整的数字。政府当年说两三百人（包括军人），其他的估计从几百到几千不等。反对戒严的总书记赵紫阳被撤职，被软禁到2005年去世。
  > - 在中国：课本里基本不讲。网上相关的词会被屏蔽，每年6月4日前后管得更严。很多年轻人只知道一点，或者完全不知道。
  > - 聊天：不要主动提。在微信上说可能会被删帖甚至封号，也会给对方带来麻烦。如果对方想聊，就听着。

- The **敏感话题一览** page (§4.5) gathers them all and explains the logic behind the list once, so each box can stay short.

## 8. Pictures

- **Every story** has its hero photo plus 2–4 pictures in the text, each under the paragraph it belongs to, with a short Chinese caption (越王勾践剑 · 湖北省博物馆). **Every era** has a hero picture, which is also its tile's emblem.
- **Kinds of picture:**
  - 文物: 越王勾践剑, 甲骨, 兵马俑, 秦权;
  - 古画: 陈洪绶's 屈原, 《清明上河图》, 帝王像;
  - 今天的地方: 汨罗的屈子祠, 虎门销烟池, 梁家河的窑洞;
  - 老照片: plenty are free for 1840–1976.
- **Same pipeline as now:** a picture is written as a `![说明](photo:key)` line and fetched by `npm run images` from Wikimedia Commons, which carries many public-domain paintings from the 故宫 and 台北故宫. Free licences only (the script enforces it), credits in the fold, never cropped.
- **No maps as pictures** (§5) and no AI-made images.
- **Where no free picture exists** (most news photos after 1980, 1989 included), use the place as it is today or a related object, and say so in the caption.
- The 51 existing portraits are reused.

## 9. Sources: mostly Chinese

The rules in WIKI-PLAN.md §6 still apply: two sources for every fact and date, never copy, never invent a quote, and mark legends with 据说 or 传说. On top of those:

- **Most of every story's sources are in Chinese.** English is used only for something no Chinese source covers.
- **Where to look:**
  - 原典: 《史记》《左传》《国语》《战国策》《吴越春秋》《汉书》《后汉书》《三国志》《资治通鉴》, on zh.wikisource.org or ctext.org. These also feed 读原文.
  - 百科: 中国大百科全书 online (zgbk.com), and zh.wikipedia with the sources it cites.
  - Museums: 中国国家博物馆, 故宫博物院, 湖北省博物馆, 秦始皇帝陵博物院 and the provincial museums.
  - 官方 (近现代): the 1981 and 2021 历史决议, 《中国共产党简史》 (2021), 新华网, 人民网, 中国共产党新闻网, 中国政府网.
  - 学者, in Chinese: 高华《红太阳是怎样升起的》 (毛's rise in 延安), 杨奎松, 沈志华 (the Korean War), 杨继绳《墓碑》 (the famine), 傅高义《邓小平时代》 (三联's Chinese edition), 赵紫阳《改革历程》, the 《炎黄春秋》 archive, 中央研究院近代史研究所.
  - 媒体: 新华社 and 人民日报 for the official line; BBC中文, 联合早报 and 端传媒 for outside reporting.
  - 知乎专栏: for angles, always checked somewhere else.
- **Every sensitive story** cites at least one 官方 source and one Chinese source that isn't official.
- **Sources are tagged** 原典 · 官方 · 学者 · 媒体 · 百科 and shown as pills in the fold, so you can see whose account you're reading.
- **Quotes only when documented:** 枪杆子里出政权 (1927), 你办事，我放心 (1976).
- **新时代 facts go out of date** (常委, 总理, the 2027 congress). They're checked the week they're written, and the page carries `checked: 2026-11`.

---

## 10. How it teaches

- **Stories first, dates second.** Every era opens with people and what they did. Dates are in the 年表 for when you want them.
- **Recall gates** in the four series. Every episode ends with 2+ questions, the same as the existing series.
- **Every 百科 page has a quiz** (`QuickQuiz`) with a `why`.
- **读原文** turns each story's source into reading practice, with press-to-peek on the classical lines.
- **Eggs become flashcards.** Each tradition or saying has a `问：` line ("端午节为什么吃粽子？"), and you add the ones you want, as now.
- **朝代印:** passing an era's 考一考 earns its seal. 28 in all, shown on the 长卷, on the map's era strip and in the 集章册.
- **朝代歌** fill-in on the 长卷. After a few rounds you know the order of every dynasty.
- **排一排** in every era quiz: put four events in order (the 历史 card type PLAN.md §12 planned).
- **Coming back:** 刷一刷 gets history cards, and Today gets 历史上的今天 and the festival line.

## 11. Making it match the app

- No `<select>`, no scanned maps, no licence text in view. Credits go in folds, as on 百科 pages.
- Era colours come from 中国传统色 and mean something, which is itself an egg: 秦 玄黑 (秦尚水德，崇尚黑色), 汉 朱红, 唐 赭黄, 宋 天青 (汝窑), 明 宫墙红, 清 明黄. 卷二 is 黛 grey that turns 中国红 at 1949.
- The same parts as everywhere else: `tile`, `bg-paper` reading boxes, `Pill`, `PhotoRow`, `PeopleRow`, `NextCard`, `Fold`, `JumpBar`, `Seal`, `ReadMark`, the chunky buttons, and the map components.
- Photos are never cropped, as on the province pages.
- Chinese only: no English labels, hints or `en:` shown anywhere in history.
- Dark mode follows the existing tokens. Era colours are used as bands and tints, never as text on the dark background.

---

## 12. How it's built

### Content

`content/history/<era>.md`, one per era (28 files), written the same way as a place page so the daily writer can work on it:

```yaml
---
id: spring
name: 春秋
dates: 公元前770—前476年
book: 1                         # 1 王朝, 2 近现代
song: 春秋和战国                 # its rhyme line (only the first era under a line shows it as a heading)
seal: 春
color: "#2E7D6B"
image: 越王勾践剑                # hero picture and tile emblem
hook: 一个国王睡柴草、尝苦胆，二十年后报了仇。
stories: [goujian, fuchai, fanli, xishi, wuzixu, kongzi]   # page order; other pages with this era follow
series: [wuyue]
map:
  box: [105, 28, 123, 41]       # lon/lat the map opens on
  capitals: [{ name: 洛邑, at: [112.45, 34.62] }]
  states:                       # cities: today's prefecture-level cities; outline: [[lon, lat], …] where cities can't reach
    - { name: 越, cities: [shaoxing, ningbo, hangzhou, jinhua, quzhou, taizhou] }
    - { name: 吴, cities: [suzhou, wuxi, changzhou, shanghai, zhenjiang] }
  routes: []                    # { name, line: [[lon, lat], …] }
timeline:                       # the old 主要战事, one line each; the old text moves into `story`
  - { date: 公元前632年, title: 城濮之战, line: 晋文公“退避三舍”，打败了楚国, at: [115.4, 35.5], figures: [wen-jin], story: … }
quiz: [...]                     # plus the era's 百科 pages' quizzes
---
(一分钟读懂, then 再多读一点 after a `---more---` line)

## 聊天提示                    # 卷二 only: - 骄傲：… / - 经历过：… / - 少提：…

## 聊天彩蛋
- 清明节前一天叫寒食节……
  问：寒食节为什么不能生火？
  标：节日                      # 节日 / 成语 / 吃的 / 还在说 (new: picks the tab)
```

百科 pages get:

```yaml
era: [warring]                  # a list: 武则天 is [tang, wu-zhou], 京杭大运河 is [sui, yuan]
sensitive: true                 # ⚠ pages only
sources:
  - { title: 《史记·屈原贾生列传》, url: …, kind: 原典 }   # 原典 / 官方 / 学者 / 媒体 / 百科
```

and in the body, `![说明](photo:key)` lines for pictures, plus two optional sections: `## 为什么敏感` (four lines: 官方：/ 争议：/ 在中国：/ 聊天：) and `## 读原文`.

`npm run content` checks:
- that era ids and the cities in `map.states` exist;
- that every ⚠ page has all four 为什么敏感 lines, one 官方 source and one other source;
- that every `stories` id exists. Missing ones go on a second wanted list, like WIKI-PLAN.md §3.

It also warns when a page has fewer than two pictures in its text or more English sources than Chinese ones, so a page can go up while its pictures are still pending.

### Code

- **Map layer, at build time:** for each era, `build-content.mjs` turns `map` into shapes in map coordinates:
  - It gives every city its area from the points and province shapes already in `china-detail.json`, then joins each state's cities into one shape.
  - It projects outlines, routes and pins with the same `proj` it already uses for `at:`.
  - It clips everything to land.

  Two small build-only packages do the geometry: `d3-delaunay` and `polygon-clipping`. The output is `public/content/history.json`, with the era index and the layers, lazy-loaded like the map.
- **`ExploreMap`** gets a `layer` prop (states, pins, routes) drawn between the provinces and the labels, with state names reusing `areas`. **`StaticMap`** gets the same prop.
- **`MapScreen`:** the 历史 chip, the era strip, `EraCard` / `StateCard` / `StoryCard`, and the route `#/map/history/<era>`.
- **New screens:** `HistoryScroll.tsx` (`#/history`) and `EraPage.tsx` (`#/history/<era>`), replacing `HistoricalAtlas.tsx`. Small new components: `ChatTips`, `SensitiveBox`, `ReadOriginal`, `PowerRelay`, `HowChinaWorks`, `SongGame`, `EraQuiz` (reusing the stamp-quiz flow).
- **`WikiPage`:** the era chip, pictures in the text, the 敏感 box, 读原文, source pills, and the era map. Province and city pages get the 这里的历史 row.
- **Migrate once:** `scripts/migrate-history.mjs` turns `src/data/history-periods.json` into `content/history/*.md`:
  - 新 and 武周 keep their own files;
  - 清 is split at 1840, and its later events go to 晚清;
  - 中华人民共和国 is split into the three chapters by date;
  - every one of the 40 event texts is kept in a `timeline`.

  Then the JSON, the 24 `map-*` images and their entries in `history-media.json` are deleted, and the 51 portraits stay.
- **Old links:** `#/map/history/<era>/<n>` opens `#/history/<era>` with timeline item *n* open, because old feed cards and notes link there.
- **Progress:** an era's ring counts its stories marked 读完了 (already stored in `db.wiki`) plus its eggs added. Seals are stored in an existing synced table, so no Dexie version bump is needed and cloud sync keeps working as it is.
- **Offline:** `history.json` and the portraits are precached like the rest of the content.

---

## 13. Rollout

卷二 first. Each step is one PR you can look at in the app.

1. **The frame, with 晚清:**
   - the map layer and the 历史 mode on the 地图 tab;
   - the 长卷 and the era page;
   - the story-page additions: era chip, pictures in the text, 敏感 box, 读原文, source pills;
   - the migration, and the 这里的历史 row on province pages;
   - 晚清 written in full, with the 鸦片战争 series.

   All 28 tiles exist from the start, each with its migrated timeline and a first map (capital and main states), so nothing is lost when the old maps go.
2. **民国 and 毛泽东时代,** with the 毛泽东：从韶山到天安门 series, 毛's route on the map, and the 敏感 boxes from 土改 to 林彪.
3. **改革开放 and 新时代,** with 从毛到习, the 权力接力, 今天的中国怎么运作, the 敏感话题一览 page and 习近平's route.
4. **卷一,** two or three eras per PR. First 春秋 and 战国 (with the 吴越争霸 series), then 秦, 西汉, 新, 三国, 唐, 武周, 北宋, 南宋, 明, 清, then the small ones. Each era's map gets its full set of states as it's written.
5. **The rest of the doors:** city pages, 刷一刷 cards, Today's 历史上的今天 and festival line, 百科 home's 按朝代 shelf, and seals in the 集章册.
6. **Daily writing** (needs your OK, since it changes a scheduled task): a history queue so `zhongguotong-wiki-daily` writes stories alongside provinces, or a separate task.
