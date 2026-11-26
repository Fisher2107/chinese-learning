import { DefaultScheduler, Rating } from 'ts-fsrs'
import { cloudDb, patchRow, progressKey, inCloud, db, type SavedWord, type WordSource } from './db.ts'
import type { Token } from './types.ts'
import { addCoins, bumpDay, recordActivity } from './stats.ts'

type Scheduler = Awaited<ReturnType<typeof DefaultScheduler>>
let scheduler: Promise<Scheduler> | undefined
const getScheduler = () => (scheduler ??= DefaultScheduler())

export const GRADES = [
  { rating: Rating.Again, label: '忘了', color: 'zhu' },
  { rating: Rating.Hard, label: '有点难', color: 'huang' },
  { rating: Rating.Good, label: '记得', color: 'lv' },
  { rating: Rating.Easy, label: '很简单', color: 'dai' },
] as const

type CardLike = { dueAt: Date }

export async function saveWord(input: { word: string; p: string; d: string; sentence: Token[]; source: WordSource }) {
  const existing = await db.words.where('word').equals(input.word).first()
  if (existing) return existing.id!
  const s = await getScheduler()
  const now = new Date()
  const card = s.newCard({ now }) as unknown as CardLike
  const id = await db.words.add({
    ...input,
    // A fresh id for every save: a device that saves a word offline must not overwrite the card
    // another device has been reviewing. mergeDuplicateWords() folds the copies together after a sync.
    ...(inCloud ? { id: progressKey(crypto.randomUUID()) } : {}),
    created: now.getTime(),
    due: card.dueAt.getTime(),
    card: card as unknown as Record<string, unknown>,
  })
  await bumpDay('saved')
  return id
}

/**
 * Two devices that saved the same word offline each have a row for it. Keep the one with the most
 * reviews (then the oldest), move the other rows' reviews and note onto it, and delete them.
 * Every device picks the same row, so running this on several at once is safe.
 */
export async function mergeDuplicateWords() {
  await db.transaction('rw', db.words, db.reviews, async () => {
    const byWord = new Map<string, SavedWord[]>()
    for (const w of await db.words.toArray()) byWord.set(w.word, [...(byWord.get(w.word) ?? []), w])
    for (const rows of byWord.values()) {
      if (rows.length < 2) continue
      const reviews = await db.reviews.where('wordId').anyOf(rows.map((r) => r.id!)).toArray()
      const count = (w: SavedWord) => reviews.filter((r) => r.wordId === w.id).length
      const [keep, ...rest] = rows.sort((a, b) => count(b) - count(a) || a.created - b.created || String(a.id).localeCompare(String(b.id)))
      const note = keep.note ?? rest.find((w) => w.note)?.note
      if (note !== keep.note) await db.words.upsert(keep.id!, { note })
      const restIds = rest.map((w) => w.id!)
      await db.reviews.where('wordId').anyOf(restIds).modify({ wordId: keep.id! })
      await db.words.bulkDelete(restIds)
    }
  })
}

/** In the cloud profile, merge copies of a word after every sync. */
export function watchDuplicateWords() {
  if (!inCloud || !cloudDb) return
  cloudDb.cloud.syncState.subscribe((s) => {
    if (s.phase === 'in-sync') mergeDuplicateWords().catch((e) => console.warn('合并生词失败', e))
  })
}

export async function unsaveWord(word: string) {
  const rows = await db.words.where('word').equals(word).toArray()
  await db.words.bulkDelete(rows.map((r) => r.id!))
  await db.reviews.where('wordId').anyOf(rows.map((r) => r.id!)).delete()
}

/** A fresh flashcard, due now. */
export async function newCard(): Promise<{ card: Record<string, unknown>; due: number }> {
  const s = await getScheduler()
  const card = s.newCard({ now: new Date() }) as unknown as CardLike
  return { card: card as unknown as Record<string, unknown>, due: card.dueAt.getTime() }
}

/** The card after answering it with `rating`. */
export async function reviewCard(card: Record<string, unknown>, rating: Rating): Promise<{ card: Record<string, unknown>; due: number }> {
  const s = await getScheduler()
  const { card: next } = s.review({ card: reviveCard(card), grade: rating as never, now: new Date() }) as unknown as { card: CardLike }
  return { card: next as unknown as Record<string, unknown>, due: next.dueAt.getTime() }
}

/** Human-readable next interval for each grade, for any card. */
export async function previewCard(card: Record<string, unknown>): Promise<string[]> {
  const s = await getScheduler()
  const now = new Date()
  const out: string[] = []
  for (const item of s.preview({ card: reviveCard(card), now }) as Iterable<{ card: CardLike }>) {
    out.push(formatInterval(item.card.dueAt.getTime() - now.getTime()))
  }
  return out
}

/** Cards due now, oldest first. */
export function dueWords(limit = 50) {
  return db.words.where('due').belowOrEqual(Date.now()).limit(limit).toArray()
}

/** Human-readable next interval for each grade, e.g. "1分钟", "4天". */
export function previewIntervals(word: SavedWord): Promise<string[]> {
  return previewCard(word.card)
}

export async function grade(word: SavedWord, rating: Rating) {
  const s = await getScheduler()
  const now = new Date()
  const { card } = s.review({ card: reviveCard(word.card), grade: rating as never, now }) as unknown as { card: CardLike }
  await db.transaction('rw', db.words, db.reviews, async () => {
    const updated = await patchRow(db.words, word.id!, { card: card as unknown as Record<string, unknown>, due: card.dueAt.getTime() })
    // Private (#) ids belong to this account, so a backup restored into another account can't clash with them
    if (updated) await db.reviews.add({ ...(inCloud ? { id: progressKey(crypto.randomUUID()) } : {}), wordId: word.id!, rating, at: now.getTime() })
  })
  if (rating !== Rating.Again) await addCoins(2)
  await bumpDay('reviews')
  await recordActivity()
}

/** IndexedDB keeps Dates, but backups go through JSON, so turn date strings back into Dates. */
export function reviveCard(card: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...card }
  for (const k of ['dueAt', 'lastReviewAt']) {
    const v = out[k]
    if (typeof v === 'string' || typeof v === 'number') out[k] = new Date(v)
  }
  return out as never
}

export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min}分钟`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}小时`
  const d = Math.round(h / 24)
  if (d < 31) return `${d}天`
  const m = Math.round(d / 30)
  if (m < 12) return `${m}个月`
  return `${(d / 365).toFixed(1)}年`
}
