// Builds the reading content into JSON for the app.
//   content/series/<id>/index.md     series info + description
//   content/series/<id>/NN.md        one episode each (frontmatter: title, beat, gate)
//   content/series/<id>/after.md     读后: key words, 聊天工具包, 聊天彩蛋…
//   content/texts/<id>.md            public-domain full texts
//   content/terms.yml                names and words the dictionary lacks
//   content/places/<id>.md           one page per province: intro, then ## 聊天彩蛋 bullets
//   content/feed/<slug>.md           刷一刷 cards: title is the hook question, body 150–300 字
// Output: public/content/{index.json, series/<id>.json, texts/<id>.json, places.json, feed.json}
//
// Markup inside stories:
//   {假|jià}                  force a reading
//   ::原文[text-id#P]         excerpt of paragraph P of a text (1-based)
//   ::原文[text-id#P:a-b]     sentences a..b of paragraph P
//   ## heading / - bullet     headings and list items (used in after.md)
//
// --check: validate only, and fail on errors.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { parse as parseYaml } from 'yaml'
import { splitSentences, tokenizeSentence, glossFor, isHan, readings, numericToMarks } from '../src/lib/zh-core.ts'
import { JIEQI } from '../src/lib/jieqi.ts'

const CHECK = process.argv.includes('--check')
const SITTING_CHARS = 1800
const errors = []
const ambiguous = new Map()

const dict = JSON.parse(await readFile('public/data/dict.json', 'utf8'))
const hsk = JSON.parse(await readFile('public/data/hsk.json', 'utf8'))
const terms = Object.fromEntries(
  (parseYaml(await readFile('content/terms.yml', 'utf8')) ?? []).map((t) => [t.w, { p: t.p.replace(/\s+/g, ''), d: t.d }]),
)

// Every city on the map is a term, so its name stays one word with its place-name reading
// (六安 lù'ān, 蚌埠 bèngbù) and a gloss saying where it is. terms.yml still wins.
const PROVINCE_EN = {
  beijing: 'Beijing', tianjin: 'Tianjin', hebei: 'Hebei', shanxi: 'Shanxi', neimenggu: 'Inner Mongolia', liaoning: 'Liaoning',
  jilin: 'Jilin', heilongjiang: 'Heilongjiang', shanghai: 'Shanghai', jiangsu: 'Jiangsu', zhejiang: 'Zhejiang', anhui: 'Anhui',
  fujian: 'Fujian', jiangxi: 'Jiangxi', shandong: 'Shandong', henan: 'Henan', hubei: 'Hubei', hunan: 'Hunan',
  guangdong: 'Guangdong', guangxi: 'Guangxi', hainan: 'Hainan', chongqing: 'Chongqing', sichuan: 'Sichuan', guizhou: 'Guizhou',
  yunnan: 'Yunnan', xizang: 'Tibet (Xizang)', shaanxi: 'Shaanxi', gansu: 'Gansu', qinghai: 'Qinghai', ningxia: 'Ningxia',
  xinjiang: 'Xinjiang', xianggang: 'Hong Kong', aomen: 'Macau', taiwan: 'Taiwan',
}
const mapDetail = JSON.parse(await readFile('src/data/china-detail.json', 'utf8'))
for (const c of mapDetail.cities) {
  if (terms[c.name] || c.kind === 'muni') continue
  const entries = dict[c.name] ?? []
  const numeric = (entries.find(([p]) => /^[A-Z]/.test(p)) ?? entries[0])?.[0] ?? [...c.name].map((ch) => dict[ch]?.[0]?.[0] ?? '').join(' ')
  const en = c.pin.replace(/-.*/, '').replace(/^./, (m) => m.toUpperCase())
  const where = PROVINCE_EN[c.prov]
  const what = c.kind === 'capital' ? `capital of ${where}` : c.kind === 'spot' ? `a famous town in ${where}` : c.full.endsWith('自治州') ? `an autonomous prefecture in ${where}` : /(地区|盟)$/.test(c.full) ? `a prefecture in ${where}` : `a city in ${where}`
  terms[c.name] = { p: numericToMarks(numeric).toLowerCase(), d: `${en}, ${what}` }
}

const lookup = {
  entries: (w) => dict[w],
  term: (w) => terms[w],
  hsk: (w) => hsk[w],
}

function splitFrontmatter(src, file) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) {
    errors.push(`${file}: missing frontmatter`)
    return { meta: {}, body: src }
  }
  return { meta: parseYaml(m[1]) ?? {}, body: m[2] }
}

/** Tokenizes text into sentences, recording glossary entries and ambiguous readings. */
function makeSentences(text, glossary, where, trackAmbiguity = true) {
  return splitSentences(text).map((s) => {
    const { tokens, ambiguous: amb } = tokenizeSentence(s, lookup)
    for (const tok of tokens) {
      if (tok.p && isHan(tok.t)) glossary[`${tok.t}|${tok.p}`] ??= glossFor(tok.t, tok.p, lookup)
    }
    if (trackAmbiguity) {
      for (const w of amb) {
        const chosen = tokens.find((t) => t.t === w)?.p ?? '?'
        const key = `${w}|${chosen}`
        const list = ambiguous.get(key) ?? []
        if (list.length < 2) list.push(`${where}: ${s}`)
        ambiguous.set(key, list)
      }
    }
    return { tokens }
  })
}

function charCount(s) {
  return [...s].filter(isHan).length
}

// ---------- full texts ----------
const texts = {}
const textDir = 'content/texts'
for (const file of (await readdir(textDir)).filter((f) => f.endsWith('.md')).sort()) {
  const { meta, body } = splitFrontmatter(await readFile(`${textDir}/${file}`, 'utf8'), file)
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  // which sitting each paragraph lands in
  const sittingOf = []
  let sitting = 0
  let used = 0
  for (const p of paragraphs) {
    if (used >= SITTING_CHARS) {
      sitting++
      used = 0
    }
    sittingOf.push(sitting)
    used += charCount(p)
  }
  texts[meta.id] = { meta, paragraphs, sittingOf }
}

function buildText(id) {
  const { meta, paragraphs, sittingOf } = texts[id]
  const glossary = {}
  const parts = []
  paragraphs.forEach((p, i) => {
    ;(parts[sittingOf[i]] ??= []).push({ kind: 'p', sentences: makeSentences(p, glossary, id, false) })
  })
  return {
    id,
    title: meta.title,
    author: meta.author,
    year: meta.year,
    from: meta.from,
    source: meta.source,
    license: meta.license,
    chars: paragraphs.reduce((n, p) => n + charCount(p), 0),
    sittings: parts.length,
    parts,
    glossary,
  }
}

// ---------- story bodies ----------
function parseBlocks(body, glossary, where) {
  const blocks = []
  for (const raw of body.split(/\n\s*\n/)) {
    const chunk = raw.trim()
    if (!chunk) continue
    const ex = chunk.match(/^::原文\[([\w-]+)#(\d+)(?:-(\d+))?(?::(\d+)-(\d+))?\]$/)
    if (ex) {
      const [, textId, fromStr, toStr, sFrom, sTo] = ex
      const text = texts[textId]
      if (!text) {
        errors.push(`${where}: unknown text "${textId}"`)
        continue
      }
      const from = Number(fromStr)
      const to = Number(toStr ?? fromStr)
      if (from < 1 || to > text.paragraphs.length || from > to) {
        errors.push(`${where}: ${textId} has no paragraphs ${from}-${to}`)
        continue
      }
      const paras = text.paragraphs.slice(from - 1, to).map((p) => {
        let sentences = splitSentences(p)
        if (sFrom) sentences = sentences.slice(Number(sFrom) - 1, Number(sTo))
        return { kind: 'p', sentences: makeSentences(sentences.join(''), glossary, where, false) }
      })
      blocks.push({
        kind: 'excerpt',
        textId,
        title: text.meta.title,
        author: text.meta.author,
        year: text.meta.year,
        sitting: text.sittingOf[from - 1],
        paras,
      })
      continue
    }
    for (const line of chunk.split('\n')) {
      const l = line.trim()
      if (!l) continue
      if (l.startsWith('## ')) blocks.push({ kind: 'h', sentences: makeSentences(l.slice(3), glossary, where) })
      else if (l.startsWith('- ')) blocks.push({ kind: 'li', sentences: makeSentences(l.slice(2), glossary, where) })
      else blocks.push({ kind: 'p', sentences: makeSentences(l, glossary, where) })
    }
  }
  return blocks
}

const PALETTE = ['#ED5126', '#2BAE85', '#425066', '#E3A008', '#8E5BB5']

async function buildSeries(id, index) {
  const dir = `content/series/${id}`
  const { meta, body } = splitFrontmatter(await readFile(`${dir}/index.md`, 'utf8'), `${id}/index.md`)
  const glossary = {}
  const files = (await readdir(dir)).filter((f) => /^\d+\.md$/.test(f)).sort()
  const full = []
  for (const file of files) {
    const where = `${id}/${file}`
    const ep = splitFrontmatter(await readFile(`${dir}/${file}`, 'utf8'), where)
    const blocks = parseBlocks(ep.body, glossary, where)
    const gate = (ep.meta.gate ?? []).map((g, i) => {
      if (!Array.isArray(g.options) || g.answer == null || g.answer >= g.options.length)
        errors.push(`${where}: gate question ${i + 1} needs options and a valid answer index`)
      return {
        q: makeSentences(g.q, glossary, where)[0] ?? { tokens: [] },
        options: (g.options ?? []).map((o) => ({ tokens: makeSentences(String(o), glossary, where).flatMap((s) => s.tokens) })),
        answer: g.answer,
      }
    })
    if (!ep.meta.title) errors.push(`${where}: missing title`)
    const plain = ep.body.replace(/::原文\[[^\]]+\]/g, '')
    full.push({
      n: Number(file.slice(0, -3)),
      title: ep.meta.title,
      beat: ep.meta.beat ?? '',
      chars: charCount(plain),
      blocks,
      gate,
    })
  }
  for (const ep of full.slice(0, -1)) {
    if (ep.gate.length < 2) errors.push(`${id}/${ep.n}: needs at least 2 gate questions to unlock the next episode`)
  }
  const afterPath = `${dir}/after.md`
  const after = existsSync(afterPath) ? parseBlocks(await readFile(afterPath, 'utf8'), glossary, `${id}/after.md`) : []
  const summary = {
    id,
    title: meta.title,
    subtitle: meta.subtitle ?? '',
    place: meta.place ?? '',
    kind: meta.kind ?? '',
    color: meta.color ?? PALETTE[index % PALETTE.length],
    provinces: meta.provinces ?? [],
    episodes: full.map(({ n, title, beat }) => ({ n, title, beat })),
  }
  return {
    summary,
    file: {
      ...summary,
      description: parseBlocks(body, glossary, `${id}/index.md`),
      full,
      after,
      sources: meta.sources ?? [],
      inspiration: meta.inspiration ?? [],
      glossary,
    },
  }
}

// ---------- write ----------
const seriesIds = (await readdir('content/series', { withFileTypes: true }))
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort((a, b) => a.localeCompare(b))
const order = parseYaml(await readFile('content/series/order.yml', 'utf8')) ?? []
seriesIds.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))

const seriesOut = []
for (const [i, id] of seriesIds.entries()) seriesOut.push(await buildSeries(id, i))
const textOut = Object.keys(texts).map(buildText)

// ---------- places (provinces) ----------
const placeIds = new Set()
const places = []
const placesGlossary = {}
for (const file of (await readdir('content/places')).filter((f) => f.endsWith('.md')).sort()) {
  const where = `places/${file}`
  const { meta, body } = splitFrontmatter(await readFile(`content/places/${file}`, 'utf8'), where)
  for (const k of ['id', 'name', 'full', 'type', 'short', 'region']) if (!meta[k]) errors.push(`${where}: missing ${k}`)
  if (`${meta.id}.md` !== file) errors.push(`${where}: id should match the file name`)
  if (meta.short && [...meta.short].length !== 1) errors.push(`${where}: short should be one character (put a second one in alias)`)
  const [intro, eggs = ''] = body.split(/^## 聊天彩蛋\s*$/m)
  placeIds.add(meta.id)
  places.push({
    id: meta.id,
    name: meta.name,
    full: meta.full,
    type: meta.type,
    short: meta.short,
    alias: meta.alias ?? '',
    capital: meta.capital ?? '',
    region: meta.region,
    note: meta.note ? makeSentences(meta.note, placesGlossary, where) : [],
    intro: parseBlocks(intro, placesGlossary, where),
    eggs: parseBlocks(eggs, placesGlossary, where),
    chars: charCount(intro) + charCount(eggs),
    series: seriesOut.filter((s) => s.summary.provinces.includes(meta.id)).map((s) => s.summary.id),
  })
}
for (const s of seriesOut)
  for (const pid of s.summary.provinces) if (!placeIds.has(pid)) errors.push(`series ${s.summary.id}: unknown province "${pid}"`)

// ---------- 刷一刷 feed ----------
const feed = []
const feedGlossary = {}
const feedDir = 'content/feed'
for (const file of existsSync(feedDir) ? (await readdir(feedDir)).filter((f) => f.endsWith('.md')).sort() : []) {
  const where = `feed/${file}`
  const { meta, body } = splitFrontmatter(await readFile(`${feedDir}/${file}`, 'utf8'), where)
  const id = meta.id ?? file.slice(0, -3)
  if (!meta.title) errors.push(`${where}: missing title (the hook question)`)
  if (meta.province && !placeIds.has(meta.province)) errors.push(`${where}: unknown province "${meta.province}"`)
  if (meta.series && !seriesIds.includes(meta.series)) errors.push(`${where}: unknown series "${meta.series}"`)
  if (!Array.isArray(meta.sources) || meta.sources.length === 0) errors.push(`${where}: needs at least one source`)
  const chars = charCount(body)
  if (chars < 100 || chars > 360) errors.push(`${where}: body is ${chars} 字, aim for 150–300`)
  feed.push({
    id,
    date: meta.date ? String(meta.date) : '',
    title: makeSentences(String(meta.title ?? ''), feedGlossary, where),
    province: meta.province ?? '',
    series: meta.series ?? '',
    tags: meta.tags ?? [],
    chars,
    body: parseBlocks(body, feedGlossary, where),
    sources: meta.sources ?? [],
    inspiration: meta.inspiration ?? [],
  })
}

// ---------- cities on the map ----------
// Every city on the map gets a line of facts from the map data (src/data/china-detail.json);
// the ones with a page in content/cities/<id>.md also get an intro and 聊天彩蛋.
const detail = mapDetail
const mapCities = new Map(detail.cities.map((c) => [c.id, c]))
const provName = Object.fromEntries(places.map((p) => [p.id, p.name]))
const cities = []
const citiesGlossary = {}
const cityDir = 'content/cities'
const written = new Map()
for (const file of existsSync(cityDir) ? (await readdir(cityDir)).filter((f) => f.endsWith('.md')).sort() : []) {
  const where = `cities/${file}`
  const { meta, body } = splitFrontmatter(await readFile(`${cityDir}/${file}`, 'utf8'), where)
  const c = mapCities.get(meta.id)
  if (!c) errors.push(`${where}: "${meta.id}" is not a city on the map (see the ids printed by build-map)`)
  else if (meta.name && meta.name !== c.name) errors.push(`${where}: name "${meta.name}" but the map calls it "${c.name}"`)
  if (`${meta.id}.md` !== file) errors.push(`${where}: id should match the file name`)
  const [intro, eggs = ''] = body.split(/^## 聊天彩蛋\s*$/m)
  if (!eggs.trim()) errors.push(`${where}: needs a ## 聊天彩蛋 section`)
  written.set(meta.id, { meta, intro, eggs, where })
}
const wan = (n) => (n >= 100 ? `${Math.round(n / 10) * 10}万` : `${n}万`)
function cityFacts(c) {
  const pn = provName[c.prov]
  if (c.kind === 'spot') return `${c.name}在${pn}。`
  if (c.prov === 'taiwan') return `${c.name}在台湾${c.kind === 'capital' ? '北部' : ''}。`
  const pop = c.pop ? `，人口大约${wan(c.pop)}` : ''
  const region = places.find((p) => p.id === c.prov)?.type === '自治区'
  if (c.kind === 'capital') return `${c.full}是${pn}的${region ? '首府' : '省会'}${pop}。`
  return `${c.full}在${pn}${pop}。`
}
for (const c of detail.cities) {
  if (c.kind === 'muni') continue // their page is the province page
  const w = written.get(c.id)
  const where = w?.where ?? `cities/${c.id}`
  cities.push({
    id: c.id,
    nickname: w?.meta.nickname ? String(w.meta.nickname) : '',
    facts: makeSentences(cityFacts(c), citiesGlossary, where),
    intro: w ? parseBlocks(w.intro, citiesGlossary, where) : [],
    eggs: w ? parseBlocks(w.eggs, citiesGlossary, where) : [],
    chars: w ? charCount(w.intro) + charCount(w.eggs) : 0,
  })
}

// 节气 hooks for the home banner, tokenized so every word can be tapped
const jieqiGlossary = {}
const jieqi = Object.fromEntries(JIEQI.map((j) => [j.name, makeSentences(j.hook, jieqiGlossary, `jieqi/${j.name}`)]))

if (ambiguous.size) {
  console.log(`\nWords with several readings (add {字|pinyin} if a guess is wrong):`)
  for (const [key, ctx] of ambiguous) {
    const [w, chosen] = key.split('|')
    console.log(`  ${w} → ${chosen}  (${readings(w, lookup).map(numericToMarks).join(' / ')})  ${ctx[0]}`)
  }
}
if (errors.length) {
  console.error(`\n${errors.length} content error(s):\n  ${errors.join('\n  ')}`)
  process.exit(1)
}
// ---------- Photos (fetched by `npm run images`; who took them and their licences are in images.lock.json) ----------
const photos = {}
if (existsSync('content/images.lock.json')) {
  const lock = JSON.parse(await readFile('content/images.lock.json', 'utf8'))
  // ?v= changes when a different photo is chosen, so the app's photo cache (kept forever) picks it up
  const v = (file) => createHash('md5').update(file).digest('hex').slice(0, 8)
  const entry = (e) => e?.file && existsSync(`public/img/${e.key}.jpg`) && { src: `img/${e.key}.jpg?v=${v(e.file)}`, w: e.w, h: e.h, by: e.artist, lic: e.license, page: e.page }
  for (const [key, e] of Object.entries(lock)) {
    // "=place/beijing": the city 北京 shows the province's photo
    const target = e.spec?.startsWith('=') ? e.spec.slice(1) : key
    const p = entry({ ...lock[target], key: target })
    if (p) photos[key] = p
  }
}

if (!CHECK) {
  await mkdir('public/content/series', { recursive: true })
  await mkdir('public/content/texts', { recursive: true })
  for (const { file } of seriesOut) await writeFile(`public/content/series/${file.id}.json`, JSON.stringify(file))
  for (const t of textOut) await writeFile(`public/content/texts/${t.id}.json`, JSON.stringify(t))
  const index = {
    series: seriesOut.map((s) => s.summary),
    texts: textOut.map(({ id, title, author, year, from, chars, sittings }) => ({ id, title, author, year, from, chars, sittings })),
    // small summary so the tab bar can show a dot for new cards without loading feed.json
    feed: feed.map(({ id, date, province, series }) => ({ id, date, province, series })),
  }
  await writeFile('public/content/index.json', JSON.stringify(index))
  await writeFile('public/content/terms.json', JSON.stringify(terms))
  await writeFile('public/content/jieqi.json', JSON.stringify({ hooks: jieqi, glossary: jieqiGlossary }))
  await writeFile('public/content/places.json', JSON.stringify({ places, glossary: placesGlossary }))
  await writeFile('public/content/feed.json', JSON.stringify({ cards: feed, glossary: feedGlossary }))
  await writeFile('public/content/cities.json', JSON.stringify({ cities, glossary: citiesGlossary }))
  await writeFile('public/content/photos.json', JSON.stringify(photos))
}
console.log(`\n${seriesOut.length} series, ${textOut.length} texts, ${places.length} places, ${written.size}/${cities.length} city pages, ${feed.length} feed cards ${CHECK ? 'checked' : 'built'}.`)
