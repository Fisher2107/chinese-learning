import type { Sentence } from './zh-core.ts'

export type { Sentence, Token } from './zh-core.ts'

export interface Para {
  /** q: a line quoted from an original text (a poem, 《史记》…) */
  kind: 'p' | 'li' | 'h' | 'q'
  sentences: Sentence[]
}

/** A picture in the text of a 百科 page, under the paragraph it belongs to. */
export interface Picture {
  kind: 'img'
  /** photo key (wiki/<id>/<n>) */
  key: string
  caption: Sentence[]
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

export type Block = Para | Excerpt | Picture

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
  /** whose account it is: 原典 (the original text), 官方, 学者, 媒体, 百科 */
  kind?: '原典' | '官方' | '学者' | '媒体' | '百科'
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
}

/** 家乡话: a province's sayings, in the 家乡话与地方梗 collection. Same shape as 聊天彩蛋. */
export interface DialectFile {
  /** province id → its entries; provinces with none are missing */
  provinces: Record<string, Egg[]>
  glossary: Record<string, string>
}

/**
 * A block of provinces on the 分区 map (content/regions.md): one of the seven regions taught in
 * geography class, or a name people use for a few provinces together, like 江浙沪.
 */
export interface RegionInfo {
  id: string
  name: string
  kind: '分区' | '常说'
  provinces: string[]
  intro: Sentence[]
  /** 网上的说法: what people joke about online, e.g. in short videos */
  online: Sentence[]
  /** provinces whose page shows `online` */
  onlineFor: string[]
  /** 刷一刷 cards about `online` */
  cards: string[]
}

export interface RegionsFile {
  regions: RegionInfo[]
  glossary: Record<string, string>
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
  /** eras of the 历史长卷 it belongs to */
  era: string[]
  /** a sensitive topic: its page says why */
  sensitive: boolean
  provinces: string[]
  cities: string[]
  /** where it is on the map (map coordinates), if it's a place */
  xy?: [number, number]
  /** a river on the map to draw over */
  river: string
  /** what the map pin is called when it isn't the page's name (a person's 纪念地: 司马迁祠) */
  pin?: string
  /** one sentence that makes you want to open it */
  lede: Sentence[]
  /** a question another page asks about this one (its next: hook), for 你知道吗 cards */
  hook?: Sentence[]
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
  /** 为什么敏感: 官方, 争议, 在中国, 聊天 */
  why: { k: string; v: Sentence[] }[]
  /** 读原文: the original lines (kind q) and what they mean */
  original: Block[]
  /** 下一站: where to go next, each with a question that pulls you there */
  next: { route: string; title: string; hook: Sentence[] }[]
  quiz: WikiQuiz[]
  sources: SourceLink[]
  backlinks: { route: string; title: string }[]
  glossary: Record<string, string>
}

/** Photos by key: place/<id>, city/<id>, feed/<id>, series/<id>, series/<id>/<ep>, text/<id>, wiki/<id> */
export type PhotosFile = Record<string, Photo>
