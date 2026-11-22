// Builds the reading content into JSON for the app.
//   content/series/<id>/index.md     series info + description
//   content/series/<id>/NN.md        one episode each (frontmatter: title, beat, gate)
//   content/series/<id>/after.md     读后: key words, 聊天工具包, 聊天彩蛋…
//   content/texts/<id>.md            public-domain full texts
//   content/terms.yml                names and words the dictionary lacks
//   content/places/<id>.md           one page per province: intro, then ## 聊天彩蛋 bullets (each with 问： and maybe 查：)
//   content/feed/<slug>.md           刷一刷 cards: title is the hook question, body 150–300 字
//   content/wiki/<id>.md             百科: one page per place, person, river, event, legend, dish…
// Output: public/content/{index.json, series/<id>.json, texts/<id>.json, places.json, feed.json,
//         wiki-index.json, wiki/<id>.json}
//
// Markup inside stories:
//   {假|jià}                  force a reading
//   [[钱塘江]] [[苏轼|苏东坡]]   a link, by name or id, to a 百科 page, a province or a city. Names
//                             with no page yet are "wanted": they print at the end of the build
//                             (most-linked first) so the next pages to write are the ones asked for
//   ::原文[text-id#P]         excerpt of paragraph P of a text (1-based)
//   ::原文[text-id#P:a-b]     sentences a..b of paragraph P
//   ## heading / - bullet     headings and list items (used in after.md)
//
// --check: validate only, and fail on errors.
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { parse as parseYaml } from 'yaml'
import { pinyin as pinyinPro } from 'pinyin-pro'
import { geoConicEqualArea } from 'd3-geo'
import { splitSentences, tokenizeSentence, glossFor, isHan, readings, numericToMarks, plainText } from '../src/lib/zh-core.ts'
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

// ---------- links between pages ----------
// Every page that can be linked to, by id and by name: 百科 pages first, then provinces, then cities.
const WIKI_DIR = 'content/wiki'
const wikiRaw = []
for (const file of existsSync(WIKI_DIR) ? (await readdir(WIKI_DIR)).filter((f) => f.endsWith('.md')).sort() : []) {
  const src = await readFile(`${WIKI_DIR}/${file}`, 'utf8')
  wikiRaw.push({ file, ...splitFrontmatter(src, `wiki/${file}`) })
}
const routeOf = new Map()
const titleOf = new Map()
const claim = (key, route) => key && !routeOf.has(String(key)) && routeOf.set(String(key), route)
for (const { meta } of wikiRaw) {
  const route = `wiki/${meta.id}`
  titleOf.set(route, meta.name)
  claim(meta.id, route)
  claim(meta.name, route)
  for (const a of meta.aka ?? []) claim(a, route)
  // names stay one word, read the way the page says
  if (meta.name && !terms[meta.name])
    terms[meta.name] = { p: (meta.py ?? pinyinPro(meta.name, { toneSandhi: false })).replace(/\s+/g, ''), d: meta.en ?? '' }
}
for (const file of (await readdir('content/places')).filter((f) => f.endsWith('.md'))) {
  const { meta } = splitFrontmatter(await readFile(`content/places/${file}`, 'utf8'), file)
  titleOf.set(`place/${meta.id}`, meta.name)
  for (const k of [meta.id, meta.name, meta.full]) claim(k, `place/${meta.id}`)
}
for (const c of mapDetail.cities) {
  if (c.kind === 'muni') continue
  titleOf.set(`city/${c.id}`, c.name)
  for (const k of [c.id, c.name, c.full]) claim(k, `city/${c.id}`)
}

/** route → pages linking to it */
const backlinks = new Map()
/** names linked to that have no page yet → the pages asking for them */
const wanted = new Map()
/** the page whose text is being built, so links know where they come from */
let page = { route: '', title: '' }
const onPage = (route, title) => (page = { route, title })

/** [[钱塘江]] / [[苏轼|苏东坡]] / [[qiantangjiang]] → [[wiki/qiantangjiang|钱塘江]], or plain text if there's no page yet. */
function resolveLinks(text, where) {
  return text.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, rawTarget, label) => {
    const target = rawTarget.trim()
    // a route given directly: [[series/baishezhuan|白蛇传]], [[text/lun-leifengta|论雷峰塔的倒掉]]
    const direct = /^(series|text|feed)\/[\w-]+$/.test(target) ? target : undefined
    if (direct) {
      const [kind, rid] = direct.split('/')
      const dir = { series: 'content/series', text: 'content/texts', feed: 'content/feed' }[kind]
      if (!existsSync(kind === 'series' ? `${dir}/${rid}` : `${dir}/${rid}.md`)) errors.push(`${where}: link to missing ${direct}`)
      if (!label) errors.push(`${where}: [[${direct}]] needs a label: [[${direct}|名字]]`)
    }
    const route = direct ?? routeOf.get(target)
    if (!route) {
      if (!isHan(target)) errors.push(`${where}: link to unknown id "${target}"`)
      else if (page.route) {
        const from = wanted.get(target) ?? new Map()
        from.set(page.route, page.title)
        wanted.set(target, from)
      }
      return label ?? target
    }
    if (page.route && route !== page.route) {
      const from = backlinks.get(route) ?? new Map()
      from.set(page.route, page.title)
      backlinks.set(route, from)
    }
    return `[[${route}|${label ?? (isHan(target) ? target : titleOf.get(route))}]]`
  })
}

/** Tokenizes text into sentences, recording glossary entries and ambiguous readings. */
function makeSentences(text, glossary, where, trackAmbiguity = true) {
  text = resolveLinks(String(text), where)
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

/**
 * 聊天彩蛋: one `- ` bullet per egg, then an indented `问：` line (the flashcard question) and,
 * if the egg's first “quoted” words aren't the thing to look up, a `查：` line (search words).
 * `源：[标题](https://…)` lines give where it comes from (any number).
 * Each egg gets an id from its page and its text, so the user's notes and flashcards stay attached.
 */
function parseEggs(src, page, name, glossary, where) {
  const raw = []
  for (const line of src.split('\n')) {
    const l = line.trim()
    if (!l) continue
    if (l.startsWith('- ')) {
      raw.push({ text: l.slice(2).trim(), q: '', find: '', sources: [] })
      continue
    }
    const m = l.match(/^(问|查|源)[:：]\s*(.+)$/)
    if (m && raw.length && m[1] === '源') {
      const link = m[2].trim().match(/^\[(.+)\]\((https?:\/\/[^\s)]+)\)$/)
      if (link) raw.at(-1).sources.push({ title: link[1], url: link[2] })
      else errors.push(`${where}: a source line is "  源：[标题](https://…)" (got "${l}")`)
    } else if (m && raw.length) raw.at(-1)[m[1] === '问' ? 'q' : 'find'] = m[2].trim()
    else errors.push(`${where}: 聊天彩蛋 takes "- 彩蛋" bullets, each followed by "  问：…" and maybe "  查：…" and "  源：[标题](链接)" (got "${l}")`)
  }
  const ids = new Set()
  return raw.map((e, i) => {
    if (!e.q) errors.push(`${where}: 聊天彩蛋 ${i + 1} needs a question line "  问：…" for its flashcard`)
    const id = `${page}#${createHash('md5').update(e.text).digest('hex').slice(0, 8)}`
    if (ids.has(id)) errors.push(`${where}: 聊天彩蛋 ${i + 1} is there twice`)
    ids.add(id)
    return {
      id,
      // shown when editing and sent to AI: without {字|reading} marks or [[links]]
      text: plainText(e.text),
      sentences: makeSentences(e.text, glossary, where),
      q: e.q,
      find: e.find || plainText(e.text).match(/[“《]([^”》]{2,14})[”》]/)?.[1] || name,
      ...(e.sources.length ? { sources: e.sources } : {}),
    }
  })
}
const eggChars = (eggs) => eggs.reduce((n, e) => n + charCount(e.text), 0)

const PALETTE = ['#ED5126', '#2BAE85', '#425066', '#E3A008', '#8E5BB5']

async function buildSeries(id, index) {
  const dir = `content/series/${id}`
  const { meta, body } = splitFrontmatter(await readFile(`${dir}/index.md`, 'utf8'), `${id}/index.md`)
  onPage(`series/${id}`, meta.title)
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
  const [intro, eggSrc = ''] = body.split(/^## 聊天彩蛋\s*$/m)
  const eggs = parseEggs(eggSrc, `place/${meta.id}`, meta.name, placesGlossary, where)
  placeIds.add(meta.id)
  onPage(`place/${meta.id}`, meta.name)
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
    eggs,
    chars: charCount(intro) + eggChars(eggs),
    series: seriesOut.filter((s) => s.summary.provinces.includes(meta.id)).map((s) => s.summary.id),
  })
}
for (const s of seriesOut)
  for (const pid of s.summary.provinces) if (!placeIds.has(pid)) errors.push(`series ${s.summary.id}: unknown province "${pid}"`)

// ---------- 家乡话 (in the 家乡话与地方梗 collection): `## <province id>`, then 聊天彩蛋-style entries ----------
const dialect = {}
const dialectGlossary = {}
if (existsSync('content/dialect.md')) {
  // text before the first heading is a note for whoever edits the file
  const parts = (await readFile('content/dialect.md', 'utf8')).split(/^## +(.+?)\s*$/m)
  for (let i = 1; i < parts.length; i += 2) {
    const id = parts[i]
    const where = `dialect.md ## ${id}`
    const place = places.find((p) => p.id === id)
    if (!place) {
      errors.push(`${where}: "${id}" is not a province id (use the file name in content/places)`)
      continue
    }
    if (dialect[id]) errors.push(`${where}: this province has two sections`)
    onPage(`collection/hometown/${id}`, `${place.name} · 家乡话`)
    dialect[id] = parseEggs(parts[i + 1], `hometown/${id}`, place.name, dialectGlossary, where)
  }
}

// ---------- 刷一刷 feed ----------
const feed = []
const feedGlossary = {}
const cityProvinces = new Map(mapDetail.cities.map(c => [c.id, c.prov]))
const feedDir = 'content/feed'
for (const file of existsSync(feedDir) ? (await readdir(feedDir)).filter((f) => f.endsWith('.md')).sort() : []) {
  const where = `feed/${file}`
  const { meta, body } = splitFrontmatter(await readFile(`${feedDir}/${file}`, 'utf8'), where)
  const id = meta.id ?? file.slice(0, -3)
  onPage(`feed/${id}`, String(meta.title ?? id))
  if (!meta.title) errors.push(`${where}: missing title (the hook question)`)
  if (meta.province && !placeIds.has(meta.province)) errors.push(`${where}: unknown province "${meta.province}"`)
  if (meta.city && (!cityProvinces.has(meta.city) || cityProvinces.get(meta.city) !== meta.province)) errors.push(`${where}: city "${meta.city}" must belong to the card's province`)
  if (meta.series && !seriesIds.includes(meta.series)) errors.push(`${where}: unknown series "${meta.series}"`)
  if (!Array.isArray(meta.sources) || meta.sources.length === 0) errors.push(`${where}: needs at least one source`)
  const chars = charCount(body)
  if (chars < 100 || chars > 360) errors.push(`${where}: body is ${chars} 字, aim for 150–300`)
  feed.push({
    id,
    date: meta.date ? String(meta.date) : '',
    title: makeSentences(String(meta.title ?? ''), feedGlossary, where),
    province: meta.province ?? '',
    city: meta.city ?? '',
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
  onPage(`city/${c.id}`, c.name)
  cities.push({
    id: c.id,
    nickname: w?.meta.nickname ? String(w.meta.nickname) : '',
    facts: makeSentences(cityFacts(c), citiesGlossary, where),
    intro: w ? parseBlocks(w.intro, citiesGlossary, where) : [],
    eggs: w ? parseEggs(w.eggs, `city/${c.id}`, c.name, citiesGlossary, where) : [],
    chars: w ? charCount(w.intro) + charCount(w.eggs.replace(/^\s*(问|查)[:：].*$/gm, '')) : 0,
  })
}

// ---------- 百科 ----------
// Pages about one thing each: a place, a person, a river, an event, a legend, a dish. Linked from
// stories, provinces and each other, so one page leads to the next.
const WIKI_KINDS = ['景点', '地点', '河流', '山', '湖', '人物', '事件', '朝代', '传说', '美食', '文化', '建筑', '作品', '物产']
const proj = mapDetail.proj && geoConicEqualArea().parallels([25, 47]).rotate([-105, 0]).scale(mapDetail.proj.scale).translate(mapDetail.proj.translate)
const asList = (v) => (v == null ? [] : Array.isArray(v) ? v.map(String) : [String(v)])
const wiki = []
const wikiIndexGlossary = {}
for (const { file, meta, body } of wikiRaw) {
  const where = `wiki/${file}`
  const id = String(meta.id ?? '')
  onPage(`wiki/${id}`, meta.name)
  if (`${id}.md` !== file) errors.push(`${where}: id should match the file name`)
  if (placeIds.has(id) || mapCities.has(id)) errors.push(`${where}: id "${id}" is already a province or city id; pick another`)
  for (const k of ['name', 'kind', 'lede']) if (!meta[k]) errors.push(`${where}: missing ${k}`)
  if (meta.kind && !WIKI_KINDS.includes(meta.kind)) errors.push(`${where}: kind "${meta.kind}" should be one of ${WIKI_KINDS.join(' ')}`)
  const provinces = asList(meta.province)
  for (const p of provinces) if (!placeIds.has(p)) errors.push(`${where}: unknown province "${p}"`)
  const cityIds = asList(meta.city)
  for (const c of cityIds) if (!mapCities.has(c)) errors.push(`${where}: unknown city "${c}"`)
  let xy
  if (meta.at) {
    if (!Array.isArray(meta.at) || meta.at.length !== 2 || !proj) errors.push(`${where}: at should be [lon, lat]`)
    else xy = proj(meta.at).map((n) => Math.round(n * 10) / 10)
  }
  if (meta.river && !mapDetail.rivers.some((r) => r.zh === meta.river)) errors.push(`${where}: no river "${meta.river}" on the map`)
  if (!Array.isArray(meta.sources) || !meta.sources.length) errors.push(`${where}: needs at least one source`)
  const glossary = {}
  const quiz = (meta.quiz ?? []).map((q, i) => {
    if (!q.q || !Array.isArray(q.options) || q.options.length < 2 || !(q.answer >= 0 && q.answer < q.options.length) || !q.why)
      errors.push(`${where}: quiz ${i + 1} needs q, options, a valid answer index and why`)
    return { q: plainText(String(q.q)), options: q.options.map((o) => plainText(String(o))), answer: q.answer, why: plainText(String(q.why ?? '')), photo: q.photo ? String(q.photo) : undefined }
  })
  const next = (meta.next ?? []).map((n, i) => {
    const route = routeOf.get(String(n.to))
    if (!n.hook) errors.push(`${where}: next ${i + 1} needs a hook question`)
    if (!route) {
      if (isHan(String(n.to))) {
        const from = wanted.get(String(n.to)) ?? new Map()
        from.set(page.route, page.title)
        wanted.set(String(n.to), from)
      } else errors.push(`${where}: next → unknown "${n.to}"`)
      return undefined
    }
    return { route, title: titleOf.get(route), hook: makeSentences(String(n.hook), glossary, where) }
  }).filter(Boolean)
  const blocks = parseBlocks(body, glossary, where)
  const chars = charCount(body)
  if (chars < 150) errors.push(`${where}: body is only ${chars} 字; a 百科 page needs real substance`)
  wiki.push({
    id,
    name: meta.name,
    en: meta.en ?? '',
    py: terms[meta.name]?.p ?? '',
    kind: meta.kind,
    dates: meta.dates ? String(meta.dates) : '',
    provinces,
    cities: cityIds,
    xy,
    river: meta.river ?? '',
    lede: makeSentences(meta.lede ?? '', glossary, where),
    ledeIndex: makeSentences(meta.lede ?? '', wikiIndexGlossary, where),
    facts: (meta.facts ?? []).map(([k, v]) => ({ k: String(k), v: makeSentences(String(v), glossary, where) })),
    body: blocks,
    next,
    quiz,
    sources: meta.sources ?? [],
    chars,
    glossary,
  })
}

// 节气 hooks for the home banner, tokenized so every word can be tapped
onPage('', '')
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
// Historical maps are dated snapshots. Keep event descriptions tappable like the rest of the reader.
const periods = JSON.parse(await readFile('src/data/history-periods.json', 'utf8'))
const historyMedia = JSON.parse(await readFile('src/data/history-media.json', 'utf8'))
const historyGlossary = {}
const ranks = new Set()
for (const [id, image] of Object.entries(historyMedia)) {
  if (!image.caption || !image.creator || !image.license || !image.sourceUrl) throw new Error(`Missing historical image credit: ${id}`)
  const bytes = await readFile(`public/${image.src}`)
  image.src += '?v=' + createHash('sha256').update(bytes).digest('hex').slice(0, 10)
}
for (const period of periods) {
  if (!historyMedia['map-' + period.id] || !period.events.length) throw new Error(`Missing map or events: ${period.id}`)
  onPage(`map/history/${period.id}`, `历史地图 · ${period.title}`)
  const paragraph = text => [{ kind: 'p', sentences: makeSentences(text, historyGlossary, 'atlas/' + period.id) }]
  period.overview = paragraph(period.overview)
  for (const event of period.events) {
    if (!event.sources.length || !event.figures.length) throw new Error(`Missing event sources or figures: ${event.title}`)
    for (const figure of event.figures) if (!historyMedia[figure.id]) throw new Error(`Missing historical image: ${figure.id}`)
    if (event.rank !== undefined) {
      if (!event.hook || ranks.has(event.rank)) throw new Error(`Invalid conversation pick: ${event.title}`)
      ranks.add(event.rank)
    }
    event.story = paragraph(event.story)
  }
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

// pages asking for a 百科 page that doesn't exist yet, most-asked first
const wantedList = [...wanted].map(([name, from]) => ({ name, from: [...from.values()] })).sort((a, b) => b.from.length - a.from.length || a.name.localeCompare(b.name, 'zh'))
if (wantedList.length) {
  console.log(`\n百科 pages people link to that don't exist yet (${wantedList.length}), most wanted first:`)
  for (const w of wantedList.slice(0, 25)) console.log(`  ${w.name} ← ${w.from.slice(0, 4).join('、')}${w.from.length > 4 ? ` …+${w.from.length - 4}` : ''}`)
}

if (!CHECK) {
  await mkdir('public/content/wiki', { recursive: true })
  const linksTo = (route) => [...(backlinks.get(route) ?? new Map())].map(([r, title]) => ({ route: r, title }))
  for (const w of wiki) {
    const { ledeIndex, ...rest } = w
    await writeFile(`public/content/wiki/${w.id}.json`, JSON.stringify({ ...rest, backlinks: linksTo(`wiki/${w.id}`) }))
  }
  await writeFile(
    'public/content/wiki-index.json',
    JSON.stringify({
      pages: wiki.map((w) => ({ id: w.id, name: w.name, en: w.en, py: w.py, kind: w.kind, dates: w.dates, provinces: w.provinces, cities: w.cities, xy: w.xy, river: w.river, lede: w.ledeIndex, chars: w.chars, links: (backlinks.get(`wiki/${w.id}`)?.size ?? 0) })),
      quiz: Object.fromEntries(wiki.filter((w) => w.quiz.length).map((w) => [w.id, w.quiz])),
      wanted: wantedList,
      glossary: wikiIndexGlossary,
    }),
  )
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
  await writeFile('public/content/history.json', JSON.stringify({ periods, media: historyMedia, glossary: historyGlossary }))
  await writeFile('public/content/terms.json', JSON.stringify(terms))
  await writeFile('public/content/jieqi.json', JSON.stringify({ hooks: jieqi, glossary: jieqiGlossary }))
  await writeFile('public/content/places.json', JSON.stringify({ places, glossary: placesGlossary }))
  await writeFile('public/content/dialect.json', JSON.stringify({ provinces: dialect, glossary: dialectGlossary }))
  await writeFile('public/content/feed.json', JSON.stringify({ cards: feed, glossary: feedGlossary }))
  await writeFile('public/content/cities.json', JSON.stringify({ cities, glossary: citiesGlossary }))
  await writeFile('public/content/photos.json', JSON.stringify(photos))
}
console.log(`\n${seriesOut.length} series, ${textOut.length} texts, ${places.length} places, ${written.size}/${cities.length} city pages, ${feed.length} feed cards, ${wiki.length} 百科 pages (${wanted.size} wanted) ${CHECK ? 'checked' : 'built'}.`)
