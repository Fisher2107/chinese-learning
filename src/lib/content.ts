import type { HistoryAtlas } from './history.ts'
import { useEffect, useState } from 'react'
import type { CitiesFile, ContentIndex, DialectFile, FeedFile, PhotosFile, PlacesFile, SeriesFile, TextFile, WikiIndex, WikiPage } from './types.ts'

const BASE = import.meta.env.BASE_URL
const cache = new Map<string, Promise<unknown>>()

function getJson<T>(path: string): Promise<T> {
  let p = cache.get(path)
  if (!p) {
    p = fetch(`${BASE}${path}`).then((r) => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`)
      return r.json()
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p as Promise<T>
}

export const loadIndex = () => getJson<ContentIndex>('content/index.json')
export const loadSeries = (id: string) => getJson<SeriesFile>(`content/series/${id}.json`)
export const loadText = (id: string) => getJson<TextFile>(`content/texts/${id}.json`)
export const loadPlaces = () => getJson<PlacesFile>('content/places.json')
export const loadFeed = () => getJson<FeedFile>('content/feed.json')
export const loadCities = () => getJson<CitiesFile>('content/cities.json')
export const loadDialect = () => getJson<DialectFile>('content/dialect.json')
export const loadHistory = () => getJson<HistoryAtlas>('content/history.json')
export const loadPhotos = () => getJson<PhotosFile>('content/photos.json')
export const loadWikiIndex = () => getJson<WikiIndex>('content/wiki-index.json')
export const loadWiki = (id: string) => getJson<WikiPage>(`content/wiki/${id}.json`)

/** Loads something once per key; returns undefined while loading. */
export function useLoad<T>(load: () => Promise<T>, key: string): { data?: T; error?: string } {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key })
  useEffect(() => {
    let live = true
    load().then(
      (data) => live && setState({ key, data }),
      (e: Error) => live && setState({ key, error: e.message }),
    )
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return state.key === key ? state : {}
}
