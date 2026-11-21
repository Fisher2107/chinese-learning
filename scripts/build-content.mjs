// Builds the reading content into JSON for the app.
//   content/series/<id>/index.md     series info + description
//   content/series/<id>/NN.md        one episode each (frontmatter: title, beat, gate)
//   content/series/<id>/after.md     读后: key words, 聊天工具包, 聊天彩蛋…
//   content/texts/<id>.md            public-domain full texts
//   content/terms.yml                names and words the dictionary lacks
// Output: public/content/{index.json, series/<id>.json, texts/<id>.json}
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
if (!CHECK) {
  await mkdir('public/content/series', { recursive: true })
  await mkdir('public/content/texts', { recursive: true })
  for (const { file } of seriesOut) await writeFile(`public/content/series/${file.id}.json`, JSON.stringify(file))
  for (const t of textOut) await writeFile(`public/content/texts/${t.id}.json`, JSON.stringify(t))
  const index = {
    series: seriesOut.map((s) => s.summary),
    texts: textOut.map(({ id, title, author, year, from, chars, sittings }) => ({ id, title, author, year, from, chars, sittings })),
  }
  await writeFile('public/content/index.json', JSON.stringify(index))
  await writeFile('public/content/terms.json', JSON.stringify(terms))
  // 节气 hooks for the home banner, tokenized so every word can be tapped
  const jieqiGlossary = {}
  const jieqi = Object.fromEntries(JIEQI.map((j) => [j.name, makeSentences(j.hook, jieqiGlossary, `jieqi/${j.name}`)]))
  await writeFile('public/content/jieqi.json', JSON.stringify({ hooks: jieqi, glossary: jieqiGlossary }))
}
console.log(`\n${seriesOut.length} series, ${textOut.length} texts ${CHECK ? 'checked' : 'built'}.`)
