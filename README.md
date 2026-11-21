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
                            body = intro paragraph, then `## 聊天彩蛋` with - bullets
  feed/<slug>.md            刷一刷 cards: id (= file name), date, title (the hook question), province?, series?,
                            tags, sources [{ title, url }], inspiration; body 150–300 字 ending on a question
```

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
