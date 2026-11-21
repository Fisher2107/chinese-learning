import { useLiveQuery } from 'dexie-react-hooks'
import { db, setSetting } from './db.ts'

export type FontSize = 's' | 'm' | 'l'

export interface Settings {
  fontSize: FontSize
  apiKey: string
  model: string
}

export const DEFAULTS: Settings = {
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

export const FONT_PX: Record<FontSize, number> = { s: 18, m: 21, l: 25 }
