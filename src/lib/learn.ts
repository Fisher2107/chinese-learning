import { useMemo } from 'react'
import { db } from './db.ts'
import { useLiveQuery } from './live.ts'
import { addChars, addCoins, recordActivity } from './stats.ts'

export type PlaceKind = 'province' | 'city'

/** `p:sichuan`, `c:chengdu`: one key space for both. */
export const markKey = (kind: PlaceKind, id: string) => `${kind === 'province' ? 'p' : 'c'}:${id}`

const table = (kind: PlaceKind) => (kind === 'province' ? db.places : db.cities) as unknown as typeof db.cities

/** What the user has marked 学会了 or read, and their last test answers, live. */
export function useMarks() {
  const places = useLiveQuery(() => db.places.toArray(), [], [])
  const cities = useLiveQuery(() => db.cities.toArray(), [], [])
  return useMemo(() => {
    const learnt = new Set<string>()
    const read = new Set<string>()
    const tested = new Map<string, { at: number; right: boolean }>()
    for (const [kind, rows] of [
      ['province', places],
      ['city', cities],
    ] as const)
      for (const r of rows) {
        const k = markKey(kind, r.id)
        if (r.learnt) learnt.add(k)
        if (r.read) read.add(k)
        if (r.tested) tested.set(k, r.tested)
      }
    return { learnt, read, tested }
  }, [places, cities])
}

/** 学会了 on or off. Learnt places are what the 认地图 test asks about. */
export async function setLearnt(kind: PlaceKind, id: string, on: boolean) {
  const t = table(kind)
  const prev = await t.get(id)
  await t.put({ ...prev, id, visited: prev?.visited ?? Date.now(), learnt: on ? Date.now() : undefined, updated: Date.now() })
  if (on) await recordActivity()
}

export async function visitCity(id: string) {
  if (!(await db.cities.get(id))) await db.cities.put({ id, visited: Date.now(), updated: Date.now() })
}

/** 我读完了 on a city page. Returns coins earned (3, only the first time). */
export async function markCityRead(id: string, chars: number): Promise<number> {
  const prev = await db.cities.get(id)
  if (prev?.read) return 0
  await db.cities.put({ ...prev, id, read: Date.now(), updated: Date.now() })
  await addChars(chars)
  await addCoins(3)
  await recordActivity()
  return 3
}

export async function markCityUnread(id: string) {
  const prev = await db.cities.get(id)
  if (prev) await db.cities.put({ ...prev, read: undefined, updated: Date.now() })
}

/** Records a 认地图 answer; a right one is worth a coin. */
export async function recordTest(kind: PlaceKind, id: string, right: boolean) {
  const t = table(kind)
  const prev = await t.get(id)
  await t.put({ ...prev, id, visited: prev?.visited ?? Date.now(), tested: { at: Date.now(), right }, updated: Date.now() })
  if (right) await addCoins(1)
  await recordActivity()
}
