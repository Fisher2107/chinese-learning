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
  /** ids of the provinces the series is about (content/places) */
  provinces: string[]
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
  feed: { id: string; date: string; province: string; series: string }[]
}

/** One provincial-level division (content/places/<id>.md). */
export interface Place {
  id: string
  name: string
  full: string
  type: '省' | '自治区' | '直辖市' | '特别行政区'
  short: string
  /** a second 简称, e.g. 蜀 for 四川 */
  alias: string
  /** 省会; empty for 直辖市 and 特别行政区 */
  capital: string
  region: Region
  /** how to handle a sensitive topic in conversation */
  note: Sentence[]
  intro: Para[]
  /** 聊天彩蛋: things worth knowing to start a conversation */
  eggs: Para[]
  /** characters in the intro and 聊天彩蛋, counted when the page is marked read */
  chars: number
  series: string[]
}

/** A city on the map: facts for every one, an intro and 聊天彩蛋 for the ones with a page. */
export interface CityContent {
  id: string
  /** 别称, e.g. 蓉城 for 成都 */
  nickname: string
  facts: Sentence[]
  intro: Para[]
  eggs: Para[]
  chars: number
}

export interface CitiesFile {
  cities: CityContent[]
  glossary: Record<string, string>
}

export type Region = '华北' | '东北' | '华东' | '华中' | '华南' | '西南' | '西北'

export interface PlacesFile {
  places: Place[]
  glossary: Record<string, string>
}

/** A 刷一刷 card (content/feed/<slug>.md): a hook question, then 150–300 字. */
export interface FeedCard {
  id: string
  date: string
  title: Sentence[]
  province: string
  series: string
  tags: string[]
  chars: number
  body: Para[]
  sources: SourceLink[]
  inspiration: string[]
}

export interface FeedFile {
  cards: FeedCard[]
  glossary: Record<string, string>
}

/** A photo from Wikimedia Commons, credited as its licence asks. */
export interface Photo {
  src: string
  w: number
  h: number
  /** who took it */
  by: string
  /** licence, e.g. "CC BY-SA 4.0" */
  lic: string
  /** its Commons page */
  page: string
}

/** Photos by key: place/<id>, city/<id>, feed/<id>, series/<id>, series/<id>/<ep>, text/<id> */
export type PhotosFile = Record<string, Photo>
