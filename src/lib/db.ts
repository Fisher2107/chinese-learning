import Dexie, { type EntityTable } from 'dexie'
import type { Para, Token } from './types.ts'

/** Where a saved word was found, so the card can link back to it. */
export interface WordSource {
  kind: 'episode' | 'text' | 'import' | 'ai' | 'place' | 'feed' | 'review'
  /** route to reopen the spot, e.g. "series/pangdonglai/3" */
  route: string
  title: string
}

/** A flashcard made from a saved word. `card` is the ts-fsrs card (dates stay Date objects in IndexedDB). */
export interface SavedWord {
  id?: number
  word: string
  p: string
  d: string
  sentence: Token[]
  source: WordSource
  note?: string
  created: number
  due: number
  card: Record<string, unknown>
}

export interface ReviewLog {
  id?: number
  wordId: number
  rating: number
  at: number
}

/** Episode progress for one series. */
export interface SeriesProgress {
  id: string
  /** highest episode number that is open to read */
  unlocked: number
  /** episodes finished */
  done: number[]
  /** the 读后 page has been seen */
  finished?: boolean
  /** how many episodes the series had when the user last opened it, for the 更新 badge */
  known?: number
  updated: number
}

export interface TextProgress {
  id: string
  sitting: number
  /** furthest sitting finished */
  read: number
  updated: number
}

export interface AiAnswer {
  key: string
  answer: string
  created: number
}

/** Text pasted in by the user. Stays on this device only. */
export interface ImportDoc {
  id?: number
  title: string
  raw: string
  paras: Para[]
  chars: number
  created: number
}

export interface Known {
  word: string
  at: number
}

/** A province the user has opened; `stamp` is when its 集章 quiz was passed. */
export interface PlaceProgress {
  id: string
  /** first opened. Opening is not reading: see `read`. */
  visited: number
  /** the user said they read the page (我读完了) */
  read?: number
  stamp?: number
  updated: number
}

/** A 刷一刷 card the user has seen: how long they stayed, and whether they liked it. */
export interface FeedSeen {
  id: string
  seen: number
  /** total milliseconds on screen */
  dwell: number
  liked?: boolean
  /** the user said they read it (读完了). Unread cards keep coming back. */
  read?: number
}

/** What happened on one day, for the morning routine and the day summary. */
export interface DayLog {
  /** local date, YYYY-MM-DD */
  day: string
  reviews: number
  saved: number
  cards: number
  chars: number
  /** the morning routine was finished at this time */
  morning?: number
}

export interface Setting {
  key: string
  value: unknown
}

export const db = new Dexie('zhongguotong') as Dexie & {
  words: EntityTable<SavedWord, 'id'>
  reviews: EntityTable<ReviewLog, 'id'>
  series: EntityTable<SeriesProgress, 'id'>
  texts: EntityTable<TextProgress, 'id'>
  ai: EntityTable<AiAnswer, 'key'>
  imports: EntityTable<ImportDoc, 'id'>
  known: EntityTable<Known, 'word'>
  settings: EntityTable<Setting, 'key'>
  places: EntityTable<PlaceProgress, 'id'>
  feed: EntityTable<FeedSeen, 'id'>
  days: EntityTable<DayLog, 'day'>
}

db.version(1).stores({
  words: '++id, word, due, created',
  reviews: '++id, wordId, at',
  series: 'id, updated',
  texts: 'id, updated',
  ai: 'key',
  imports: '++id, created',
  known: 'word',
  settings: 'key',
})
db.version(2).stores({
  places: 'id, updated',
  feed: 'id, seen',
  days: 'day',
})

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row === undefined ? fallback : (row.value as T)
}

export function setSetting(key: string, value: unknown) {
  return db.settings.put({ key, value })
}

export async function seriesProgress(id: string): Promise<SeriesProgress> {
  return (await db.series.get(id)) ?? { id, unlocked: 1, done: [], updated: 0 }
}
