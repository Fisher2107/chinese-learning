import { useLiveQuery } from './live.ts'
import MAP from '../data/china-map.json'
import { progressKey, db } from './db.ts'
import { addChars, addCoins, recordActivity } from './stats.ts'
import type { FeedCard, Place, Region, Sentence, SeriesSummary, WikiIndex } from './types.ts'

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
  const prev = await db.places.get(progressKey(id))
  if (!prev) await db.places.upsert(progressKey(id), { id, visited: Date.now(), updated: Date.now() })
}

/** 我读完了 on a place page. Returns coins earned (5, only the first time). */
export async function markPlaceRead(id: string, chars: number): Promise<number> {
  const prev = await db.places.get(progressKey(id))
  if (prev?.read) return 0
  await db.places.upsert(progressKey(id), { id, visited: prev?.visited ?? Date.now(), read: Date.now(), updated: Date.now() })
  await addChars(chars)
  await addCoins(5)
  await recordActivity()
  return 5
}

export async function markPlaceUnread(id: string) {
  const prev = await db.places.get(progressKey(id))
  if (prev) await db.places.upsert(progressKey(id), { read: undefined, updated: Date.now() })
}

/** Provinces the user has read about or stamped: what quizzes and the feed lean on. */
export const explored = (rows: { id: string; read?: number; stamp?: number }[]) => new Set(rows.filter((p) => p.read || p.stamp).map((p) => p.id))

/** Passing the 集章 quiz. Returns coins earned (only the first time). */
export async function earnStamp(id: string): Promise<number> {
  const prev = await db.places.get(progressKey(id))
  if (prev?.stamp) return 0
  await db.places.upsert(progressKey(id), { id, visited: prev?.visited ?? Date.now(), stamp: Date.now(), updated: Date.now() })
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
  /** a photo key shown with the question */
  photo?: string
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

function choice(correct: string, pool: string[]): { options: string[]; answer: number } {
  const options = shuffle([correct, ...shuffle([...new Set(pool.filter((x) => x && x !== correct))]).slice(0, 3)])
  return { options, answer: options.indexOf(correct) }
}

export function shortQuestion(p: Place, all: Place[]): QuizQuestion {
  return { q: `${p.name}的简称是哪个字？`, ...choice(p.short, all.map((x) => x.short)), why: `${p.name}简称“${p.short}”${p.alias ? `，也可以叫“${p.alias}”` : ''}。` }
}

/** The old three: 简称, 省会 (or region), and a neighbour. One of them warms up every quiz. */
function basics(p: Place, all: Place[]): QuizQuestion[] {
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
    qs.push({ q: `哪个地方和${p.name}挨着？`, ...choice(yes.name, no), why: `和${p.name}挨着的有：${names}。`, more: { route: `place/${yes.id}`, title: yes.name } })
  }
  return qs
}

export interface QuizSources {
  /** the 百科 list */
  wiki?: WikiIndex
  /** photo keys that exist */
  photos: Set<string>
  /** cities on the map: id, name, province */
  cities: { id: string; name: string; prov: string; kind: string }[]
  /** 百科 pages the user has opened: their questions come first */
  seen: Set<string>
}

const SIGHTS = new Set(['景点', '地点', '河流', '山', '湖', '建筑'])

/**
 * 集章: about six questions on what makes the place itself: photos of its famous sights ("这是哪里？"),
 * its people, the questions written with its 百科 pages (pages you've read come first), which city
 * things are in, and one of the basics. Each answer says why and where to read more.
 */
export function makeQuiz(p: Place, all: Place[], src: QuizSources): QuizQuestion[] {
  const pages = (src.wiki?.pages ?? []).filter((w) => w.provinces.includes(p.id))
  const others = (src.wiki?.pages ?? []).filter((w) => !w.provinces.includes(p.id))
  const more = (id: string, name: string) => ({ route: `wiki/${id}`, title: name })
  const out: QuizQuestion[] = []

  // 1. a famous sight, by its photo
  const sights = shuffle(pages.filter((w) => SIGHTS.has(w.kind) && src.photos.has(`wiki/${w.id}`)))
  if (sights.length) {
    const s = sights[0]
    const pool = [...pages.filter((w) => SIGHTS.has(w.kind)), ...shuffle(others.filter((w) => SIGHTS.has(w.kind)))].map((w) => w.name)
    out.push({ q: '照片里是哪儿？', photo: `wiki/${s.id}`, ...choice(s.name, pool), why: plainLede(s.lede), more: more(s.id, s.name) })
  } else {
    // no 百科 photos yet: a city of this province, by its photo
    const mine = shuffle(src.cities.filter((c) => c.prov === p.id && c.kind !== 'muni' && src.photos.has(`city/${c.id}`)))
    if (mine.length) {
      const c = mine[0]
      const pool = [...src.cities.filter((x) => x.prov === p.id), ...shuffle(src.cities)].map((x) => x.name)
      out.push({ q: `照片里是${p.name}的哪个城市？`, photo: `city/${c.id}`, ...choice(c.name, pool), why: `这是${c.name}。`, more: { route: `city/${c.id}`, title: c.name } })
    }
  }

  // 2. someone from here
  const people = shuffle(pages.filter((w) => w.kind === '人物'))
  if (people.length) {
    const who = people[0]
    if (src.photos.has(`wiki/${who.id}`)) {
      const pool = [...people.slice(1), ...shuffle(others.filter((w) => w.kind === '人物'))].map((w) => w.name)
      if (pool.length >= 3) out.push({ q: '这位是谁？', photo: `wiki/${who.id}`, ...choice(who.name, pool), why: plainLede(who.lede), more: more(who.id, who.name) })
    } else {
      const pool = shuffle(others.filter((w) => w.kind === '人物')).map((w) => w.name)
      if (pool.length >= 3) out.push({ q: `下面哪一位跟${p.name}关系最深？`, ...choice(who.name, pool), why: plainLede(who.lede), more: more(who.id, who.name) })
    }
  }

  // 3. questions written with the pages: read ones first
  const written = pages.flatMap((w) => (src.wiki?.quiz[w.id] ?? []).map((q) => ({ q, w })))
  const ordered = [...shuffle(written.filter((x) => src.seen.has(x.w.id))), ...shuffle(written.filter((x) => !src.seen.has(x.w.id)))]
  for (const { q, w } of ordered.slice(0, 3)) {
    const options = shuffle(q.options.map((o, i) => ({ o, right: i === q.answer })))
    out.push({ q: q.q, options: options.map((x) => x.o), answer: options.findIndex((x) => x.right), why: q.why, photo: q.photo, more: more(w.id, w.name) })
  }

  // 4. which city a sight is in
  const placed = shuffle(pages.filter((w) => SIGHTS.has(w.kind) && w.cities.length === 1))
  const inCity = placed.find((w) => !out.some((q) => q.more?.route === `wiki/${w.id}`)) ?? placed[0]
  if (inCity) {
    const city = src.cities.find((c) => c.id === inCity.cities[0])
    if (city) {
      const pool = shuffle(src.cities.filter((c) => c.prov === p.id && c.kind !== 'muni')).map((c) => c.name)
      if (pool.length >= 3) out.push({ q: `${inCity.name}在哪个城市？`, ...choice(city.name, pool), why: `${inCity.name}在${city.name}。`, more: more(inCity.id, inCity.name) })
    }
  }

  // 5. basics: one if there's plenty else, all of them if there's little
  const b = shuffle(basics(p, all))
  const fill = out.length >= 4 ? b.slice(0, 1) : b
  // a city of this province among others, if still short
  if (out.length + fill.length < 5) {
    const mine = shuffle(src.cities.filter((c) => c.prov === p.id && c.kind !== 'muni'))[0]
    const pool = shuffle(src.cities.filter((c) => c.prov !== p.id && c.kind !== 'muni')).map((c) => c.name)
    if (mine) fill.push({ q: `哪个城市在${p.name}？`, ...choice(mine.name, pool), why: `${mine.name}在${p.name}。`, more: { route: `city/${mine.id}`, title: mine.name } })
  }
  return [fill[0], ...out, ...fill.slice(1)].filter(Boolean).slice(0, 7)
}

const plainLede = (lede: Sentence[]) => lede.map((s) => s.tokens.map((t) => t.t).join('')).join('')
