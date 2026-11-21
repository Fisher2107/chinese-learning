import type { Sentence } from './zh-core.ts'

export type { Sentence, Token } from './zh-core.ts'

export interface Para {
  kind: 'p' | 'li' | 'h'
  sentences: Sentence[]
}

/** A real excerpt dropped into a story, opening into the full text. */
export interface Excerpt {
  kind: 'excerpt'
  textId: string
  title: string
  author: string
  year: number
  /** which sitting of the full text the excerpt is in (0-based) */
  sitting: number
  paras: Para[]
}

export type Block = Para | Excerpt

export interface GateQuestion {
  q: Sentence
  options: Sentence[]
  answer: number
}

export interface Episode {
  n: number
  title: string
  beat: string
  chars: number
  blocks: Block[]
  gate: GateQuestion[]
}

export interface SourceLink {
  title: string
  url: string
}

export interface SeriesSummary {
  id: string
  title: string
  subtitle: string
  place: string
  kind: string
  color: string
  episodes: { n: number; title: string; beat: string }[]
}

export interface SeriesFile extends SeriesSummary {
  description: Para[]
  full: Episode[]
  after: Block[]
  sources: SourceLink[]
  inspiration: string[]
  glossary: Record<string, string>
}

export interface TextSummary {
  id: string
  title: string
  author: string
  year: number
  from: string
  chars: number
  sittings: number
}

export interface TextFile extends TextSummary {
  source: string
  license: string
  parts: Para[][]
  glossary: Record<string, string>
}

export interface ContentIndex {
  series: SeriesSummary[]
  texts: TextSummary[]
}
