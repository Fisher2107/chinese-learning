import { useLiveQuery } from 'dexie-react-hooks'
import { db, getSetting, setSetting } from './db.ts'

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

const EMPTY: Stats = { streak: 0, lastDay: '', graceUsed: '', coins: 0, chars: 0 }

export const today = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000)

async function readStats(): Promise<Stats> {
  return { ...EMPTY, ...(await getSetting<Partial<Stats>>('stats', {})) }
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
  await db.transaction('rw', db.settings, async () => {
    const s = await readStats()
    const now = today()
    if (s.lastDay === now) return
    const gap = s.lastDay ? daysBetween(s.lastDay, now) : Infinity
    if (gap === 1) s.streak += 1
    else if (gap === 2 && graceAvailable(s, now)) {
      s.streak += 1
      s.graceUsed = now
    } else s.streak = 1
    s.lastDay = now
    await setSetting('stats', s)
  })
}

export async function addCoins(n: number) {
  await db.transaction('rw', db.settings, async () => {
    const s = await readStats()
    s.coins += n
    await setSetting('stats', s)
  })
}

export async function addChars(n: number) {
  await db.transaction('rw', db.settings, async () => {
    const s = await readStats()
    s.chars += n
    await setSetting('stats', s)
  })
}

export function useStats() {
  const s = useLiveQuery(readStats, [], EMPTY)
  const words = useLiveQuery(() => db.words.count(), [], 0)
  const due = useLiveQuery(() => db.words.where('due').belowOrEqual(Date.now()).count(), [], 0)
  return { ...s, streak: liveStreak(s), streakDoneToday: s.lastDay === today(), words, due }
}
