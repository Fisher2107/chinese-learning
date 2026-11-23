# 中国通

A Chinese-learning app (a PWA) for learning China's places, history and poetry in Chinese, so you can hold good conversations with Chinese people. Built for an HSK 5 reader. See [PLAN.md](PLAN.md) for the full design.

**Phase 1** has:

- the episode reader with recall gates that unlock the next episode
- a word card on every word (pinyin, meaning, ⭐ save with its sentence, 💬 问AI)
- FSRS flashcard review
- full public-domain texts read in sittings
- paste-to-import, private to your device
- an OpenAI key setting for 问AI, 解释 and 翻译

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173/chinese-learning/. The first run downloads CC-CEDICT and the HSK lists into `data/raw/`, then builds `public/data/` and `public/content/`.

`npm run build` makes the production site in `dist/`. Pushing to `main` deploys it to GitHub Pages.

## Sync progress

Open **我的 → 云同步 → 用邮箱登录** on each device and use the same email. Signing in opens a separate cloud profile. Your original device profile is available again after signing out. While the app is open, Dexie Cloud sends queued study changes after reconnecting. The sync panel shows the last successful sync.

Saved words (including example sentences and notes), review history, reading and map progress, and study counters sync. Pasted articles, cached AI answers and the OpenAI key stay on the device. **我的 → 备份** still exports and restores JSON backups.

The production database URL is public. For a separate deployment set `VITE_DEXIE_CLOUD_URL` at build time and allow the site's origin in that database.

## Writing content

```
content/
  terms.yml                 names and words the dictionary lacks: { w, p, d }
  texts/<id>.md             public-domain full texts (fetched by scripts/fetch-texts.mjs)
  series/order.yml          the order series appear in
  series/<id>/index.md      title, subtitle, place, kind, color, sources; description in the body
  series/<id>/01.md …       episodes: title, beat, gate (recall questions); story in the body
  series/<id>/after.md      读后: ## headings and - bullets (关键词, 聊天工具包, 聊天彩蛋)
  places/<id>.md            one per province (34): id, name, full, type, short, alias?, capital?, region, note?;
                            body = intro paragraph, then `## 聊天彩蛋` with - bullets (see below)
  cities/<id>.md            a city page: id, name, nickname?; intro, then `## 聊天彩蛋` the same way
  dialect.md                家乡话 for the 家乡话与地方梗 collection: `## <province id>`, then entries
                            written like 聊天彩蛋 (every province has a section in the app, written or not)
  feed/<slug>.md            刷一刷 cards: id (= file name), date, title (the hook question), province?, series?,
                            tags, sources [{ title, url }], inspiration; body 150–300 字 ending on a question
```

Each 聊天彩蛋 bullet on a province or city page needs a question under it, which becomes its
flashcard, and can have search words for 深入 (otherwise its first “quoted” words, or the place name):

```markdown
## 聊天彩蛋
- 每年农历八月十八前后，钱塘江大潮最壮观，很多人专门去看潮。
  问：什么时候去看钱塘江大潮最好？
  查：钱塘江大潮
```

An egg can also say where it comes from, with any number of `源：[标题](https://…)` lines; they're
listed under 深入. dialect.md entries use the same format and should have one:

```markdown
## henan
- 河南话里，“中”就是“行、可以”……所以网上很火的“俺不中嘞”，意思就是“我不行了”。
  问：网上很火的“俺不中嘞”是什么意思？河南人觉得它地道吗？
  查：俺不中嘞
  源：[新周刊：河南话魔性爆红，河南人自己都没想通（2025）](https://m.huxiu.com/article/4794212.html)
```

The app keeps the user's own edits, notes and flashcards for an egg under an id made from its page
and its text, so fixing an egg's wording gives it a new id; the old notes stay, shown as the user's own.

A series lists the provinces it's about with `provinces: [henan]` in its index.md; those link the
series to the map and light the province up as it's read.

Pinyin never appears over the text: it only shows in the word card when a word is tapped. It still
has to be right, so check the readings `npm run content` reports.

The map outline (`src/data/china-map.json`) comes from Natural Earth and is committed. Rebuild it
only if the borders need to change: `node scripts/build-map.mjs`. The world overview
(`src/data/world-map.json`) uses public-domain [Natural Earth 1:50m Admin 0 Countries](https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-0-countries-2/).
Rebuild it with `node scripts/build-world-map.mjs`.

Markup in stories:

- `::原文[bai-niangzi#8:10-19]` drops in sentences 10–19 of paragraph 8 of a full text. The paragraph number is 1-based, and `:a-b` is optional.
- `{假|jià}` forces a reading, and `{魔都|módū}` forces a whole word. `npm run content` lists every word with several readings, so a wrong guess can be fixed this way. Names that get split into single characters belong in `terms.yml`.
- Every episode except the last needs at least 2 `gate` questions: `{ q, options: [...], answer: <index> }`.

`npm run check:content` validates everything without writing files.

## Credits

- Dictionary: [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) (CC BY-SA 4.0)
- HSK lists: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT)
- Full texts: [维基文库 Wikisource](https://zh.wikisource.org), public domain
- Fonts: LXGW WenKai, Nunito (SIL OFL). Icons: Phosphor (MIT).

Stories are written in our own words. Social media is used only for inspiration and is linked, never copied.
