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
```

Markup in stories:

- `::原文[bai-niangzi#8:10-19]` drops in sentences 10–19 of paragraph 8 of a full text. The paragraph number is 1-based, and `:a-b` is optional.
- `{假|jià}` forces a reading. `npm run content` lists every word with several readings, so a wrong guess can be fixed this way.
- Every episode except the last needs at least 2 `gate` questions: `{ q, options: [...], answer: <index> }`.

`npm run check:content` validates everything without writing files.

## Credits

- Dictionary: [CC-CEDICT](https://www.mdbg.net/chinese/dictionary?page=cc-cedict) (CC BY-SA 4.0)
- HSK lists: [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) (MIT)
- Full texts: [维基文库 Wikisource](https://zh.wikisource.org), public domain
- Fonts: LXGW WenKai, Nunito (SIL OFL). Icons: Phosphor (MIT).

Stories are written in our own words. Social media is used only for inspiration and is linked, never copied.
