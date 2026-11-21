import type { Para, SourceLink } from './types.ts'

export interface AtlasImage {
  src: string
  caption: string
  creator: string
  license: string
  sourceUrl: string
  licenseUrl?: string
}

export interface HistoryEvent {
  title: string
  date: string
  place: string
  story: Para[]
  figures: { id: string; name: string; role: string }[]
  sources: SourceLink[]
  rank?: number
  hook?: string
}

export interface HistoryPeriod {
  id: string
  title: string
  dates: string
  mapCaption: string
  overview: Para[]
  events: HistoryEvent[]
}

export interface HistoryAtlas {
  periods: HistoryPeriod[]
  media: Record<string, AtlasImage>
  glossary: Record<string, string>
}
