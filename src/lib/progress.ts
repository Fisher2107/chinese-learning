import { db, seriesProgress } from './db.ts'
import { addChars, addCoins, recordActivity } from './stats.ts'

/** Marks an episode as read. Counts characters and coins only the first time. Returns coins earned. */
export async function finishEpisode(seriesId: string, n: number, chars: number): Promise<number> {
  const p = await seriesProgress(seriesId)
  let coins = 0
  if (!p.done.includes(n)) {
    p.done = [...p.done, n].sort((a, b) => a - b)
    coins = 10
    await addChars(chars)
    await addCoins(coins)
  }
  p.updated = Date.now()
  await db.series.put(p)
  await recordActivity()
  return coins
}

export async function unlockEpisode(seriesId: string, n: number) {
  const p = await seriesProgress(seriesId)
  if (p.unlocked < n) await db.series.put({ ...p, unlocked: n, updated: Date.now() })
}

export async function finishSeries(seriesId: string) {
  const p = await seriesProgress(seriesId)
  if (!p.finished) await db.series.put({ ...p, finished: true, updated: Date.now() })
}

export async function saveTextPlace(id: string, sitting: number, finishedSitting?: number, chars = 0) {
  const prev = await db.texts.get(id)
  const read = Math.max(prev?.read ?? -1, finishedSitting ?? -1)
  await db.texts.put({ id, sitting, read, updated: Date.now() })
  if (finishedSitting !== undefined && finishedSitting > (prev?.read ?? -1)) {
    await addChars(chars)
    await recordActivity()
  }
}
