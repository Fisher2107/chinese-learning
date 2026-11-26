import type { Rating } from 'ts-fsrs'
import { db, keyed, patchRow, progressKey, type EggNote } from './db.ts'
import { newCard, reviewCard } from './srs.ts'
import { addCoins, bumpDay, recordActivity } from './stats.ts'
import type { CitiesFile, DialectFile, Egg, PlacesFile, Sentence, SourceLink } from './types.ts'

/**
 * Where eggs live: place/<id> and city/<id> are 聊天彩蛋 on those pages; hometown/<id> is a province's
 * 家乡话 in the 家乡话与地方梗 collection.
 */
export const isHometown = (page: string) => page.startsWith('hometown/')

/** The app route that shows an egg's page. */
export const eggRoute = (page: string) => (isHometown(page) ? `collection/${page}` : page)

/** What eggs on that page are called. */
export const eggLabel = (page: string) => (isHometown(page) ? '家乡话' : '聊天彩蛋')

/** A 聊天彩蛋 as the user sees it: the content's egg with their changes, or one they wrote. */
export interface EggView {
  key: string
  page: string
  title: string
  text: string
  q: string
  find: string
  /** the content's tokenized text; missing once the user has changed the text (it's tokenized on the fly) */
  sentences?: Sentence[]
  note?: string
  mine: boolean
  /** a content egg the user changed */
  edited: boolean
  /** has a flashcard */
  card: boolean
  due?: number
  /** where the content's egg comes from */
  sources?: SourceLink[]
  /** the content's version, for 还原 */
  base?: Egg
}

/** Content eggs with the user's changes, then eggs the user wrote (and old ones whose content is gone). */
export function mergeEggs(page: string, title: string, eggs: Egg[], rows: EggNote[]): EggView[] {
  const mine = rows.filter((r) => r.page === page)
  const byKey = new Map(mine.map((r) => [r.key, r]))
  const out: EggView[] = eggs.map((e) => {
    const r = byKey.get(e.id)
    const text = r?.text ?? e.text
    return {
      key: e.id,
      page,
      title,
      text,
      q: r?.q ?? e.q,
      find: r?.find ?? e.find,
      sentences: text === e.text ? e.sentences : undefined,
      note: r?.note,
      mine: false,
      edited: (r?.text !== undefined && r.text !== e.text) || (r?.q !== undefined && r.q !== e.q),
      card: !!r?.card,
      due: r?.due,
      sources: e.sources,
      base: e,
    }
  })
  const known = new Set(eggs.map((e) => e.id))
  for (const r of mine.sort((a, b) => a.created - b.created)) {
    if (known.has(r.key)) continue
    const text = r.text ?? r.was?.text ?? ''
    if (!text) continue
    out.push({
      key: r.key,
      page,
      title,
      text,
      q: r.q ?? r.was?.q ?? '',
      find: r.find ?? title,
      note: r.note,
      mine: true,
      edited: false,
      card: !!r.card,
      due: r.due,
    })
  }
  return out
}

const now = () => Date.now()

async function upsert(egg: Pick<EggView, 'key' | 'page' | 'title' | 'text' | 'q'>, patch: Partial<EggNote>) {
  await db.transaction('rw', db.eggs, async () => {
    const row = await db.eggs.get(progressKey(egg.key))
    // upsert, not update: Dexie Cloud would send update() on a # id as the whole row
    if (row) await db.eggs.upsert(progressKey(egg.key), { ...patch, updated: now() })
    else
      await db.eggs.put(keyed({
        key: egg.key,
        page: egg.page,
        title: egg.title,
        was: { text: egg.text, q: egg.q },
        created: now(),
        updated: now(),
        ...patch,
      }))
  })
}

/** Saves the user's version of an egg. For a content egg, matching the original clears the change. */
export function editEgg(egg: EggView, text: string, q: string) {
  text = text.trim()
  q = q.trim()
  if (egg.mine) return upsert(egg, { text, q, was: { text, q } })
  return upsert(egg, {
    text: egg.base && text === egg.base.text ? undefined : text,
    q: egg.base && q === egg.base.q ? undefined : q,
    was: { text, q },
  })
}

/** Back to the content's version. */
export function resetEgg(egg: EggView) {
  if (!egg.base) return
  return upsert(egg, { text: undefined, q: undefined, was: { text: egg.base.text, q: egg.base.q } })
}

export function saveEggNote(egg: EggView, note: string) {
  return upsert(egg, { note: note.trim() || undefined })
}

export function saveEggFind(egg: EggView, find: string) {
  find = find.trim()
  return upsert(egg, { find: !find || find === egg.base?.find ? undefined : find })
}

/** Turns the egg into a flashcard, due now. */
export async function addEggCard(egg: EggView) {
  const { card, due } = await newCard()
  await upsert(egg, { card, due, was: { text: egg.text, q: egg.q } })
}

export async function addEggCards(eggs: EggView[]) {
  for (const e of eggs) if (!e.card) await addEggCard(e)
}

export async function removeEggCard(egg: EggView) {
  const row = await db.eggs.get(progressKey(egg.key))
  if (!row) return
  // Nothing else of the user's on it: forget the row
  if (!row.mine && row.text === undefined && row.q === undefined && !row.note && !row.find) await db.eggs.delete(progressKey(egg.key))
  else await patchRow(db.eggs, progressKey(egg.key), { card: undefined, due: undefined, updated: now() })
}

/** A 聊天彩蛋 the user wrote. */
export async function addMyEgg(page: string, title: string, text: string, q: string, note: string, flashcard: boolean) {
  text = text.trim()
  q = q.trim()
  const key = `mine:${page}:${crypto.randomUUID()}`
  const card = flashcard ? await newCard() : undefined
  await db.eggs.put(keyed({
    key,
    page,
    title,
    mine: true,
    text,
    q,
    note: note.trim() || undefined,
    was: { text, q },
    ...card,
    created: now(),
    updated: now(),
  }))
  return key
}

export function deleteEgg(key: string) {
  return db.eggs.delete(progressKey(key))
}

/** Egg flashcards due now, oldest first. */
export function dueEggs(limit = 50) {
  return db.eggs.where('due').belowOrEqual(Date.now()).limit(limit).toArray()
}

/** Answers an egg's flashcard; returns the row as it is now (so a 忘了 card comes back up to date). */
export async function gradeEgg(row: EggNote, rating: Rating): Promise<EggNote> {
  const fresh = (await db.eggs.get(progressKey(row.key))) ?? row
  const { card, due } = await reviewCard(fresh.card!, rating)
  const next = { ...fresh, card, due, updated: now() }
  await patchRow(db.eggs, progressKey(row.key), { card, due, updated: next.updated })
  if (rating !== 1) await addCoins(2)
  await bumpDay('reviews')
  await recordActivity()
  return next
}

/** The egg behind a flashcard: today's content (with the user's changes) or what was saved. */
export function eggForCard(row: EggNote, places?: PlacesFile, cities?: CitiesFile, dialect?: DialectFile): EggView {
  const [kind, id] = row.page.split('/')
  const eggs =
    (kind === 'place'
      ? places?.places.find((p) => p.id === id)?.eggs
      : kind === 'hometown'
        ? dialect?.provinces[id]
        : cities?.cities.find((c) => c.id === id)?.eggs) ?? []
  return mergeEggs(row.page, row.title, eggs, [row]).find((e) => e.key === row.key) ?? {
    key: row.key,
    page: row.page,
    title: row.title,
    text: row.text ?? row.was?.text ?? '',
    q: row.q ?? row.was?.q ?? '',
    find: row.find ?? row.title,
    note: row.note,
    mine: !!row.mine,
    edited: false,
    card: !!row.card,
    due: row.due,
  }
}

/** Where to look an egg up. `term` is a name or phrase; the web search gets the question too. */
export function searchLinks(term: string, q: string) {
  const t = encodeURIComponent(term)
  const full = encodeURIComponent(`${term} ${q}`.trim())
  return [
    { label: '百度百科', url: `https://baike.baidu.com/search/word?word=${t}` },
    { label: '维基百科', url: `https://zh.wikipedia.org/w/index.php?search=${t}` },
    { label: '百度', url: `https://www.baidu.com/s?wd=${full}` },
    { label: 'B站视频', url: `https://search.bilibili.com/all?keyword=${t}` },
    { label: '小红书', url: `https://www.xiaohongshu.com/search_result?keyword=${t}` },
    { label: 'Google', url: `https://www.google.com/search?q=${full}` },
  ]
}
