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
  eggs: Egg[]
  /** 集章: questions everyone from here would know (the right answer is options[answer]) */
  quiz: PlaceQuiz[]
  /** 集章's last question: what people speak here */
  dialect?: PlaceQuiz
  /** characters in the intro and 聊天彩蛋, counted when the page is marked read */
  chars: number
  series: string[]
}

export interface PlaceQuiz {
  q: string
  options: string[]
  answer: number
  why: string
  /** a page to read more on */
  more?: { route: string; title: string }
}

/** A city on the map: facts for every one, an intro and 聊天彩蛋 for the ones with a page. */
export interface CityContent {
  id: string
  /** 别称, e.g. 蓉城 for 成都 */
  nickname: string
  facts: Sentence[]
  intro: Para[]
  eggs: Egg[]
  chars: number
}

/**
 * 聊天彩蛋: a little thing worth knowing that gets a conversation going.
 * Each has a question, so it can become a flashcard.
 */
export interface Egg {
  /** "<page>#<hash of the text>", e.g. place/zhejiang#1a2b3c4d: the user's notes and flashcard hang on it */
  id: string
  /** plain text, for editing and for AI */
  text: string
  sentences: Sentence[]
  /** the flashcard question */
  q: string
  /** words to look it up with */
  find: string
  /** where it comes from */
  sources?: SourceLink[]
  /** 大家都在问: a stereotype (偏见), or a political or otherwise touchy subject (敏感) */
  flag?: EggFlag
}

export type EggFlag = '偏见' | '敏感'

/** 家乡话: a province's sayings, in the 家乡话与地方梗 collection. Same shape as 聊天彩蛋. */
export interface DialectFile {
  /** province id → its entries; provinces with none are missing */
  provinces: Record<string, Egg[]>
  glossary: Record<string, string>
}

/** 大家都在问: per province, the 为什么 questions people search for (an egg's q), answered (its text). */
export interface AskedFile extends DialectFile {
  /** when the search suggestions were looked up, e.g. 2026-11 */
  asked: string
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
  city?: string
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

/** 百科 page kinds. 景点 and the like show in a place's "必去" photos; 人物 in its people. */
export type WikiKind = '景点' | '地点' | '河流' | '山' | '湖' | '人物' | '事件' | '朝代' | '传说' | '美食' | '文化' | '建筑' | '作品' | '物产'

export interface WikiQuiz {
  q: string
  options: string[]
  answer: number
  /** shown after answering */
  why: string
  /** a photo key to show with the question */
  photo?: string
}

/** One page in the 百科 list (public/content/wiki-index.json). */
export interface WikiSummary {
  id: string
  name: string
  en: string
  py: string
  kind: WikiKind
  dates: string
  provinces: string[]
  cities: string[]
  /** where it is on the map (map coordinates), if it's a place */
  xy?: [number, number]
  /** a river on the map to draw over */
  river: string
  /** one sentence that makes you want to open it */
  lede: Sentence[]
  chars: number
  /** how many pages link here */
  links: number
}

export interface WikiIndex {
  pages: WikiSummary[]
  quiz: Record<string, WikiQuiz[]>
  /** linked to, not written yet */
  wanted: { name: string; from: string[] }[]
  glossary: Record<string, string>
}

export interface WikiPage extends Omit<WikiSummary, 'links'> {
  facts: { k: string; v: Sentence[] }[]
  body: Block[]
  /** 下一站: where to go next, each with a question that pulls you there */
  next: { route: string; title: string; hook: Sentence[] }[]
  quiz: WikiQuiz[]
  sources: SourceLink[]
  backlinks: { route: string; title: string }[]
  glossary: Record<string, string>
}

/** Photos by key: place/<id>, city/<id>, feed/<id>, series/<id>, series/<id>/<ep>, text/<id>, wiki/<id> */
export type PhotosFile = Record<string, Photo>
