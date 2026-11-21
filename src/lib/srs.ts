import { DefaultScheduler, Rating } from 'ts-fsrs'
import { db, type SavedWord, type WordSource } from './db.ts'
import type { Token } from './types.ts'
import { addCoins, recordActivity } from './stats.ts'

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
  return db.words.add({
    ...input,
    created: now.getTime(),
    due: card.dueAt.getTime(),
    card: card as unknown as Record<string, unknown>,
  })
}

export async function unsaveWord(word: string) {
  const rows = await db.words.where('word').equals(word).toArray()
  await db.words.bulkDelete(rows.map((r) => r.id!))
  await db.reviews.where('wordId').anyOf(rows.map((r) => r.id!)).delete()
}

/** Cards due now, oldest first. */
export function dueWords(limit = 50) {
  return db.words.where('due').belowOrEqual(Date.now()).limit(limit).toArray()
}

/** Human-readable next interval for each grade, e.g. "1分钟", "4天". */
export async function previewIntervals(word: SavedWord): Promise<string[]> {
  const s = await getScheduler()
  const now = new Date()
  const out: string[] = []
  for (const item of s.preview({ card: reviveCard(word.card), now }) as Iterable<{ card: CardLike }>) {
    out.push(formatInterval(item.card.dueAt.getTime() - now.getTime()))
  }
  return out
}

export async function grade(word: SavedWord, rating: Rating) {
  const s = await getScheduler()
  const now = new Date()
  const { card } = s.review({ card: reviveCard(word.card), grade: rating as never, now }) as unknown as { card: CardLike }
  await db.words.update(word.id!, { card: card as unknown as Record<string, unknown>, due: card.dueAt.getTime() })
  await db.reviews.add({ wordId: word.id!, rating, at: now.getTime() })
  if (rating !== Rating.Again) await addCoins(2)
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
