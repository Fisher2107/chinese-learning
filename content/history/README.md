# 历史长卷

One file per era, in the order of `order.yml`. Book 1 (`book: 1`) is the dynasties along the 朝代歌; book 2 is 1840 to today. The plan behind it is HISTORY-PLAN.md.

## Frontmatter

- `id`, `name`, `dates`, `book`, `seal` (one or two characters, the 朝代印), `color`, `hook` (one line that makes you want to open it), `image` (the era's picture: a Wikidata name, a Q-id, `File:…`, or `=wiki/<id>` to borrow a page's photo; fetched by `npm run images`).
- `song`: the 朝代歌 couplet the era sits under (book 1 only).
- `stories`: 百科 page ids in the order the era page shows them. Every other page whose `era:` names this era follows. A page listed here must have this era in its `era:`.
- `series`: series ids that tell this era's story.
- `map`: drawn on the app's own map (scripts/history-map.mjs).
  - `box: [lon0, lat0, lon1, lat1]`: what the map opens on.
  - `states`: `{ name, cities: [...], provinces: [...], countries: [ISO3], outlines: [{ outline: [[lon, lat], …], abroad: true }], kind, note, color, label: [lon, lat] }`. Cities are today's prefecture-level cities (ids from the map, e.g. `shaoxing`); a state is roughly the area of those cities. `kind` is `state` (default), `lost`, `leased`, `occupied` or `zone`. Borders follow 谭其骧《中国历史地图集》 and are shown as 大致范围.
  - `capitals: [{ name, at: [lon, lat], of }]`, `pins: [{ name, at, note }]`, `routes: [{ name, line: [[lon, lat], …] }]`.
- `people`: `<portrait id>: { name, role }` for the 大事年表 portraits (src/data/history-media.json).
- `timeline`: `{ date, title, place, at, figures: [portrait ids], story, sources: [{ title, url, kind }], rank, hook }`.
- `quiz`: like a 百科 page's.

## Body

```
一分钟读懂: about 200 字.
---more---
再多读一点: 400–600 字 more.

## 聊天提示                       (book 2)
- 骄傲：…
- 经历过：…
- 少提：…

## 聊天彩蛋
- 端午节吃粽子，是为了纪念屈原……
  问：端午节为什么吃粽子？
  标：节日                         (节日 / 成语 / 吃的 / 还在说)
```

## Stories (百科 pages)

A story is a 百科 page with `era: [<era id>, …]`. On top of the usual page:

- 2–4 pictures in the text, each on its own line under the paragraph it belongs to: `![虎门销烟池 · 东莞虎门](File:….jpg)`.
- Sources tagged with whose account they are: `{ title, url, kind: 原典 | 官方 | 学者 | 媒体 | 百科 }`. Most of them in Chinese.
- `## 读原文`: one to three lines of the original source as `> …` quotes, then a plain-Chinese version.
- Sensitive topics: `sensitive: true` and a `## 为什么敏感` section with four lines, `- 官方：…`, `- 争议：…`, `- 在中国：…`, `- 聊天：…`. The page needs one 官方 source and one that isn't.
