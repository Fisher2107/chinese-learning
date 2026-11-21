import { useLiveQuery } from 'dexie-react-hooks'
import MAP from '../data/china-map.json'
import { db } from './db.ts'
import { addCoins, recordActivity } from './stats.ts'
import type { FeedCard, Place, Region, SeriesSummary } from './types.ts'

export { MAP }
export type MapProvince = (typeof MAP.provinces)[number]
export const MAP_BY_ID = new Map(MAP.provinces.map((p) => [p.id, p]))

export const REGIONS: { name: Region; color: string }[] = [
  { name: '华北', color: '#5B6B8C' },
  { name: '东北', color: '#3D8FB8' },
  { name: '华东', color: '#2BAE85' },
  { name: '华中', color: '#ED5126' },
  { name: '华南', color: '#C98A00' },
  { name: '西南', color: '#8E5BB5' },
  { name: '西北', color: '#C2622D' },
]
export const regionColor = (r: string) => REGIONS.find((x) => x.name === r)?.color ?? '#5B6B8C'

/** 点亮 levels, from unexplored to fully lit: warm like lanterns. */
export const LIGHT = ['var(--sunken)', '#FBE3A1', '#FFD111', '#F7A43A', '#ED5126']

/** Bounding box [x0, y0, x1, y1] around some provinces, padded. */
export function boxOf(ids: string[], pad = 24): [number, number, number, number] {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const id of ids) {
    const b = MAP_BY_ID.get(id)?.box
    if (!b) continue
    x0 = Math.min(x0, b[0])
    y0 = Math.min(y0, b[1])
    x1 = Math.max(x1, b[2])
    y1 = Math.max(y1, b[3])
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]
}

export interface PlaceStat {
  visited: boolean
  stamp: boolean
  /** feed cards seen + series episodes finished about this place */
  read: number
  /** saved words found on this place's page, its feed cards or its series */
  words: number
  /** 0–4: one point each for visiting, the stamp, reading 2+ things, saving 3+ words */
  light: number
}

/** Which province a saved word came from, judged by where it was saved. */
function provinceOfRoute(route: string, feed: Map<string, FeedCard>, series: Map<string, SeriesSummary>): string[] {
  const [head, id] = route.split('/')
  if (head === 'place') return [id]
  if (head === 'feed') return feed.get(id)?.province ? [feed.get(id)!.province] : []
  if (head === 'series') return series.get(id)?.provinces ?? []
  return []
}

/** 点亮中国: how lit each province is. */
export function usePlaceStats(feedCards: FeedCard[] = [], seriesList: SeriesSummary[] = []): Map<string, PlaceStat> {
  const places = useLiveQuery(() => db.places.toArray(), [], [])
  const seen = useLiveQuery(() => db.feed.toArray(), [], [])
  const progress = useLiveQuery(() => db.series.toArray(), [], [])
  const sources = useLiveQuery(async () => (await db.words.toArray()).map((w) => w.source.route), [], [])

  const feed = new Map(feedCards.map((c) => [c.id, c]))
  const series = new Map(seriesList.map((s) => [s.id, s]))
  const out = new Map<string, PlaceStat>()
  const get = (id: string) => {
    let s = out.get(id)
    if (!s) out.set(id, (s = { visited: false, stamp: false, read: 0, words: 0, light: 0 }))
    return s
  }
  for (const p of places) {
    get(p.id).visited = true
    if (p.stamp) get(p.id).stamp = true
  }
  for (const f of seen) {
    const pid = feed.get(f.id)?.province
    if (pid) get(pid).read++
  }
  for (const p of progress) for (const pid of series.get(p.id)?.provinces ?? []) get(pid).read += p.done.length
  for (const r of sources) for (const pid of provinceOfRoute(r, feed, series)) get(pid).words++
  for (const s of out.values()) s.light = +s.visited + +s.stamp + +(s.read >= 2) + +(s.words >= 3)
  return out
}

export async function visitPlace(id: string) {
  const prev = await db.places.get(id)
  if (!prev) await db.places.put({ id, visited: Date.now(), updated: Date.now() })
  await recordActivity()
}

/** Passing the 集章 quiz. Returns coins earned (only the first time). */
export async function earnStamp(id: string): Promise<number> {
  const prev = await db.places.get(id)
  if (prev?.stamp) return 0
  await db.places.put({ id, visited: prev?.visited ?? Date.now(), stamp: Date.now(), updated: Date.now() })
  await addCoins(15)
  await recordActivity()
  return 15
}

export interface QuizQuestion {
  q: string
  options: string[]
  answer: number
  /** shown after answering, right or wrong */
  why: string
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

function choice(correct: string, pool: string[]): { options: string[]; answer: number } {
  const options = shuffle([correct, ...shuffle([...new Set(pool.filter((x) => x && x !== correct))]).slice(0, 3)])
  return { options, answer: options.indexOf(correct) }
}

export function shortQuestion(p: Place, all: Place[]): QuizQuestion {
  return { q: `${p.name}的简称是哪个字？`, ...choice(p.short, all.map((x) => x.short)), why: `${p.name}简称“${p.short}”${p.alias ? `，也可以叫“${p.alias}”` : ''}。` }
}

/** Three quick questions about a province: 简称, 省会 (or region), and a neighbour. */
export function makeQuiz(p: Place, all: Place[]): QuizQuestion[] {
  const byId = new Map(all.map((x) => [x.id, x]))
  const qs: QuizQuestion[] = [shortQuestion(p, all)]
  if (p.capital) {
    const near = all.filter((x) => x.region === p.region && x.capital).map((x) => x.capital)
    qs.push({ q: `${p.name}的省会是哪个城市？`, ...choice(p.capital, [...near, ...all.map((x) => x.capital)]), why: `${p.full}的省会是${p.capital}。` })
  } else {
    qs.push({ q: `${p.name}在中国的哪个地区？`, ...choice(p.region, REGIONS.map((r) => r.name)), why: `${p.name}属于${p.region}。` })
  }
  const neighbours = (MAP_BY_ID.get(p.id)?.neighbours ?? []).filter((id) => byId.has(id))
  if (neighbours.length) {
    const yes = byId.get(shuffle(neighbours)[0])!
    const no = all.filter((x) => x.id !== p.id && !neighbours.includes(x.id)).map((x) => x.name)
    const names = neighbours.map((id) => byId.get(id)!.name).join('、')
    qs.push({ q: `哪个地方和${p.name}挨着？`, ...choice(yes.name, no), why: `和${p.name}挨着的有：${names}。` })
  } else {
    const islands = ['hainan', 'taiwan']
    qs.push({
      q: `${p.name}是哪一种行政区？`,
      ...choice(p.type, ['省', '自治区', '直辖市', '特别行政区']),
      why: `${p.full}是${p.type}${islands.includes(p.id) ? '，也是一个岛' : ''}。`,
    })
  }
  return qs
}
