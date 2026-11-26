import { useMemo } from 'react'
import { db, progressKey } from './db.ts'
import { useLiveQuery } from './live.ts'
import { addCoins, recordActivity } from './stats.ts'
import type { Block, Egg, Para, Sentence, SourceLink, WikiQuiz } from './types.ts'

type Box = [number, number, number, number]

/** One state on an era's map, in map coordinates (see scripts/history-map.mjs). */
export interface MapState {
  name: string
  /** state; or a place taken (lost), leased, occupied, or an economic zone */
  kind: 'state' | 'lost' | 'leased' | 'occupied' | 'zone'
  color: string
  d: string
  /** where its name goes */
  x: number
  y: number
  /** today's provinces, cities or countries it roughly covered */
  today: string[]
  /** ids of today's cities inside it */
  cities: string[]
  note?: string
}

export interface MapRoute {
  name: string
  d: string
  x: number
  y: number
  start: [number, number]
  end: [number, number]
}

export interface MapPin {
  id: string
  kind: 'capital' | 'place' | 'story' | 'event'
  name: string
  x: number
  y: number
  /** capitals: whose capital, when an era has several */
  of?: string
  note?: string
  /** stories: the 百科 page */
  route?: string
  sensitive?: boolean
  /** events: which 大事年表 entry (1-based) */
  n?: number
}

/** What an era adds to the map. */
export interface EraLayer {
  box: Box
  states: MapState[]
  routes: MapRoute[]
  pins: MapPin[]
}

export interface Figure {
  id: string
  name: string
  role: string
  src?: string
  caption?: string
  credit?: string
  page?: string
}

export interface TimelineItem {
  date: string
  title: string
  place: string
  xy?: [number, number]
  figures: Figure[]
  story: Block[]
  sources: SourceLink[]
  rank?: number
  hook?: Sentence[]
}

export interface EraSummary {
  id: string
  name: string
  dates: string
  /** 1 王朝, 2 近现代 */
  book: 1 | 2
  /** the 朝代歌 couplet it sits under */
  song: string
  /** the 朝代印: one or two characters */
  seal: string
  color: string
  hook: Sentence[]
  /** 百科 page ids, in the order the era shows them */
  stories: string[]
  series: string[]
  events: number
  eggCount: number
}

export interface HistoryIndex {
  eras: EraSummary[]
  /** 聊天推荐: the events most worth knowing, best first */
  picks: { era: string; n: number; rank: number; title: string; hook: string }[]
  /** 都城在哪儿: capitals by today's city, with the eras (and the name each one used) */
  capitals: { name: string; x: number; y: number; eras: { era: string; as: string }[] }[]
  glossary: Record<string, string>
}

export type EraEgg = Egg & { tag: '节日' | '成语' | '吃的' | '还在说' }

export interface Era extends EraSummary {
  intro: Block[]
  more: Block[]
  /** 聊天提示 (卷二): 骄傲, 经历过, 少提 */
  tips: { k: string; v: Sentence[] }[]
  eggs: EraEgg[]
  timeline: TimelineItem[]
  quiz: WikiQuiz[]
  layer: EraLayer
  /** 权力接力: who held the top job, 毛泽东 to 习近平 (on the 卷二 chapters after 1949) */
  relay?: { runners: Relay[]; arc: Block[] }
  /** 今天的中国怎么运作 (新时代 only) */
  system?: {
    checked: string
    party: { name: Sentence[]; count: Sentence[]; note: Sentence[] }[]
    state: { name: Sentence[]; note: Sentence[] }[]
    posts: Block[]
    calendar: { when: Sentence[]; what: Sentence[] }[]
  }
  glossary: Record<string, string>
}

export interface Relay {
  /** the 百科 page, whose photo is the portrait */
  page: string
  name: string
  years: string
  /** the chapter where this runner is highlighted */
  era: string
  /** a 总书记 under 邓小平 rather than the top leader */
  side: boolean
  how: Sentence[]
  phrase: Sentence[]
}

/** 王朝至此完: what the second scroll is called. */
export const BOOK_TITLE = { 1: '卷一 · 王朝', 2: '卷二 · 近现代' } as const

/*
 * An era's progress lives in the 百科 table (already synced) as `era:<id>`: `visited` when its page
 * was first opened, `read` when its 朝代印 was earned. Nothing else reads those ids.
 */
const eraKey = (id: string) => `era:${id}`

export async function visitEra(id: string) {
  if (!(await db.wiki.get(progressKey(eraKey(id))))) await db.wiki.upsert(progressKey(eraKey(id)), { id: eraKey(id), visited: Date.now(), updated: Date.now() })
}

/** Passing an era's 考一考. Returns coins earned (only the first time). */
export async function earnEraSeal(id: string): Promise<number> {
  const prev = await db.wiki.get(progressKey(eraKey(id)))
  if (prev?.read) return 0
  await db.wiki.upsert(progressKey(eraKey(id)), { id: eraKey(id), visited: prev?.visited ?? Date.now(), read: Date.now(), updated: Date.now() })
  await addCoins(10)
  await recordActivity()
  return 10
}

/** Seals earned (era → when) and stories read, live. */
export function useHistoryProgress() {
  const rows = useLiveQuery(() => db.wiki.toArray(), [], [])
  return useMemo(() => {
    const seals = new Map<string, number>()
    const read = new Set<string>()
    const seen = new Set<string>()
    for (const r of rows) {
      if (r.id.startsWith('era:')) {
        if (r.read) seals.set(r.id.slice(4), r.read)
      } else {
        seen.add(r.id)
        if (r.read) read.add(r.id)
      }
    }
    return { seals, read, seen }
  }, [rows])
}

/** How far into an era: its stories read, out of all of them. */
export function eraDone(era: EraSummary, read: Set<string>) {
  const done = era.stories.filter((s) => read.has(s)).length
  return { done, total: era.stories.length, share: era.stories.length ? done / era.stories.length : 0 }
}
