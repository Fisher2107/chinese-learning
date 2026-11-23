import { useLiveQuery } from './live.ts'
import MAP from '../data/china-map.json'
import { db } from './db.ts'
import { addChars, addCoins, recordActivity } from './stats.ts'
import type { FeedCard, Place, PlaceQuiz, Region, SeriesSummary } from './types.ts'

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
  /** opened the page at least once */
  visited: boolean
  /** said 我读完了 on the page */
  intro: boolean
  stamp: boolean
  /** feed cards read + series episodes finished about this place */
  read: number
  /** saved words found on this place's page, its feed cards or its series */
  words: number
  /** 0–4: one point each for reading the page, the stamp, reading 2+ more things, saving 3+ words */
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
    if (!s) out.set(id, (s = { visited: false, intro: false, stamp: false, read: 0, words: 0, light: 0 }))
    return s
  }
  for (const p of places) {
    get(p.id).visited = true
    if (p.read) get(p.id).intro = true
    if (p.stamp) get(p.id).stamp = true
  }
  for (const f of seen) {
    const pid = f.read && feed.get(f.id)?.province
    if (pid) get(pid).read++
  }
  for (const p of progress) for (const pid of series.get(p.id)?.provinces ?? []) get(pid).read += p.done.length
  for (const r of sources) for (const pid of provinceOfRoute(r, feed, series)) get(pid).words++
  for (const s of out.values()) s.light = +s.intro + +s.stamp + +(s.read >= 2) + +(s.words >= 3)
  return out
}

/** Opening a page only notes the visit; it doesn't count as reading or as activity for the day. */
export async function visitPlace(id: string) {
  const prev = await db.places.get(id)
  if (!prev) await db.places.put({ id, visited: Date.now(), updated: Date.now() })
}

/** 我读完了 on a place page. Returns coins earned (5, only the first time). */
export async function markPlaceRead(id: string, chars: number): Promise<number> {
  const prev = await db.places.get(id)
  if (prev?.read) return 0
  await db.places.put({ ...prev, id, visited: prev?.visited ?? Date.now(), read: Date.now(), updated: Date.now() })
  await addChars(chars)
  await addCoins(5)
  await recordActivity()
  return 5
}

export async function markPlaceUnread(id: string) {
  const prev = await db.places.get(id)
  if (prev) await db.places.put({ ...prev, read: undefined, updated: Date.now() })
}

/** Provinces the user has read about or stamped: what quizzes and the feed lean on. */
export const explored = (rows: { id: string; read?: number; stamp?: number }[]) => new Set(rows.filter((p) => p.read || p.stamp).map((p) => p.id))

/** Passing the 集章 quiz. Returns coins earned (only the first time). */
export async function earnStamp(id: string): Promise<number> {
  const prev = await db.places.get(id)
  if (prev?.stamp) return 0
  await db.places.put({ ...prev, id, visited: prev?.visited ?? Date.now(), stamp: Date.now(), updated: Date.now() })
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
  /** where to read more: shown after answering */
  more?: { route: string; title: string }
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

/** The right answer and three others: the first of `pool` that differ, so put the best ones first. */
function choice(correct: string, pool: string[]): { options: string[]; answer: number } {
  const options = shuffle([correct, ...[...new Set(pool.filter((x) => x && x !== correct))].slice(0, 3)])
  return { options, answer: options.indexOf(correct) }
}

/** Mainland number plates start with the 简称 (京A, 浙A…); Hong Kong's, Macao's and Taiwan's don't. */
const PLATES = (p: Place) => p.type !== '特别行政区' && p.id !== 'taiwan'

export function shortQuestion(p: Place, all: Place[]): QuizQuestion {
  return { q: `${p.name}的简称是哪个字？`, ...choice(p.short, shuffle(all.map((x) => x.short))), why: `${p.name}简称“${p.short}”${p.alias ? `，也可以叫“${p.alias}”` : ''}。${PLATES(p) ? '车牌上的第一个字就是简称。' : ''}` }
}

const KINDS = ['省', '自治区', '直辖市', '特别行政区'] as const

/** 省会, with the capitals of its region as the other options; what kind of place it is if it has none. */
function capitalQuestion(p: Place, all: Place[], cities: QuizCity[]): QuizQuestion {
  if (!p.capital) {
    const why =
      p.type === '直辖市'
        ? `${p.name}是直辖市，直接归中央管，所以没有省会。中国有四个直辖市：北京、上海、天津和重庆。`
        : `${p.name}是特别行政区，实行“一国两制”，所以没有省会。中国有两个特别行政区：香港和澳门。`
    const options = shuffle([...KINDS])
    return { q: `${p.name}没有省会，因为它是哪一种行政区？`, options, answer: options.indexOf(p.type), why }
  }
  const near = all.filter((x) => x.id !== p.id && x.region === p.region && x.capital).map((x) => x.capital)
  const rest = all.filter((x) => x.id !== p.id && x.capital).map((x) => x.capital)
  const city = cities.find((c) => c.prov === p.id && c.name === p.capital)
  return {
    q: `${p.name}的省会是哪个城市？`,
    ...choice(p.capital, [...shuffle(near), ...shuffle(rest)]),
    why: `${p.full}的省会是${p.capital}。`,
    ...(city && { more: { route: `city/${city.id}`, title: p.capital } }),
  }
}

/** A question from the content, its options in a new order each time. */
function fromContent(q: PlaceQuiz): QuizQuestion {
  const options = shuffle(q.options.map((o, i) => ({ o, right: i === q.answer })))
  return { q: q.q, options: options.map((x) => x.o), answer: options.findIndex((x) => x.right), why: q.why, more: q.more }
}

export interface QuizCity {
  id: string
  name: string
  prov: string
}

/**
 * 集章: what everyone from the place knows. Its 省会 first (or, with none, what kind of place it is),
 * then four of the questions written for it (its 简称 is one of them), then what people speak there.
 * No photos: this is knowing the place, not recognising a picture. Each answer says why.
 */
export function makeQuiz(p: Place, all: Place[], cities: QuizCity[]): QuizQuestion[] {
  const first = capitalQuestion(p, all, cities)
  const known = shuffle([shortQuestion(p, all), ...p.quiz.map(fromContent)]).slice(0, 4)
  const dialect = p.dialect && { ...fromContent(p.dialect), more: p.dialect.more ?? { route: `collection/hometown/${p.id}`, title: `${p.name}的家乡话` } }
  return [first, ...known, ...(dialect ? [dialect] : [])]
}
