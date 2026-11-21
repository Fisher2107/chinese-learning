import type { DictEntry, Lookup, Term } from './zh-core.ts'
import type { Para } from './types.ts'

const BASE = import.meta.env.BASE_URL
let lookup: Promise<Lookup> | undefined

/** The full dictionary (about 9 MB, cached by the service worker). Loaded only when needed. */
export function loadLookup(): Promise<Lookup> {
  lookup ??= (async () => {
    const get = (path: string) => fetch(`${BASE}${path}`).then((r) => r.json())
    const [dict, hsk, terms] = (await Promise.all([get('data/dict.json'), get('data/hsk.json'), get('content/terms.json')])) as [
      Record<string, DictEntry[]>,
      Record<string, number>,
      Record<string, Term>,
    ]
    return { entries: (w) => dict[w], term: (w) => terms[w], hsk: (w) => hsk[w] }
  })()
  lookup.catch(() => (lookup = undefined))
  return lookup
}

const core = () => import('./zh-core.ts')

/** Splits pasted or generated text into paragraphs of tokenized sentences. */
export async function tokenizeText(text: string): Promise<Para[]> {
  const [{ splitSentences, tokenizeSentence }, lk] = await Promise.all([core(), loadLookup()])
  return text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => ({
      kind: 'p' as const,
      sentences: splitSentences(line).map((s) => ({ tokens: tokenizeSentence(s, lk).tokens })),
    }))
}

/** English gloss for a word read as `p`, from the dictionary. */
export async function lookupGloss(word: string, p: string): Promise<string> {
  const [{ glossFor }, lk] = await Promise.all([core(), loadLookup()])
  return glossFor(word, p, lk)
}

export function countHan(text: string) {
  return (text.match(/[㐀-鿿]/g) ?? []).length
}
