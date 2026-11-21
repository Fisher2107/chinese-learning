import { db, type FeedSeen, type SavedWord } from './db.ts'
import { shortQuestion, type QuizQuestion } from './places.ts'
import { addChars, addCoins, bumpDay, recordActivity } from './stats.ts'
import type { FeedCard, Place } from './types.ts'

export type FeedItem =
  | { kind: 'card'; card: FeedCard }
  | { kind: 'review'; word: SavedWord }
  | { kind: 'quiz'; place: Place; q: QuizQuestion }
  | { kind: 'end' }

/** About this many story cards per session; the daily updater adds new ones. */
export const SESSION_CARDS = 30

/**
 * Orders cards by what the user seems to like: time spent on cards with the same tags or
 * province, likes and reads. Cards never shown before come first, cards about provinces they've
 * read about get a small boost, newer cards a bigger one, and some randomness keeps it fresh.
 */
export function rankCards(cards: FeedCard[], seen: FeedSeen[], explored: Set<string>): FeedCard[] {
  const byId = new Map(cards.map((c) => [c.id, c]))
  const weight = new Map<string, number>()
  const add = (k: string, v: number) => weight.set(k, (weight.get(k) ?? 0) + v)
  for (const s of seen) {
    const c = byId.get(s.id)
    if (!c) continue
    const v = (s.liked ? 2 : 0) + (s.read ? 1 : 0) + (s.dwell > 12000 ? 1 : s.dwell < 2500 ? -0.5 : 0.3)
    for (const t of c.tags) add(t, v)
    if (c.province) add(`@${c.province}`, v)
  }
  const newest = cards.reduce((m, c) => (c.date > m ? c.date : m), '')
  const shown = new Set(seen.map((s) => s.id))
  const score = (c: FeedCard) =>
    (shown.has(c.id) ? 0 : 2) +
    c.tags.reduce((a, t) => a + (weight.get(t) ?? 0), 0) / Math.max(1, c.tags.length) +
    (weight.get(`@${c.province}`) ?? 0) * 0.5 +
    (explored.has(c.province) ? 0.6 : 0) +
    (c.date === newest ? 0.8 : 0) +
    Math.random() * 1.5
  return cards
    .map((c) => [c, score(c)] as const)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c)
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

/**
 * The session: every card not marked 读完了 yet (never-shown ones first), a due flashcard after
 * every 4 cards, and a 简称 quiz now and then about provinces the user has read about.
 */
export function buildQueue({
  cards,
  seen,
  due,
  places,
  explored,
  start,
  again,
}: {
  cards: FeedCard[]
  seen: FeedSeen[]
  due: SavedWord[]
  places: Place[]
  explored: Set<string>
  /** open on this card first */
  start?: string
  /** include cards already read (再刷一遍) */
  again?: boolean
}): FeedItem[] {
  const readIds = new Set(seen.filter((s) => s.read).map((s) => s.id))
  const pool = again ? cards : cards.filter((c) => !readIds.has(c.id))
  let ranked = rankCards(pool, seen, explored)
  const first = start ? cards.find((c) => c.id === start) : undefined
  if (first) ranked = [first, ...ranked.filter((c) => c.id !== first.id)]
  ranked = ranked.slice(0, SESSION_CARDS)

  const quizPlaces = shuffle(places.filter((p) => explored.has(p.id)))
  const out: FeedItem[] = []
  let r = 0
  let q = 0
  ranked.forEach((card, i) => {
    out.push({ kind: 'card', card })
    if ((i + 1) % 4 === 0 && r < due.length) out.push({ kind: 'review', word: due[r++] })
    if ((i + 1) % 6 === 3 && q < quizPlaces.length) {
      const place = quizPlaces[q++]
      out.push({ kind: 'quiz', place, q: shortQuestion(place, places) })
    }
  })
  out.push({ kind: 'end' })
  return out
}

/**
 * Records time spent on a card, only to learn what the user likes. Looking at a card is not
 * reading it: that only counts when they press 读完了 (markRead).
 */
export async function markSeen(id: string, dwell: number) {
  if (dwell < 600) return
  const prev = await db.feed.get(id)
  await db.feed.put({ ...prev, id, seen: prev?.seen ?? Date.now(), dwell: (prev?.dwell ?? 0) + dwell })
}

/** 读完了: counts the card for today and its characters as read (once). */
export async function markRead(id: string, chars: number) {
  const prev = await db.feed.get(id)
  if (prev?.read) return
  await db.feed.put({ ...prev, id, seen: prev?.seen ?? Date.now(), dwell: prev?.dwell ?? 0, read: Date.now() })
  await addChars(chars)
  await bumpDay('cards')
  await recordActivity()
}

/** Changed their mind: the card comes back in the feed. */
export async function markUnread(id: string) {
  const prev = await db.feed.get(id)
  if (prev) await db.feed.put({ ...prev, read: undefined })
}

export async function toggleLike(id: string) {
  const prev = await db.feed.get(id)
  await db.feed.put({ ...prev, id, seen: prev?.seen ?? Date.now(), dwell: prev?.dwell ?? 0, liked: !prev?.liked })
}

export async function quizAnswered(right: boolean) {
  if (right) await addCoins(2)
  await recordActivity()
}
