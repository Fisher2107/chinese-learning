import DETAIL from '../data/china-detail.json'

export { DETAIL }
export type MapCity = (typeof DETAIL.cities)[number]
export const CITIES: MapCity[] = DETAIL.cities
export const CITY_BY_ID = new Map(CITIES.map((c) => [c.id, c]))

/** The five 自治区 call their capital a 首府, not a 省会. */
const REGION_SEATS = new Set(['neimenggu', 'guangxi', 'xizang', 'ningxia', 'xinjiang'])

/** 地级市, 自治州, 地区, 盟 … in words a learner would use. */
export function cityKind(c: MapCity): string {
  if (c.kind === 'muni') return c.prov === 'xianggang' || c.prov === 'aomen' ? '特别行政区' : '直辖市'
  if (c.kind === 'spot') return '小城 · 名胜'
  if (c.full.endsWith('自治州')) return '自治州'
  if (c.full.endsWith('地区')) return '地区'
  if (c.full.endsWith('盟')) return '盟'
  if (c.kind === 'capital') return c.prov === 'taiwan' ? '城市' : REGION_SEATS.has(c.prov) ? '首府' : '省会'
  return '城市'
}

/** Cities of one province, biggest first, its capital at the top. */
export function citiesOf(prov: string): MapCity[] {
  return CITIES.filter((c) => c.prov === prov).sort((a, b) => a.rank - b.rank || b.pop - a.pop)
}

/** A small box around a city, for zooming to it. */
export function cityBox(c: MapCity, r = 18): [number, number, number, number] {
  return [c.x - r, c.y - r, c.x + r, c.y + r]
}

/** canals are drawn dashed, so they don't read as rivers */
export const isCanal = (zh: string) => zh.endsWith('运河')
