import { useLiveQuery } from './live.ts'
import { add, type Table } from 'dexie'
import { progressKey, db, getSetting, type DayLog } from './db.ts'

/**
 * Streak with one grace day: missing a single day doesn't break it
 * (like Duolingo's streak freeze, but automatic and free once a week).
 */
export interface Stats {
  streak: number
  /** local date (YYYY-MM-DD) of the last day with activity */
  lastDay: string
  /** date the grace day was last used */
  graceUsed: string
  coins: number
  chars: number
}

// Only the stats row uses these nested numeric fields.
const statsTable = db.settings as Table<{ key: string; value: Partial<Stats> }, string>

const EMPTY: Stats = { streak: 0, lastDay: '', graceUsed: '', coins: 0, chars: 0 }

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

/**
 * The saved stats row holds coins, characters and the streak as it was before per-day marks.
 * Each day with activity has its own mark in `days`, so devices that were offline merge their
 * days instead of overwriting each other's streak. The streak is counted on from the saved one.
 */
async function readStats(): Promise<Stats> {
  const s: Stats = { ...EMPTY, ...(await getSetting<Partial<Stats>>('stats', {})) }
  const marked = (await db.days.toArray()).filter((d) => d.active && d.day > s.lastDay).map((d) => d.day)
  for (const day of marked.sort()) countDay(s, day)
  return s
}

function countDay(s: Stats, day: string) {
  const gap = s.lastDay ? daysBetween(s.lastDay, day) : Infinity
  if (gap === 1) s.streak += 1
  else if (gap === 2 && graceAvailable(s, day)) {
    s.streak += 1
    s.graceUsed = day
  } else s.streak = 1
  s.lastDay = day
}

/** Current streak as it should be shown today (0 if it has lapsed). */
export function liveStreak(s: Stats, now = today()): number {
  if (!s.lastDay) return 0
  const gap = daysBetween(s.lastDay, now)
  if (gap <= 1) return s.streak
  if (gap === 2 && graceAvailable(s, now)) return s.streak
  return 0
}

function graceAvailable(s: Stats, now: string) {
  return !s.graceUsed || daysBetween(s.graceUsed, now) >= 7
}

/** Call whenever the user does something that counts for the day (reading, reviewing). */
export async function recordActivity() {
  const day = today()
  const key = progressKey(day)
  if ((await db.days.get(key))?.active) return
  await db.days.upsert(key, { day, active: Date.now() })
}

export async function addCoins(n: number) {
  await statsTable.upsert(progressKey('stats'), { key: 'stats', 'value.coins': add(n) })
}

export async function addChars(n: number) {
  await statsTable.upsert(progressKey('stats'), { key: 'stats', 'value.chars': add(n) })
  await bumpDay('chars', n)
}

type Counter = 'reviews' | 'saved' | 'cards' | 'chars'

export const emptyDay = (day = today()): DayLog => ({ day, reviews: 0, saved: 0, cards: 0, chars: 0 })

/** Adds to one of today's counters (for the morning routine and the day summary). */
export async function bumpDay(field: Counter, n = 1) {
  const day = today()
  await db.days.upsert(progressKey(day), { day, [field]: add(n) })
}

export function useToday(): DayLog {
  const day = today()
  return useLiveQuery(async () => ({ ...emptyDay(day), ...await db.days.get(progressKey(day)) }), [day], emptyDay(day))
}

export function useStats() {
  const s = useLiveQuery(readStats, [], EMPTY)
  const words = useLiveQuery(() => db.words.count(), [], 0)
  const dueWords = useLiveQuery(() => db.words.where('due').belowOrEqual(Date.now()).count(), [], 0)
  const dueEggs = useLiveQuery(() => db.eggs.where('due').belowOrEqual(Date.now()).count(), [], 0)
  return { ...s, streak: liveStreak(s), streakDoneToday: s.lastDay === today(), words, due: dueWords + dueEggs, dueWords, dueEggs }
}

/** The morning routine's three steps are done: mark the day and pay out once. Returns coins earned. */
export async function finishMorning(): Promise<number> {
  const fresh = await db.transaction('rw', db.days, async () => {
    const d = (await db.days.get(progressKey(today()))) ?? emptyDay()
    if (d.morning) return false
    d.morning = Date.now()
    await db.days.upsert(progressKey(d.day), { day: d.day, morning: d.morning })
    return true
  })
  if (!fresh) return 0
  await addCoins(10)
  return 10
}
