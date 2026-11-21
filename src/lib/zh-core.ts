// Shared Chinese text engine: sentence splitting, word segmentation, pinyin and
// glosses. Used by scripts/build-content.mjs (Node) and by the app at runtime.
import { pinyin as pinyinPro } from 'pinyin-pro'

export type DictEntry = [pinyinNumeric: string, defs: string]
export type Term = { p: string; d: string }

export interface Lookup {
  entries(word: string): DictEntry[] | undefined
  term(word: string): Term | undefined
  hsk(word: string): number | undefined
}

/** One word (or punctuation run) of a sentence. */
export interface Token {
  /** the text */
  t: string
  /** pinyin with tone marks (Chinese words only) */
  p?: string
  /** HSK level 1–7; absent if the word isn't in the HSK lists */
  l?: number
}

export interface Sentence {
  tokens: Token[]
}

const HAN = /[\u3400-\u9fff\uf900-\ufaff]/
export const isHan = (s: string) => HAN.test(s)

const TONE_MARKS: Record<string, string[]> = {
  a: ['ā', 'á', 'ǎ', 'à', 'a'],
  e: ['ē', 'é', 'ě', 'è', 'e'],
  i: ['ī', 'í', 'ǐ', 'ì', 'i'],
  o: ['ō', 'ó', 'ǒ', 'ò', 'o'],
  u: ['ū', 'ú', 'ǔ', 'ù', 'u'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ', 'ü'],
}

/** "nu:3" / "nü3" → "nǚ" */
function syllableToMarks(syl: string): string {
  const m = syl.match(/^([a-zü:]+)([1-5])$/i)
  if (!m) return syl
  let [, base, toneStr] = m
  base = base.replace(/u:/gi, 'ü').toLowerCase()
  const tone = Number(toneStr) - 1
  // Tone-mark placement: a/e first, then the o in "ou", else the last vowel
  let idx = base.search(/[ae]/)
  if (idx < 0) idx = base.indexOf('ou')
  if (idx < 0) {
    const vowels = [...base].map((c, i) => ('iouü'.includes(c) ? i : -1)).filter((i) => i >= 0)
    idx = vowels.length ? vowels[vowels.length - 1] : -1
  }
  if (idx < 0) return base
  const v = base[idx]
  return base.slice(0, idx) + TONE_MARKS[v][tone] + base.slice(idx + 1)
}

/** "zhang3 de5" → "zhǎngde" */
export function numericToMarks(numeric: string): string {
  return numeric
    .split(/\s+/)
    .map(syllableToMarks)
    // 临安 → lín'ān: an apostrophe before a syllable starting with a, o or e
    .map((syl, i) => (i > 0 && /^[aāáǎàoōóǒòeēéěè]/i.test(syl) ? `'${syl}` : syl))
    .join('')
}

const SENTENCE_END = /([。！？；…]+[”’」』）)]*)/

/** Splits a paragraph into sentences, keeping end punctuation and closing quotes. */
export function splitSentences(paragraph: string): string[] {
  const parts = paragraph.split(SENTENCE_END)
  const out: string[] = []
  for (let i = 0; i < parts.length; i += 2) {
    const s = (parts[i] ?? '') + (parts[i + 1] ?? '')
    if (s.trim()) out.push(s)
  }
  return out
}

const MAX_WORD = 6
let segmenter: Intl.Segmenter | undefined

function known(word: string, lookup: Lookup) {
  return Boolean(lookup.term(word) || lookup.entries(word))
}

/** Forward maximum matching inside a run the ICU segmenter didn't recognise. */
function maxMatch(run: string, lookup: Lookup): string[] {
  const out: string[] = []
  let i = 0
  while (i < run.length) {
    let len = Math.min(MAX_WORD, run.length - i)
    while (len > 1 && !known(run.slice(i, i + len), lookup)) len--
    out.push(run.slice(i, i + len))
    i += len
  }
  return out
}

/** Splits text into words: ICU segmentation, cleaned up against the dictionary and custom terms. */
export function segmentWords(text: string, lookup: Lookup): string[] {
  segmenter ??= new Intl.Segmenter('zh', { granularity: 'word' })
  const pieces: string[] = []
  for (const { segment } of segmenter.segment(text)) {
    if (!isHan(segment) || known(segment, lookup)) pieces.push(segment)
    else pieces.push(...maxMatch(segment, lookup))
  }
  // Merge adjacent pieces that form a custom term (names like 胖东来, 许宣)
  const merged: string[] = []
  for (let i = 0; i < pieces.length; ) {
    let took = 1
    for (let n = Math.min(4, pieces.length - i); n > 1; n--) {
      const joined = pieces.slice(i, i + n).join('')
      if (joined.length <= MAX_WORD && lookup.term(joined)) {
        took = n
        break
      }
    }
    // 儿化: 一点 + 儿 → 一点儿, 哪 + 儿 → 哪儿
    if (took === 1 && pieces[i + 1] === '儿' && isHan(pieces[i]) && lookup.entries(pieces[i] + '儿')) took = 2
    // ICU sometimes splits longer dictionary words: 兵马 + 俑 → 兵马俑
    if (took === 1 && i + 1 < pieces.length && isHan(pieces[i]) && isHan(pieces[i + 1])) {
      const joined = pieces[i] + pieces[i + 1]
      if (joined.length >= 3 && joined.length <= 4 && lookup.entries(joined) && !SPLIT[joined]) took = 2
    }
    merged.push(pieces.slice(i, i + took).join(''))
    i += took
  }
  return merged
}

/** Distinct readings of a word in the dictionary, most useful first. */
export function readings(word: string, lookup: Lookup): string[] {
  const entries = lookup.entries(word) ?? []
  const seen = new Map<string, string>()
  for (const [p, defs] of entries) {
    const key = p.toLowerCase()
    if (/^surname /.test(defs) && entries.length > 1) continue
    if (/^used in /.test(defs)) continue
    if (!seen.has(key)) seen.set(key, p)
  }
  return [...seen.values()]
}

/** Dictionary words that are almost always two words in running text (快到了 = 到 + 了). */
const SPLIT: Record<string, string[]> = { 到了: ['到', '了'], 好了: ['好', '了'], 完了: ['完', '了'], 一个人: ['一个', '人'] }

const COUNTING = /[一二两三四五六七八九十几这那哪每各某多半整]$/
const PRONOUN = /^(我|你|他|她|它|我们|你们|他们|她们|咱们)$/

/**
 * Readings for very common characters whose sound depends on grammar,
 * where pinyin-pro is often wrong. prev/next are the neighbouring tokens.
 */
function grammarReading(word: string, prev: string, next: string): string | undefined {
  switch (word) {
    case '了':
      return 'le'
    case '着':
      return 'zhe'
    case '地':
      return isHan(prev) && prev.length >= 2 ? 'de' : undefined
    case '得':
      return isHan(prev) && !PRONOUN.test(prev) && !/[要会能]$/.test(prev) ? 'de' : undefined
    case '只':
      return COUNTING.test(prev) ? 'zhī' : 'zhǐ'
    case '种':
      if (COUNTING.test(prev) || prev === '什么') return 'zhǒng'
      return isHan(next) ? 'zhòng' : undefined
  }
  return undefined
}

export interface Neighbours {
  /** pinyin-pro's reading of this word in the context of its sentence (tone marks, no sandhi) */
  context?: string
  prev?: string
  next?: string
}

/** Picks the pinyin for a word, preferring the dictionary and using context to break ties. */
export function pinyinFor(word: string, lookup: Lookup, around: Neighbours = {}): { p: string; ambiguous: boolean } {
  const term = lookup.term(word)
  if (term) return { p: term.p, ambiguous: false }
  const options = readings(word, lookup).map((o) => numericToMarks(o).toLowerCase())
  if (options.length === 1) return { p: options[0], ambiguous: false }
  const rule = grammarReading(word, around.prev ?? '', around.next ?? '')
  if (rule) return { p: rule, ambiguous: false }
  const guess = around.context || pinyinPro(word, { type: 'array', toneSandhi: false }).join('')
  if (options.length > 1) return { p: options.find((o) => o.replace(/'/g, '') === guess) ?? options[0], ambiguous: true }
  return { p: guess, ambiguous: false }
}

/** Short English gloss for a word as read with the given pinyin. */
export function glossFor(word: string, p: string, lookup: Lookup): string {
  const term = lookup.term(word)
  if (term) return term.d
  const entries = lookup.entries(word) ?? []
  const matching = entries.filter(([num]) => numericToMarks(num).toLowerCase() === p)
  const pool = (matching.length ? matching : entries).filter(([, d]) => !/^surname /.test(d))
  const defs = (pool.length ? pool : entries).flatMap(([, d]) => d.split('/'))
  return [...new Set(defs)].slice(0, 3).join('; ')
}

/**
 * HSK level of a word. Words outside the lists (compounds, names) get the level of their
 * hardest character, so 胖东来 counts as easy but 角黄素 doesn't. 7 means HSK 7–9.
 */
export function levelOf(word: string, lookup: Lookup): number | undefined {
  const l = lookup.hsk(word)
  if (l) return l
  let max = 0
  for (const ch of word) {
    const c = lookup.hsk(ch)
    if (!c) return undefined
    max = Math.max(max, c)
  }
  return max || undefined
}

export interface TokenizeResult {
  tokens: Token[]
  /** single characters with several possible readings, for review at build time */
  ambiguous: string[]
}

/**
 * Turns one sentence into tokens. Inline overrides:
 *   {假|jià}  forces a reading for one word
 */
export function tokenizeSentence(sentence: string, lookup: Lookup): TokenizeResult {
  // 1. words, with forced readings kept aside
  const words: { t: string; forced?: string }[] = []
  for (const part of sentence.split(/(\{[^}|]+\|[^}]+\})/)) {
    if (!part) continue
    const forced = part.match(/^\{([^}|]+)\|([^}]+)\}$/)
    if (forced) words.push({ t: forced[1], forced: forced[2].replace(/\s+/g, '') })
    else for (const t of segmentWords(part, lookup)) for (const piece of SPLIT[t] ?? [t]) words.push({ t: piece })
  }
  // 2. pinyin-pro reads the whole sentence once, so it can use context
  const plain = words.map((w) => w.t).join('')
  const chars = pinyinPro(plain, { type: 'all', toneSandhi: false }) as { origin: string; pinyin: string }[]
  const aligned = chars.length === plain.length
  // 3. tokens
  const tokens: Token[] = []
  const ambiguous: string[] = []
  let at = 0
  words.forEach((w, i) => {
    const from = at
    at += w.t.length
    if (w.forced) {
      tokens.push({ t: w.t, p: w.forced, l: levelOf(w.t, lookup) })
      return
    }
    if (!isHan(w.t)) {
      tokens.push({ t: w.t })
      return
    }
    const context = aligned ? chars.slice(from, at).map((c) => c.pinyin).join('') : undefined
    const { p, ambiguous: amb } = pinyinFor(w.t, lookup, { context, prev: words[i - 1]?.t, next: words[i + 1]?.t })
    if (amb) ambiguous.push(w.t)
    const l = levelOf(w.t, lookup)
    tokens.push(l ? { t: w.t, p, l } : { t: w.t, p })
  })
  return { tokens, ambiguous }
}

/** Removes override markup, leaving plain text. */
export function plainText(s: string): string {
  return s.replace(/\{([^}|]+)\|[^}]+\}/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1')
}
