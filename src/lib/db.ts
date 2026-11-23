import Dexie, { type EntityTable } from 'dexie'
import dexieCloud from 'dexie-cloud-addon'
import type { Para, Token } from './types.ts'

/** Where a saved word was found, so the card can link back to it. */
export interface WordSource {
  kind: 'episode' | 'text' | 'import' | 'ai' | 'place' | 'feed' | 'history' | 'review'
  /** route to reopen the spot, e.g. "series/pangdonglai/3" */
  route: string
  title: string
}

/** A flashcard made from a saved word. `card` is the ts-fsrs card (dates stay Date objects in IndexedDB). */
export interface SavedWord {
  id?: string | number
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
  id?: string | number
  wordId: string | number
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
  completedEpisodes?: Record<string, boolean>
  openedEpisodes?: Record<string, boolean>
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
  /** marked 学会了 on the map: it goes into the 认地图 test */
  learnt?: number
  /** last 认地图 answer */
  tested?: { at: number; right: boolean }
  updated: number
}

/** A city on the map: same marks as a province, without the stamp. */
export interface CityProgress {
  id: string
  visited?: number
  read?: number
  learnt?: number
  tested?: { at: number; right: boolean }
  updated: number
}

/** A 刷一刷 card the user has seen: how long they stayed, and whether they liked it. */
/** A 百科 page the user has opened: links to it turn from "new" to "seen". */
export interface WikiProgress {
  id: string
  visited: number
  /** said 读完了 */
  read?: number
  updated: number
}

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

/**
 * The user's side of a 聊天彩蛋: their edits and notes, its flashcard, or a whole egg they wrote.
 * Content eggs keep their id as the key, so this survives content updates.
 */
export interface EggNote {
  /** a content egg's id (place/zhejiang#1a2b3c4d), or mine:<page>:<time> for one the user wrote */
  key: string
  /** the page it's on: place/<id> or city/<id> */
  page: string
  /** that page's name (浙江, 杭州), for the flashcard */
  title: string
  mine?: boolean
  /** the user's text and question. For content eggs, only set once edited. */
  text?: string
  q?: string
  /** what the user found out: their notes, links, their own words */
  note?: string
  /** search words, if the user changed them */
  find?: string
  /** the egg when it was saved, in case the content changes later */
  was?: { text: string; q: string }
  /** a flashcard: the ts-fsrs card and when it's next due */
  card?: Record<string, unknown>
  due?: number
  created: number
  updated: number
}

export interface Setting {
  key: string
  value: unknown
}

/*
 * Queries must work in iPhone Safari. WebKit 26 refuses "unique" cursors with
 * "UnknownError: Unable to open cursor", so never use uniqueKeys() or eachUniqueKey():
 * read with toArray() (or get/where…toArray) and dedupe in JS. The tables are small.
 */
type StudyDatabase = Dexie & {
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
  cities: EntityTable<CityProgress, 'id'>
  wiki: EntityTable<WikiProgress, 'id'>
  eggs: EntityTable<EggNote, 'key'>
}

export const deviceDb = new Dexie('zhongguotong') as StudyDatabase

deviceDb.version(1).stores({
  words: '++id, word, due, created',
  reviews: '++id, wordId, at',
  series: 'id, updated',
  texts: 'id, updated',
  ai: 'key',
  imports: '++id, created',
  known: 'word',
  settings: 'key',
})
deviceDb.version(2).stores({
  places: 'id, updated',
  feed: 'id, seen',
  days: 'day',
})
deviceDb.version(3).stores({
  cities: 'id, updated',
})
deviceDb.version(4).stores({
  wiki: 'id, updated',
})
deviceDb.version(5).stores({
  eggs: 'key, page, due',
})

// The cloud profile has a separate IndexedDB cache. Signing in or out never clears
// the original device database (including pasted texts and API credentials).
export const cloudUrl = import.meta.env.VITE_DEXIE_CLOUD_URL ?? 'https://z067pyapo.dexie.cloud'
export const cloudDb = cloudUrl ? new Dexie('zhongguotong-cloud', { addons: [dexieCloud] }) as StudyDatabase : undefined
if (cloudDb && cloudUrl) {
  cloudDb.version(1).stores({
    words: 'id, word, due, created',
    reviews: 'id, wordId, at',
    series: 'cloudKey, updated',
    texts: 'cloudKey, updated',
    known: 'cloudKey',
    settings: 'cloudKey',
    places: 'cloudKey, updated',
    feed: 'cloudKey, seen',
    days: 'cloudKey',
    cities: 'cloudKey, updated',
    wiki: 'cloudKey, updated',
    eggs: 'cloudKey, page, due',
  })
  cloudDb.cloud.configure({ databaseUrl: cloudUrl, tryUseServiceWorker: false })
}

const profileKey = 'zgt-cloud-profile'
function selectedProfile() {
  try { return localStorage.getItem(profileKey) } catch { return null }
}
export const db = cloudDb && selectedProfile() === cloudUrl ? cloudDb : deviceDb
window.addEventListener('storage', event => {
  if (event.key === profileKey && event.newValue !== event.oldValue) location.reload()
})
export const inCloud = db !== deviceDb

// Independent episode marks merge when two devices study the series offline.
db.series.hook('reading', row => row && ({
  ...row,
  done: [...new Set([...(row.done ?? []), ...Object.keys(row.completedEpisodes ?? {}).map(Number)])].sort((a, b) => a - b),
  unlocked: Math.max(row.unlocked ?? 1, ...Object.keys(row.openedEpisodes ?? {}).map(Number)),
}))

export async function connectCloud() {
  if (!cloudDb || !cloudUrl) throw new Error('云同步尚未配置')
  await cloudDb.open()
  await cloudDb.cloud.login()
  await cloudDb.cloud.sync({ purpose: 'pull', wait: true })
  localStorage.setItem(profileKey, cloudUrl)
  location.reload()
}

export async function disconnectCloud() {
  if (!cloudDb) return
  await cloudDb.cloud.sync({ purpose: 'push', wait: true })
  await cloudDb.cloud.logout()
  localStorage.removeItem(profileKey)
  location.reload()
}

// Dexie Cloud private singleton IDs begin with # and are scoped to the account.
// Keep the original content ID on each row for routes, joins and JSON backups.
export const progressKey = (key: string) => inCloud ? '#' + key : key
export function keyed<T extends { id?: string; day?: string; key?: string; word?: string }>(row: T) {
  const key = row.id ?? row.day ?? row.key ?? row.word
  if (key === undefined) throw new Error('Missing progress key')
  return inCloud ? { ...row, cloudKey: progressKey(key) } : row
}

export function isStudySetting(key: string) {
  return key === 'stats' || key === 'feedVisited'
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = isStudySetting(key) ? await db.settings.get(progressKey(key)) : await deviceDb.settings.get(key)
  return row === undefined ? fallback : (row.value as T)
}

export function setSetting(key: string, value: unknown) {
  if (isStudySetting(key)) return db.settings.put(keyed({ key, value }))
  return deviceDb.settings.put({ key, value })
}

export async function seriesProgress(id: string): Promise<SeriesProgress> {
  return (await db.series.get(progressKey(id))) ?? { id, unlocked: 1, done: [], updated: 0 }
}
