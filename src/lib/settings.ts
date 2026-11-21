import { useLiveQuery } from 'dexie-react-hooks'
import { db, setSetting } from './db.ts'

export type PinyinMode = 'auto' | 'all' | 'off'
export type FontSize = 's' | 'm' | 'l'

export interface Settings {
  pinyin: PinyinMode
  fontSize: FontSize
  apiKey: string
  model: string
}

export const DEFAULTS: Settings = {
  pinyin: 'auto',
  fontSize: 'm',
  apiKey: '',
  model: 'gpt-6-luna',
}

export async function readSettings(): Promise<Settings> {
  const rows = await db.settings.bulkGet(Object.keys(DEFAULTS))
  const out = { ...DEFAULTS } as Record<string, unknown>
  rows.forEach((r) => r && (out[r.key] = r.value))
  return out as unknown as Settings
}

export function useSettings(): Settings {
  return useLiveQuery(readSettings, [], DEFAULTS)
}

export function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  return setSetting(key, value)
}

/** Set of words the user marked as known (no pinyin shown for them). */
export function useKnown(): Set<string> {
  const rows = useLiveQuery(() => db.known.toArray(), [], [])
  return new Set(rows.map((r) => r.word))
}

export const FONT_PX: Record<FontSize, number> = { s: 18, m: 21, l: 25 }
