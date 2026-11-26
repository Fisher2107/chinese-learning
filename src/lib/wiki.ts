import { progressKey, db } from './db.ts'
import { useLiveQuery } from './live.ts'
import { addChars, addCoins, recordActivity } from './stats.ts'
import type { Sentence, WikiIndex, WikiKind, WikiSummary } from './types.ts'

/** Kinds shown as photos of places to go (like the "top sights" of a maps app). */
export const SIGHT_KINDS = new Set<WikiKind>(['景点', '地点', '河流', '山', '湖', '建筑'])
/** Kinds shown as stories: what happened here. */
export const STORY_KINDS = new Set<WikiKind>(['事件', '传说', '朝代', '作品', '文化'])
export const FOOD_KINDS = new Set<WikiKind>(['美食', '物产'])

export const plain = (sentences: Sentence[]) => sentences.map((s) => s.tokens.map((t) => t.t).join('')).join('')

/** Pages about a province or a city, most linked-to first (the famous things come first). */
export function pagesAbout(index: WikiIndex | undefined, where: { province?: string; city?: string }): WikiSummary[] {
  if (!index) return []
  return index.pages
    .filter((p) => (where.city ? p.cities.includes(where.city) : where.province ? p.provinces.includes(where.province) : true))
    .sort((a, b) => b.links - a.links || b.chars - a.chars)
}

export async function visitWiki(id: string) {
  if (!(await db.wiki.get(progressKey(id)))) await db.wiki.upsert(progressKey(id), { id, visited: Date.now(), updated: Date.now() })
}

/** 读完了 on a 百科 page. Returns coins earned (2, only the first time). */
export async function markWikiRead(id: string, chars: number): Promise<number> {
  const prev = await db.wiki.get(progressKey(id))
  if (prev?.read) return 0
  await db.wiki.upsert(progressKey(id), { id, visited: prev?.visited ?? Date.now(), read: Date.now(), updated: Date.now() })
  await addChars(chars)
  await addCoins(2)
  await recordActivity()
  return 2
}

export async function markWikiUnread(id: string) {
  const prev = await db.wiki.get(progressKey(id))
  if (prev) await db.wiki.upsert(progressKey(id), { read: undefined, updated: Date.now() })
}

/** Every 百科 page opened, and which were read to the end. */
export function useWikiProgress(): { seen: Set<string>; read: Set<string> } {
  const rows = useLiveQuery(() => db.wiki.toArray(), [], [])
  return { seen: new Set(rows.map((r) => r.id)), read: new Set(rows.filter((r) => r.read).map((r) => r.id)) }
}

export interface Crumb {
  id: string
  name: string
}

const TRAIL = 'zgt-wiki-trail'

/**
 * The way you came, page by page (钱塘江 → 钱镠 → 吴越国 …), for this visit to the app. Opening a
 * page already on the trail goes back to it rather than looping.
 */
export function pushTrail(id: string, name: string): Crumb[] {
  let trail: Crumb[] = []
  try {
    trail = JSON.parse(sessionStorage.getItem(TRAIL) ?? '[]')
  } catch {
    trail = []
  }
  const at = trail.findIndex((c) => c.id === id)
  trail = at >= 0 ? trail.slice(0, at + 1) : [...trail, { id, name }].slice(-8)
  try {
    sessionStorage.setItem(TRAIL, JSON.stringify(trail))
  } catch {
    // private mode: the trail lives for this page only
  }
  return trail
}

/** A page not read yet, near where you are if possible: for 随便逛逛. */
export function randomPage(index: WikiIndex, seen: Set<string>, province?: string): WikiSummary | undefined {
  const pool = index.pages.filter((p) => !province || p.provinces.includes(province))
  const fresh = pool.filter((p) => !seen.has(p.id))
  const from = fresh.length ? fresh : pool
  return from[Math.floor(Math.random() * from.length)]
}

const RUN = 'zgt-wiki-run'
export interface Run {
  /** local day, YYYY-MM-DD */
  day: string
  /** pages followed one after another, link to link, right now */
  now: number
  /** the longest run today */
  best: number
  /** the last page counted, and when */
  last: string
  at: number
}

/**
 * The rabbit-hole streak: how many 百科 pages in a row you followed from one to the next today.
 * A page reached from the page before it (the trail grew) adds one; coming in from anywhere else,
 * or after half an hour away, starts again at one. Kept on this device only.
 */
export function countRun(id: string, how: 'followed' | 'back' | 'fresh'): Run {
  const d = new Date()
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  let run: Run | undefined
  try {
    run = JSON.parse(localStorage.getItem(RUN) ?? 'null') ?? undefined
  } catch {
    run = undefined
  }
  if (!run || run.day !== day) run = { day, now: 0, best: 0, last: '', at: 0 }
  if (run.last === id) return run
  // stepping back along the trail neither adds nor breaks the run
  if (how === 'back' && run.now > 0) {
    run.last = id
    run.at = Date.now()
  } else {
    const followed = how === 'followed'
    const fresh = Date.now() - run.at < 30 * 60_000
    run.now = followed && fresh && run.now > 0 ? run.now + 1 : 1
    run.best = Math.max(run.best, run.now)
    run.last = id
    run.at = Date.now()
  }
  try {
    localStorage.setItem(RUN, JSON.stringify(run))
  } catch {
    // private mode: the streak lives for this page only
  }
  return run
}
