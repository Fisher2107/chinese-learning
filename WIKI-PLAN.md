# 百科 · Plan of action

**Goal:** every province, city, river, mountain, person, legend and dish worth talking about has its own page, and every page leads to two or three more. Reading about 钱塘江 should pull you to 钱镠, then 吴越国, then 雷峰塔, then 鲁迅, the way a wiki does, until you look up and an hour has gone.

The daily task `zhongguotong-wiki-daily` (10:00 every day) works through this file. It ticks boxes and adds to the log at the bottom. Nothing here is locked: reorder the queue or add notes and the next run follows them.

---

## 1. What "done" looks like for a province

浙江 is the template (`content/places/zhejiang.md` and the pages in `content/wiki/`). A province is done when it has all of these:

- [ ] **Province page rewritten** as a long read, about 1,800–2,500 字: an opening paragraph, then 5–7 `##` sections (where the name comes from, geography, history, people, food, today), then `## 聊天彩蛋`. Every person, place, river, event and dish that has (or deserves) a page is a `[[link]]`. Each 聊天彩蛋 bullet (on province and city pages) has an indented `问：` line under it, the question its flashcard asks, and a `查：` line with search words when its first “quoted” words aren't the thing to look up (see README).
- [ ] **12–20 百科 pages** in `content/wiki/<id>.md`:
  - 5–8 places to see (景点, 湖, 山, 河流, 建筑), each with `at: [lon, lat]` so it's pinned on the map, and `city:` so it shows on its city page;
  - 4–6 people (人物), including people who aren't from there but made their name there (苏轼 in 杭州);
  - 2–3 stories (事件, 传说, 朝代, 作品);
  - 2–3 things to eat or bring home (美食, 物产).
- [ ] **Its main river on the map** with `river:` on the page. If the river isn't drawn yet, add it (section 4).
- [ ] **A photo on every page**, checked by eye (section 5).
- [ ] **Its city pages** link into the new pages, and every city in the province has a photo.
- [ ] **Quiz**: every page has 1–3 `quiz:` questions with a `why`. The stamp quiz builds itself from these, from the photos and from the pages' cities.
- [ ] **Wanted pages**: at least 3 pages from the most-wanted list (section 3) are written.

## 2. How to write a page that pulls you onward

- **Open with a hook, not a definition.** The `lede` is one or two sentences that make you want to read on: "中国人自己造的第一座大桥，通车第89天被炸断了" beats "钱塘江大桥是一座桥".
- **4–6 `##` sections, 500–1,000 字 in all**, at HSK 5. Short sentences, real stories, numbers only where they're surprising.
- **Link generously.** Link the first mention of anything that has or deserves a page: `[[苏轼]]`, `[[苏轼|苏东坡]]`, `[[杭州]]`. Names with no page yet are fine: they become "wanted" (section 3). Link to a series or a text with its route: `[[series/baishezhuan|杭州 · 白蛇传]]`, `[[text/guxiang|读《故乡》全文]]`.
- **End every section on something unresolved** where you can, and put the strongest pulls in `next:` (2–3 of them). Each `hook` is a question the next page answers: "为什么这条江的水，每年会倒着往回冲？"
- **Connect across provinces.** 越王勾践剑 was found in 湖北; 苏轼 was from 四川. Cross-links are what make the wiki feel endless.
- **Bring in a real excerpt** where one fits: `::原文[text-id#paragraph]` (public-domain texts only, see PLAN.md §4).
- **Quiz questions test the story, not trivia**: why something happened, what a saying means, which photo is which. Always say `why`.

### Page format

```yaml
---
id: qiantangjiang            # file name; not a province or city id
name: 钱塘江
py: qiántángjiāng            # only if the computed reading would be wrong (钱镠 qiánliú)
en: Qiantang River
kind: 河流                   # 景点 地点 河流 山 湖 人物 事件 朝代 传说 美食 文化 建筑 作品 物产
aka: [浙江水, 之江]           # other names that should link here
province: [zhejiang, anhui]  # first one is "home"
city: [hangzhou]             # map city ids (the build prints them)
at: [120.15, 30.2]           # lon, lat: a pin on the map
pin: 司马迁祠                 # 人物 with at: — the place the pin is named after (else the person's name)
river: 钱塘江                 # a river drawn on the map, shown bold
image: 钱塘江                 # Chinese name, Q-id, or 'File:Something.jpg'
dates: 1937年通车
lede: '…[[千岛湖]]…'          # quote it when it has [[links]]
facts:
  - ['流经', '安徽、浙江']
next:
  - to: 钱塘潮
    hook: 为什么这条江的水，每年会倒着往回冲？
quiz:
  - q: 浙江省的名字是从哪儿来的？
    options: [来自钱塘江的古名, 来自一位皇帝, 来自一座山, 来自西湖]
    answer: 0
    why: 钱塘江古代叫“浙江”……
sources:
  - title: 维基百科：钱塘江
    url: https://zh.wikipedia.org/wiki/钱塘江
---
## 一个“之”字
……
```

## 3. Wanted pages

`npm run content` ends with "百科 pages people link to that don't exist yet", most-linked first. That list is the second queue: a name three pages link to is three readers asking for it. Each run writes at least three of them, preferring names linked from two or more pages, and anything linked from the province being worked on.

## 4. Rivers on the map

The map's rivers come from Natural Earth (`data/raw/ne/ne_10m_rivers_lake_centerlines.geojson`), listed in `RIVERS` in `scripts/map/detail.mjs`. To add one: find its Natural Earth name (it may be named after one stretch, as 钱塘江 is "Fuchun"), add `{ zh, ne, box?, at?, lz?, extra? }` to `RIVERS`, run `node scripts/build-map.mjs`, and commit `src/data/china-detail.json`. `extra` draws a stretch by hand (the 钱塘江 estuary). `lz` is the zoom its name appears at. Touch nothing else in `scripts/` or `src/`.

## 5. Photos

- Each page names its photo in `image:`. Run `node scripts/fetch-images.mjs --only wiki/<id>,wiki/<id>…` for the new pages, and `--only city/<id>,…` for the province's cities that have none yet.
- **Check every pick by eye.** Look at `label`, `desc` and `file` in `content/images.lock.json`. A name can match the wrong thing: 千岛湖 first matched the Thousand Islands on the US–Canada border. Fix with an explicit `File:` found by searching Commons.
- Commons refuses bursts (429). The script leaves refused files for the next run, so just run it again tomorrow. A small thumbnail nobody has asked for before can be refused once while Commons renders it: run the same `--only` again a minute later.
- If a name keeps matching nothing, give the Wikidata Q-id of the thing itself (`city/jiaxing: Q912306` for 嘉兴南湖) or an explicit `File:`.
- Only CC0, public-domain, CC BY and CC BY-SA photos are kept (the script enforces it).

## 6. Sources, facts and copying

Read more than Wikipedia. Use:

- **Wikipedia** (zh first) for the facts and dates.
- **The original texts** where there are any: 《史记》, 《左传》 and the rest on zh.wikisource.org. The best stories are often there (范蠡's eldest son and the thousand gold).
- **知乎专栏** (zhuanlan.zhihu.com), for the stories, debates and angles Wikipedia leaves out: why 夫差 let 勾践 go, what a night out in 临安 was like. Find articles with WebSearch (`allowed_domains: ["zhuanlan.zhihu.com"]`) and read them in the learner's own Chrome through Claude in Chrome (`mcp__claude-in-chrome__*`, a new tab, `get_page_text`), where they are signed in. Zhihu refuses scripted fetches (403), and the app's built-in browser pane isn't signed in (it shows 安全验证). If Chrome isn't connected or shows a login page, don't sign in or get around it: note it in the log and use the other sources. Zhihu posts are written by users and often exaggerate, so take angles and leads from them and check every fact against a second source.
- **Museums, UNESCO, official and tourism sites** for places and objects.

List what you used under `sources:`, zhihu articles included.

Every claim needs a source you read; numbers and dates need two where possible. Legends are told as legends (传说, 据说). Never invent a quote. Never copy: no run of 10+ Chinese characters may match a source. Public-domain classical lines can be quoted briefly.

---

## Queue

One province a day, in this order. 浙江 is done as the template.

- [x] 浙江 zhejiang (template 2026-11-21, finished 2026-11-22)
- [x] 江苏 jiangsu (2026-11-23)
- [x] 四川 sichuan (2026-11-24)
- [x] 陕西 shaanxi (2026-11-25)
- [x] 北京 beijing (2026-11-25, asked for early)
- [x] 广东 guangdong (2026-11-26)
- [ ] 云南 yunnan
- [ ] 福建 fujian
- [ ] 河南 henan
- [ ] 上海 shanghai
- [ ] 湖北 hubei
- [ ] 山东 shandong
- [ ] 湖南 hunan
- [ ] 安徽 anhui
- [ ] 重庆 chongqing
- [ ] 广西 guangxi
- [ ] 西藏 xizang
- [ ] 新疆 xinjiang
- [ ] 甘肃 gansu
- [ ] 山西 shanxi
- [ ] 贵州 guizhou
- [ ] 江西 jiangxi
- [ ] 河北 hebei
- [ ] 天津 tianjin
- [ ] 辽宁 liaoning
- [ ] 吉林 jilin
- [ ] 黑龙江 heilongjiang
- [ ] 内蒙古 neimenggu
- [ ] 海南 hainan
- [ ] 青海 qinghai
- [ ] 宁夏 ningxia
- [ ] 香港 xianggang
- [ ] 澳门 aomen
- [ ] 台湾 taiwan

After the last province: go back to the start and deepen (more cities, more people, more wanted pages), one province a day.

## Ideas that need an OK first (code changes)

All seven earlier ideas got a yes on 2026-11-25 and were built in PR #27 (feature/wiki-ideas): 历史地图 people and events link to 百科, a 你知道吗？ card in 刷一刷, the 连着逛了 N 页 streak, 百科 pins on the big map (places, and people via `pin:`), 顺着X去Y links at the end of province pages, and dashed canals. The same PR made 刷一刷 read marks undoable, stopped long-press from selecting text, and added copy buttons to the word sheet.

- Draw 西江, 北江, 东江 and 韩江 as named tributaries (Natural Earth has the 西江 stretch as "Xi"), so 广东 pages can set `river:` to the stretch they are on. Only `RIVERS` in `scripts/map/detail.mjs` would change.

## Log

- **2026-11-21** · Built the 百科: `[[links]]`, backlinks, wanted pages, the wiki page and 百科 home, photo rows on province and city pages, a pinned map with rivers, the new stamp quiz, press-to-peek word meanings, the world map inside the main map. 浙江 written as the template: province page rewritten, 21 pages (钱塘江, 钱塘潮, 钱镠, 吴越国, 钱塘江大桥, 茅以升, 千岛湖, 富春山居图, 伍子胥, 西湖, 苏轼, 雷峰塔, 龙井茶, 东坡肉, 岳飞, 勾践, 西施, 王羲之, 鲁迅, 绍兴黄酒, 良渚古城), 钱塘江 and 瓯江 added to the map, 杭州 and 绍兴 city pages linked in. 38 wanted pages queued. Still to do: 茅以升's photo (Commons 429, retry).
- **2026-11-22** · Finished 浙江 against the checklist (it had been ticked too early). Wanted pages: 夫差, 范蠡, 黄公望, 南宋. New city pages: 金华, 台州, 湖州, 丽水, 衢州. 宁波, 温州, 嘉兴, 舟山, 乌镇, 义乌, 杭州, 绍兴 now link into the 百科 (e.g. 温州 → 黄公望, 舟山 → 夫差's 甬东, 宁波 → 南宋). Every 浙江 city has a photo now (12 fetched, 绍兴 and 丽水 swapped by hand for 乌篷船 and 云和梯田), plus 茅以升. Fixed `fetch-images.mjs`: files narrower than 960px used to fall back to the original, which Commons throttles, so they 429'd every run; it now asks for a 500/330/250px thumbnail first. Added 知乎专栏 to §6 at the learner's request and read 9 articles in the learner's Chrome. From them, after checking each fact elsewhere: 《越公其事》 (清华简) on why 夫差 spared 越, checked against Yuri Pines (Early China 2022); 子贡 on 夫差 (史记); 文种's "七术" and 庄生 in 范蠡's son story (史记); 元 restoring 科举 while 黄公望 was in prison; why 南宋 chose 杭州 over 南京, the 1111 太湖 freeze (竺可桢), 《梦粱录》 night markets, the 柳永/完颜亮 legend. Dropped as unverified or wrong: a "chrome-plated" 夫差 sword, 黄公望 being pushed into the river, 范蠡 as the author of 夏则资皮 (《国语》 gives it to 文种). Also fixed 的士兵 being read as 的士 (taxi) on four pages. Wanted list: 40 (阖闾, 京杭大运河, 陆游, 瓯江, 普陀山 lead).
- **2026-11-23** · 江苏. Province page rewritten (name from 江宁+苏州, 苏南/苏北, water, 阖闾 to 六朝 to 朱元璋 and 孙中山, people, food, 苏超), two new 聊天彩蛋. 19 pages: places 拙政园, 虎丘, 寒山寺, 太湖, 瘦西湖, 秦淮河, 中山陵, 京杭大运河; people 阖闾, 韩信, 项羽, 朱元璋, 曹雪芹, 白居易; stories 六朝, 红楼梦; food 淮扬菜, 盐水鸭, 大闸蟹. Wanted pages written: 阖闾, 京杭大运河, 韩信, 白居易 (阖闾 and 京杭大运河 were linked from 3 pages). River: 长江 and 淮河 were already drawn; 京杭大运河 added to `RIVERS` as a hand-drawn `extra` line from 北京 to 杭州 (Natural Earth has no canals; 秦淮河 is too small for it). New city pages: 淮安, 宿迁, 连云港, 常州; 南京, 苏州, 无锡, 扬州, 徐州, 镇江, 昆山 now link in. Every 江苏 city has a photo (9 fetched, incl. 南通, 盐城, 泰州). Photos set by hand: 寒山寺 (first pick was a Buddha statue), 大运河 (first pick was a map), 六朝 (a Ming map → 鸡鸣寺, on the 同泰寺 site), 太湖 (first pick's licence was refused), 淮扬菜 (狮子头). Still to do: 秦淮河 should be `File:Qinhuai River along Fuzimiao 2008.jpg` (set, but Commons 429'd four times; it shows the city-wall photo until the retry). 知乎: read 6 articles in the learner's Chrome (大运河/隋炀帝, 虎丘 and 剑池, 江宁织造府, 南京城砖铭文, 韩信's 王孙 question) and checked facts against Wikipedia and 史记. Dropped or hedged: 张继 failing the exam (he probably passed; dropped), the 1950s 剑池 drainage (only in 知乎, told as 据说), the 白塔-overnight legend (told as unrecorded), 盐水鸭 numbers, 寒山寺 New Year bell, 吕彦直's cause of death. Found that 白堤 is not 白居易's (the 白居易 page says so; 西湖 already hedges). Wanted list: 45 (乾隆, 明孝陵, 吴承恩, 孙中山, 长江 lead).
- **2026-11-24** · 四川. Province page rewritten (川峡四路 not "four rivers", 巴 and 蜀, basin and plateau, 三星堆 → 秦 → 都江堰 → 蜀汉, poets who came and left, 麻 before 辣, 汶川, pandas), three new 聊天彩蛋 (川峡四路, 耍, 乐不思蜀). 18 pages: places 都江堰 (id dujiangyan-gongcheng, since 都江堰 is a city id), 三星堆 (sanxingdui-yizhi), 乐山大佛, 峨眉山, 武侯祠, 杜甫草堂, 岷江; people 李冰, 诸葛亮, 刘备, 杜甫, 李白; stories 古蜀 (蚕丛 to 开明, 望帝啼鹃), 蜀汉, 蜀道难 (incl. 剑门关, 五丁开山, 金牛道); food/products 川菜, 麻婆豆腐, 大熊猫. Wanted pages written: 长江, 乾隆 (linked from 6 pages), 明孝陵 (5). River: 岷江, 金沙江, 大渡河, 嘉陵江, 长江 were already drawn, no map change. New city pages: 眉山 (三苏), 广元 (剑门关, 武则天 hedged), 雅安 (宝兴 pandas, 蒙顶茶), 德阳 (三星堆), 泸州, 广安; 成都, 都江堰, 三星堆, 乐山, 绵阳, 宜宾, 阿坝, 自贡 now link in. Photos: 21 wiki pages and 24 四川 cities fetched, so every 四川 city now has one; 眉山 set by hand to 三苏祠, 乾隆 to the court portrait (first pick was a Staunton engraving), 蜀汉 to the 262 Three Kingdoms map (no match by name). 秦淮河's retry worked (夫子庙 photo now in). Still to do: 李冰 is set to `File:Li Bing Statue.JPG` but Commons 429'd every try; retry tomorrow. 广安 (a 普新镇 street), 达州 (万源 square) and 凉山 (会东) have weak generic photos; 邓小平故里, 皇泽寺, 邛海 matched nothing, so they need a Q-id or File:. 知乎: read 3 articles in the learner's Chrome (都江堰四六分水, 三星堆疑云, 白帝托孤 "君可自取") and used 2 more via search snippets for 麻婆豆腐's two "麻子" versions; checked against Wikipedia, 史记·河渠书, 三国志. Dropped or hedged: 李冰's son 二郎 (told as later folklore), "八年凿宝瓶口" and "飞沙堰 removes 75% of sand" (知乎 only, dropped), 海通 gouging his eye (told as legend), 熊猫/猫熊 sign-reading story (told as unproven), the 刀斧手 behind the screen (演义 only), 剑门关 "never taken" (rephrased), 李白 drowning while catching the moon (legend). 岷江's length differs by source (Wikipedia now 1,279 km), so the page says 一千多公里. Wanted list: 43 (孙中山, 吴承恩, 蔡元培, 李清照, 陆游 lead; new from today: 苏辙 from 3 pages, 司马迁, 徐霞客, 三国演义).
- **2026-11-25** · 陕西. Province page rewritten (陕 is in 河南, 三秦, 陕北/关中/陕南 and the 秦岭 line, 十三朝古都 from 周 to 唐, 司马迁 and 张骞, 西安事变 and 延安, 面/馍/醋, 北京时间 sent from 临潼/蒲城), four new 聊天彩蛋. 20 pages: places 兵马俑, 大雁塔, 西安城墙, 华山, 华清池, 乾陵, 壶口瀑布, 渭河; people 秦始皇, 汉武帝, 武则天, 玄奘, 张骞, 司马迁; stories 鸿门宴, 丝绸之路, 西安事变 (official verdict and the 国民党 view side by side); food 肉夹馍, biangbiang面, 羊肉泡馍. Wanted pages written: 司马迁, 苏辙 (3 links), 孙中山 (3), plus 黄河 (became most wanted today, 6 links) and 刘邦. River: 渭河, 黄河, 汉江 already drawn, no map change. New city pages: 咸阳, 宝鸡 (何尊“宅兹中国”), 汉中 (why 汉 is 汉), 渭南, 榆林, 安康, 商洛, 铜川; 西安 and 延安 now link in. Every 陕西 city has a photo (9 fetched). Photos set by hand: 兵马俑 (no match by name → Pit 1), 张骞 (statue), 鸿门宴 (Han tomb mural, Luoyang Museum), 西安事变 (张学良 and 杨虎城), 丝绸之路 (first pick an SVG map with a refused licence → Tang camel and rider), 渭河 (wide panorama → 咸阳 section), 咸阳 (茂陵 matched the Ming 长陵! → 霍去病墓 马踏匈奴), 渭南 (司马迁祠), 汉中 (天汉 bridge), 铜川 (耀州窑 plate). 李冰's retry worked. Still weak from yesterday: 广安, 达州, 凉山 (not retried). 知乎: read 4 articles in the learner's Chrome (兵马俑 colour loss, 鸿门宴 seating and 项伯, 乾陵 never robbed, 张骞 凿空) and checked against 史记, Wikipedia, 人民日报, 新华网. Dropped or hedged: 项羽 burning the pits (told as debated), 希拉克's "eighth wonder" (据说), 无字碑 pre-drawn grid (one view among several), 乾陵 "never robbed" (no tunnel found yet), 黄巢's 40万 diggers (据说), 赵匡胤 and 泡馍, 华山 lost at chess, 韩愈 投书 (all legends), biáng stroke count (56 or 57), 华山 height and 碑 height (sources disagree, left vague), the 1939 lyrics of 《保卫黄河》 (not quoted: not public domain). Readings fixed: 散 in 大散关, 塞 in 安塞, 曲江, 千尺幢, 发丧, 蕃息, and 的士兵 again on 兵马俑. Wanted list: 42 (吴承恩, 蔡元培, 李清照, 陆游 lead; new from today: 韩城, 西游记).

- **2026-11-25** · 北京 (a day early, asked for by the learner). Province page rewritten (the 北京湾 between 太行山 and 燕山, 蓟/燕 → 中都 → 大都 → 北京 → 北平, 永乐's palace and 天坛, the 清 gardens and 1860, the city wall and why 2号线 stations are all 门, 1900 to 1919 to 卢沟桥 to 1949, food, 北京话, the 双奥之城), five new 聊天彩蛋. 22 pages: places 故宫, 长城, 天坛, 颐和园, 圆明园, 天安门 (1989 told with the official verdict and other views side by side), 胡同, 永定河, 北京中轴线; people 永乐帝, 忽必烈, 慈禧, 梁思成, 老舍; stories 五四运动, 京剧; food 北京烤鸭, 豆汁儿, 炸酱面. Wanted pages written: 吴承恩 and 蔡元培 (top of the wanted list), 西游记 (asked for by 吴承恩). No new wanted pages from today: every 北京 link points to a page. 北京 has no city pages (it is one city), so no `city:` fields. River: 永定河 added to `RIVERS` (Natural Earth "Yongding"). Photos set by hand: 长城 (a 250px pick → 慕田峪), 京剧 (a Japanese troupe photo → 大闹天宫 on stage), 北京烤鸭 (a small Vietnamese duck → carving at 全聚德), 梁思成 (Commons 429 → him and 林徽因), 吴承恩 (no portrait exists → 故居 gate). Yesterday's weak city photos fixed: 广安 (邓小平故居), 达州 (渠县 冯焕阙, a Han pillar), 凉山 (邛海). 知乎: read 3 articles (颐和园 and the navy money, 胡同, 永乐迁都) and checked against Wikipedia, 新华网, 光明网, 人民日报. Dropped or hedged: 颐和园's 3000万两 (traced to 梁启超; told as debated), 天子守国门 (a later phrase), 胡同 from Mongolian “well” (one theory), the 四大徽班 name (later), 梁思成's “肉/皮” line (several versions), 马可·波罗 actually reaching China (some doubt it), 烤鸭 from 南京 (unproven), 全聚德's 200 heads of state (据说), 光绪's arsenic (who did it is unknown), 吴承恩 as author (一般认为). A quote about 豆汁儿 I couldn't source was cut from a hook. Ten news links in the new pages were dead and swapped for encyclopedia pages. Readings fixed: 燕 yān, 大汗 hán, 便宜坊 biànyí, 爆肚 dǔ, 圜丘 yuán, 削藩 xuē, 华阳洞天主人校 jiào, 舍予 shě, and others. Lesson: `{字|py}` can't go inside a YAML `[...]` list or at the start of a plain value; it breaks the build. Wanted list: 39 (李清照, 陆游, 瓯江, 普陀山 lead).
- **2026-11-26** · 广东. Province page rewritten (粤/百越 and 广南东路, 五岭 and the three rivers of 珠江, the two-thousand-year port from 南越王墓 to 十三行, the Cantonese who tried to change China, 早茶/凉茶/荔枝, 特区 to 大湾区), four new 聊天彩蛋 (广南东路, 叩指礼, 伍秉鉴, 岭南). 17 pages: places 珠江, 南越王墓, 陈家祠, 丹霞山, 开平碉楼, 广济桥; people 赵佗, 惠能, 韩愈 (an outsider who made his name in 潮州), 康有为, 梁启超, 黄飞鸿; stories/culture 十三行, 粤剧; food/products 早茶, 荔枝 (with the 岭南-or-涪州 debate over 杨贵妃's lychees), 凉茶. 林则徐, 虎门销烟, 孙中山 and 苏轼 already existed and are linked in. Wanted pages written: 李清照, 陆游 (both linked from 2 pages), 钱弘俶 (2). Each page with an `era:` got two pictures in the text. River: 珠江 was already drawn; no map change (西江/北江/东江/韩江 are not drawn, see ideas below if wanted). New city pages: 韶关, 云浮, 河源, 茂名, 肇庆, 清远, 阳江, 揭阳; 广州, 潮州, 江门, 佛山, 东莞, 惠州, 中山 now link in. Every 广东 city has a photo (19 fetched). Photos set by hand: 黄飞鸿 (first pick was a portrait of uncertain identity; the page says no reliable photo exists → 佛山 memorial hall), 十三行 (→ painting of the European factories), 钱弘俶 (no match → Commons portrait), 凉茶 (no match → 王老吉 stall), 早茶 (a German food photo → dim sum basket), and in-text: 韩江 matched the novelist 韩江 (Han Kang)! → `File:Chaozhou Han River.jpeg`; 文帝行玺, 丝缕玉衣, 自力村, 瑞石楼, 饮冰室, 石湾陶塑, 醒狮, 十三行博物馆, 潮州 by File:. Cities: 河源 (赵佗 statue), 肇庆 (七星岩), 茂名 (冼夫人 statue), 清远 (first pick refused for licence → 连南 瑶寨). Still weak: 梅州 (a park; 围龙屋 matched nothing), 东莞/惠州/中山/汕头 are montages. 知乎: read 5 articles in the learner's Chrome (南越王墓全解, 赵佗 103岁, 十三行 穿越, 开平碉楼, 六祖惠能) and checked against 史记·南越列传, 汉书, Wikipedia, UNESCO, 澎湃, 金羊网. Dropped or hedged: 赵佗's age 103 (told as 据说一百多岁), the 南越王墓 荔枝 remains (知乎 only, dropped), 毛泽东's "南下干部第一人" (told as 有人叫他), 陈家祠 "72县" (told as a saying, per 新快报's research), 1922 碉楼 searchlight rescue (told as 据当地的记载), 林则徐 and 王老吉 (legend), 乾隆 and 叩指礼 (legend), 梁启超's "wrong kidney" (told as disputed, with his own article), 黄飞鸿's birth year and photos, 公车上书 actually being delivered (debated), 钱弘俶 poisoned (no evidence), 百家姓 order (一般认为). Readings fixed: 秦{将|jiàng}, {曲|qū}江, {切|qiē}开, {行|háng} throughout 十三行. Wanted list: 36 (秦桧 now 3 links, 六和塔, 瓯江, 普陀山 lead).
