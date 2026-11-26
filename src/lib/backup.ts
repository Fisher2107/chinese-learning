import { db, deviceDb, inCloud, isStudySetting, keyed, progressKey, type SavedWord, type Setting } from './db.ts'
import { mergeDuplicateWords, reviveCard } from './srs.ts'

const progress = ['words', 'reviews', 'series', 'texts', 'known', 'places', 'feed', 'days', 'cities', 'wiki', 'eggs'] as const
const privateTables = ['imports', 'ai'] as const

function portable(row: Record<string, unknown>) {
  const { cloudKey, owner, realmId, $ts, ...data } = row
  return data
}

export async function exportStudyBackup() {
  const data: Record<string, unknown> = { app: 'zhongguotong', version: 1, exported: new Date().toISOString() }
  await db.transaction('r', [...progress.map(t => db.table(t)), db.settings], async () => {
    for (const t of progress) data[t] = (await db.table(t).toArray()).map(portable)
    data.settings = (await db.settings.toArray()).filter(s => isStudySetting(s.key)).map(s => ({ key: s.key, value: s.value }))
  })
  await deviceDb.transaction('r', [deviceDb.imports, deviceDb.ai, deviceDb.settings, deviceDb.texts], async () => {
    for (const t of privateTables) data[t] = await deviceDb.table(t).toArray()
    const local = await deviceDb.settings.toArray()
    data.settings = [...data.settings as Setting[], ...local.filter(s => s.key !== 'apiKey' && !isStudySetting(s.key))]
    if (inCloud) (data.texts as unknown[]).push(...await deviceDb.texts.filter(t => t.id.startsWith('import:')).toArray())
  })
  return data
}

export async function restoreStudyBackup(json: string) {
  const data = JSON.parse(json)
  if (data?.app !== 'zhongguotong') throw new Error('这不是中国通的备份文件')
  const words: SavedWord[] = data.words ?? []
  const settings: Setting[] = data.settings ?? []
  const ids = new Map(words.map(w => [w.id, progressKey(w.word)]))
  const tables = [...progress.map(t => db.table(t)), db.settings]
  const localTables = [deviceDb.imports, deviceDb.ai, deviceDb.settings, deviceDb.texts]
  async function restorePrivate() {
    for (const t of privateTables) if (Array.isArray(data[t])) await deviceDb.table(t).bulkPut(data[t])
    await deviceDb.settings.bulkPut(settings.filter(s => s.key !== 'apiKey' && !isStudySetting(s.key)))
    if (inCloud) await deviceDb.texts.bulkPut((data.texts ?? []).filter((t: { id: string }) => t.id.startsWith('import:')).map(portable))
  }
  await db.transaction('rw', inCloud ? tables : [...tables, ...localTables], async () => {
    for (const t of progress) {
      if (!Array.isArray(data[t])) continue
      let rows = data[t].map(portable)
      if (t === 'words') rows = words.map(w => ({ ...portable({ ...w }), id: inCloud ? ids.get(w.id) : w.id, card: reviveCard(w.card) }))
      else if (t === 'reviews' && inCloud) rows = rows.flatMap(r => {
        // A review of a word that isn't in the backup has nothing to attach to
        const wordId = ids.get(r.wordId as string | number)
        if (!wordId) return []
        // Private (#) ids belong to this account. Any other id is rebuilt as one, so restoring
        // another account's backup can't collide with that account's reviews on the server.
        const own = typeof r.id === 'string' && r.id.startsWith('#')
        return [{ ...r, wordId, id: own ? r.id : `#review:${wordId}:${r.at}:${r.id}` }]
      })
      else if (t !== 'reviews' && inCloud) {
        if (t === 'texts') rows = rows.filter(r => typeof r.id === 'string' && !r.id.startsWith('import:'))
        rows = rows.map(keyed)
      }
      if (t === 'eggs') rows = rows.map(r => r.card ? { ...r, card: reviveCard(r.card as Record<string, unknown>) } : r)
      await db.table(t).bulkPut(rows)
    }
    await db.settings.bulkPut(settings.filter(s => isStudySetting(s.key)).map(s => keyed({ key: s.key, value: s.value })))
    if (!inCloud) await restorePrivate()
  })
  if (inCloud) {
    await deviceDb.transaction('rw', localTables, restorePrivate)
    // A restored word may already be saved under another id
    await mergeDuplicateWords()
  }
  return words.length
}
