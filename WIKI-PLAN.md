# 百科 · Plan of action

**Goal:** every province, city, river, mountain, person, legend and dish worth talking about has its own page, and every page leads to two or three more. Reading about 钱塘江 should pull you to 钱镠, then 吴越国, then 雷峰塔, then 鲁迅, the way a wiki does, until you look up and an hour has gone.

The daily task `zhongguotong-wiki-daily` (10:00 every day) works through this file. It ticks boxes and adds to the log at the bottom. Nothing here is locked: reorder the queue or add notes and the next run follows them.

---

## 1. What "done" looks like for a province

浙江 is the template (`content/places/zhejiang.md` and the pages in `content/wiki/`). A province is done when it has all of these:

- [ ] **Province page rewritten** as a long read, about 1,800–2,500 字: an opening paragraph, then 5–7 `##` sections (where the name comes from, geography, history, people, food, today), then `## 聊天彩蛋`. Every person, place, river, event and dish that has (or deserves) a page is a `[[link]]`.
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
at: [120.15, 30.2]           # lon, lat: a pin on the map (places only)
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

### Check a reading path before marking a batch complete

Start from an existing city or province page and follow two recommendations in the built wiki. Each published page should have at least two working recommendations, and the destination should answer the question in its hook. Keep prospective topics in body links, where the builder counts them as wanted. A local legend should be identified as such in the lede and quiz as well as the body.

A province can take several batches. Record finished pages and remaining gaps in the log, and tick the province only when its checklist is complete.

## 3. Wanted pages

`npm run content` ends with "百科 pages people link to that don't exist yet", most-linked first. That list is the second queue: a name three pages link to is three readers asking for it. Each run writes at least three of them, preferring names linked from two or more pages, and anything linked from the province being worked on.

## 4. Rivers on the map

The map's rivers come from Natural Earth (`data/raw/ne/ne_10m_rivers_lake_centerlines.geojson`), listed in `RIVERS` in `scripts/map/detail.mjs`. To add one: find its Natural Earth name (it may be named after one stretch, as 钱塘江 is "Fuchun"), add `{ zh, ne, box?, at?, lz?, extra? }` to `RIVERS`, run `node scripts/build-map.mjs`, and commit `src/data/china-detail.json`. `extra` draws a stretch by hand (the 钱塘江 estuary). `lz` is the zoom its name appears at. Touch nothing else in `scripts/` or `src/`.

## 5. Photos

- Each page names its photo in `image:`. Run `node scripts/fetch-images.mjs --only wiki/<id>,wiki/<id>…` for the new pages, and `--only city/<id>,…` for the province's cities that have none yet.
- **Check every pick by eye.** Look at `label`, `desc` and `file` in `content/images.lock.json`. A name can match the wrong thing: 千岛湖 first matched the Thousand Islands on the US–Canada border. Fix with an explicit `File:` found by searching Commons.
- Commons refuses bursts (429). The script leaves refused files for the next run, so just run it again tomorrow.
- Only CC0, public-domain, CC BY and CC BY-SA photos are kept (the script enforces it).

## 6. Facts and copying

Every claim needs a source you read; numbers and dates need two where possible. Legends are told as legends (传说, 据说). Never invent a quote. Never copy: no run of 10+ Chinese characters may match a source. Public-domain classical lines can be quoted briefly.

---

## Queue

One province a day, in this order. 浙江 is done as the template.

- [x] 浙江 zhejiang (template, 2026-11-21)
- [ ] 江苏 jiangsu
- [ ] 四川 sichuan
- [ ] 陕西 shaanxi
- [ ] 北京 beijing
- [ ] 广东 guangdong
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

The daily task doesn't change app code. These are waiting for a yes:

- Link the 历史地图 events and people to 百科 pages.
- A 百科 card in the 刷一刷 feed: "你知道吗？" with a page's hook.
- A "rabbit-hole streak": count how many pages in a row you followed today.
- Show 百科 pages on the big map as pins when zoomed in.

## Log

- **2026-11-21** · Built the 百科: `[[links]]`, backlinks, wanted pages, the wiki page and 百科 home, photo rows on province and city pages, a pinned map with rivers, the new stamp quiz, press-to-peek word meanings, the world map inside the main map. 浙江 written as the template: province page rewritten, 21 pages (钱塘江, 钱塘潮, 钱镠, 吴越国, 钱塘江大桥, 茅以升, 千岛湖, 富春山居图, 伍子胥, 西湖, 苏轼, 雷峰塔, 龙井茶, 东坡肉, 岳飞, 勾践, 西施, 王羲之, 鲁迅, 绍兴黄酒, 良渚古城), 钱塘江 and 瓯江 added to the map, 杭州 and 绍兴 city pages linked in. 38 wanted pages queued. Still to do: 茅以升's photo (Commons 429, retry).

- **2026-11-22** · 江苏 started with the Wu–Yue reading path from 苏州. Added three previously wanted pages: 阖闾, 夫差 and 范蠡. 范蠡 is listed with 越 and his later life in 山东. 江苏 remains open for its long read, sights, food and city coverage.
