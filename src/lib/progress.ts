import type { UpdateSpec } from 'dexie'
import { keyed, progressKey, deviceDb, db, seriesProgress, type SeriesProgress } from './db.ts'
import { addChars, addCoins, recordActivity } from './stats.ts'

function markEpisode(id: string, n: number, field: 'completedEpisodes' | 'openedEpisodes') {
  const change: UpdateSpec<SeriesProgress> = { id, updated: Date.now() }
  change[`${field}.${n}`] = true
  return db.series.upsert(progressKey(id), change)
}

/** Marks an episode as read. Counts characters and coins only the first time. Returns coins earned. */
export async function finishEpisode(seriesId: string, n: number, chars: number): Promise<number> {
  const p = await seriesProgress(seriesId)
  let coins = 0
  if (!p.done.includes(n)) {
    coins = 10
    await addChars(chars)
    await addCoins(coins)
  }
  await markEpisode(seriesId, n, 'completedEpisodes')
  await recordActivity()
  return coins
}

export async function unlockEpisode(seriesId: string, n: number) {
  const p = await seriesProgress(seriesId)
  if (p.unlocked < n) await markEpisode(seriesId, n, 'openedEpisodes')
}

export async function finishSeries(seriesId: string) {
  const p = await seriesProgress(seriesId)
  if (!p.finished) await db.series.upsert(progressKey(seriesId), { id: seriesId, finished: true, updated: Date.now() })
}

export async function saveTextPlace(id: string, sitting: number, finishedSitting?: number, chars = 0) {
  const local = id.startsWith('import:')
  const texts = local ? deviceDb.texts : db.texts
  const prev = await texts.get(local ? id : progressKey(id))
  const read = Math.max(prev?.read ?? -1, finishedSitting ?? -1)
  const row = { id, sitting, read, updated: Date.now() }
  await texts.put(local ? row : keyed(row))
  if (finishedSitting !== undefined && finishedSitting > (prev?.read ?? -1)) {
    await addChars(chars)
    await recordActivity()
  }
}
