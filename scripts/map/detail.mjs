// The explorable map (src/data/china-detail.json): finer province shapes, every prefecture-level
// city, a few famous towns, rivers, lakes, neighbouring countries and landform labels, all in the
// same projection as china-map.json. Called from scripts/build-map.mjs.
import { readFile, writeFile } from 'node:fs/promises'
import mapshaper from 'mapshaper'
import { geoPath, geoContains, geoDistance, geoCentroid } from 'd3-geo'
import { feature } from 'topojson-client'
import { numericToMarks } from '../../src/lib/zh-core.ts'

/** Neighbours are cut off outside this lon/lat box: far enough that the cut is off screen. */
const BBOX = [40, -5, 170, 70]

// Natural Earth river names → Chinese. `box` [lon0, lat0, lon1, lat1] keeps only the part of a
// shared name that is this river; `at` is where the label goes (else halfway along).
const RIVERS = [
  { zh: '长江', ne: ['Chang Jiang', 'Yangtze'], major: true, at: [113.6, 29.95] },
  { zh: '金沙江', ne: ['Jinsha'], major: true, at: [100.6, 27.2] },
  { zh: '通天河', ne: ['Tongtian'], major: true },
  { zh: '黄河', ne: ['Huang'], major: true, at: [109.8, 40.6] },
  { zh: '淮河', ne: ['Huai'], at: [116.6, 32.75] },
  { zh: '珠江', ne: ['Xi'], at: [112.2, 23.3] },
  { zh: '红水河', ne: ['Hongshui'] },
  { zh: '黑龙江', ne: ['Heilong Jiang', 'Amur'], box: [119, 45, 136, 54], at: [127.4, 49.9] },
  { zh: '额尔古纳河', ne: ['Argun’'], box: [115, 47, 122, 54] },
  { zh: '乌苏里江', ne: ['Ussuri'], box: [130, 44, 136, 49] },
  { zh: '松花江', ne: ['Songhua', 'Di’er Songhua'], at: [128.8, 46.3] },
  { zh: '嫩江', ne: ['Nen'] },
  { zh: '辽河', ne: ['Liao'], box: [118, 40, 125, 45] },
  { zh: '鸭绿江', ne: ['Yalu'] },
  { zh: '图们江', ne: ['Tumen'] },
  { zh: '澜沧江', ne: ['Lancang'], at: [99.3, 25.3] },
  { zh: '怒江', ne: ['Nu'], box: [90, 23, 100, 33] },
  { zh: '雅鲁藏布江', ne: ['Yarlung', 'Maquan'], box: [80, 27, 96, 32], at: [88.6, 29.15] },
  { zh: '塔里木河', ne: ['Tarim'], at: [84.5, 40.9] },
  { zh: '叶尔羌河', ne: ['Yarkant'], box: [73, 35, 82, 41] },
  { zh: '额尔齐斯河', ne: ['Ertis', 'Ertix'], box: [85, 46, 91, 49] },
  { zh: '伊犁河', ne: ['Ile'], box: [80, 43, 85, 45] },
  { zh: '汉江', ne: ['Han'], box: [105, 30, 115, 34.5] },
  { zh: '嘉陵江', ne: ['Jialing'] },
  { zh: '岷江', ne: ['Min'], box: [102, 28, 105, 34] },
  { zh: '闽江', ne: ['Min'], box: [116, 25, 120, 28.5] },
  { zh: '大渡河', ne: ['Dadu'] },
  { zh: '雅砻江', ne: ['Yalong'] },
  { zh: '乌江', ne: ['Wu'], box: [104, 26, 109, 30.5] },
  { zh: '湘江', ne: ['Xiang'] },
  { zh: '赣江', ne: ['Gan'], box: [113, 24, 117, 30] },
  { zh: '沅江', ne: ['Yuan'], box: [106, 26, 112.5, 29.5] },
  { zh: '渭河', ne: ['Wei'], box: [104, 34, 110.5, 35.5] },
  { zh: '汾河', ne: ['Fen'] },
  // 新安江 → 富春江 → 钱塘江: Natural Earth calls the whole river "Fuchun" and stops at 杭州, so the
  // estuary out past 盐官 (where people watch the tidal bore) is added by hand.
  {
    zh: '钱塘江', ne: ['Fuchun'], at: [119.9, 29.93], lz: 1.6,
    extra: [[120.13, 30.2], [120.26, 30.29], [120.4, 30.33], [120.53, 30.4], [120.7, 30.37], [120.92, 30.36]],
  },
  { zh: '瓯江', ne: ['Ou'], box: [118.5, 27.5, 121, 28.6] },
  // 京杭大运河 is a canal, so Natural Earth doesn't have it: drawn by hand from 北京 to 杭州
  // through the cities it passes (通州, 天津, 德州, 临清, 济宁, 徐州, 淮安, 扬州, 镇江, 苏州, 嘉兴).
  {
    zh: '京杭大运河', ne: [], at: [119.1, 33.3], lz: 1.6,
    extra: [
      [116.4, 39.91], [116.66, 39.9], [117.0, 39.45], [117.2, 39.13], [116.86, 38.3], [116.3, 37.45],
      [115.7, 36.84], [115.98, 36.45], [116.3, 35.95], [116.59, 35.41], [116.95, 34.95], [117.4, 34.55],
      [117.95, 34.32], [118.3, 33.96], [118.75, 33.7], [119.02, 33.6], [119.3, 33.2], [119.45, 32.78],
      [119.43, 32.39], [119.45, 32.2], [119.6, 32.0], [119.95, 31.78], [120.3, 31.57], [120.6, 31.3],
      [120.65, 31.0], [120.75, 30.75], [120.45, 30.55], [120.17, 30.3],
    ],
  },
]

// Lakes worth a label (Natural Earth's Chinese names → ours)
const LAKES = {
  青海湖: '青海湖', 鄱阳湖: '鄱阳湖', 洞庭湖: '洞庭湖', 太湖: '太湖', 洪泽湖: '洪泽湖', 巢湖: '巢湖', 纳木错: '纳木错',
  博斯腾湖: '博斯腾湖', 呼倫湖: '呼伦湖', 色林错: '色林错', 羊卓雍错: '羊卓雍错', 玛旁雍错: '玛旁雍错', 新安江水库: '千岛湖',
  丹江口水库: '丹江口水库', 兴凯湖: '兴凯湖', 微山湖: '微山湖', 洪湖: '洪湖',
}

// China's neighbours: where their names go (better spots than Natural Earth's for this map)
const COUNTRIES = {
  MNG: ['蒙古', 103, 46.6], RUS: ['俄罗斯', 113, 53.2], KAZ: ['哈萨克斯坦', 75.5, 47.5], KGZ: ['吉尔吉斯斯坦', 74.5, 41.6],
  TJK: ['塔吉克斯坦', 71.8, 38.9], AFG: ['阿富汗', 68.8, 35.5], PAK: ['巴基斯坦', 71, 31.5], IND: ['印度', 79, 25.5],
  NPL: ['尼泊尔', 84, 28.2], BTN: ['不丹', 90.4, 27.45], BGD: ['孟加拉国', 90.2, 23.8], MMR: ['缅甸', 96, 21.5],
  LAO: ['老挝', 102.6, 19.8], VNM: ['越南', 105.6, 21.2], THA: ['泰国', 101, 16], KHM: ['柬埔寨', 104.8, 13],
  PRK: ['朝鲜', 126.8, 40], KOR: ['韩国', 127.9, 36.4], JPN: ['日本', 134, 34.6], PHL: ['菲律宾', 121.3, 16.5],
  UZB: ['乌兹别克斯坦', 69, 41],
}
/** The 14 countries China shares a land border with. */
const LAND_BORDER = new Set(['PRK', 'RUS', 'MNG', 'KAZ', 'KGZ', 'TJK', 'AFG', 'PAK', 'IND', 'NPL', 'BTN', 'MMR', 'LAO', 'VNM'])
/** Natural Earth's Chinese names that people don't say */
const COUNTRY_NAMES = { KOR: '韩国', PRK: '朝鲜', MNG: '蒙古', LAO: '老挝', COD: '刚果（金）', COG: '刚果（布）', CZE: '捷克', SDS: '南苏丹', CAF: '中非', SAH: '西撒哈拉' }
/**
 * The rest of the world, drawn around China in the same projection so the map simply carries on.
 * The Americas are left out: this conic projection, centred on China, can only show them torn in two.
 */
const WORLD_CONTINENTS = new Set(['Asia', 'Europe', 'Africa', 'Oceania'])

// Landforms and seas: [name, lon, lat, kind]. Kinds: shan (range), peak, land (plateau, basin,
// desert, plain), sea.
const LABELS = [
  ['喜马拉雅山脉', 85.6, 28.35, 'shan'], ['珠穆朗玛峰', 86.925, 27.988, 'peak'], ['昆仑山脉', 84, 35.9, 'shan'],
  ['天山山脉', 84.6, 42.9, 'shan'], ['阿尔泰山', 88.3, 48.1, 'shan'], ['祁连山脉', 98.6, 38.7, 'shan'],
  ['秦岭', 108.6, 33.85, 'shan'], ['大巴山', 107.8, 32.15, 'shan'], ['太行山', 113.55, 37.2, 'shan'],
  ['大兴安岭', 121.4, 49.6, 'shan'], ['小兴安岭', 128.4, 48.4, 'shan'], ['长白山', 128.06, 42.0, 'peak'],
  ['横断山脉', 99.1, 28.9, 'shan'], ['武夷山脉', 117.4, 27.1, 'shan'], ['南岭', 112.6, 25.15, 'shan'],
  ['阴山', 110.2, 41.35, 'shan'], ['唐古拉山', 92.2, 32.9, 'shan'], ['冈底斯山', 82.6, 30.9, 'shan'],
  ['泰山', 117.1, 36.26, 'peak'], ['黄山', 118.17, 30.13, 'peak'], ['华山', 110.08, 34.48, 'peak'],
  ['五台山', 113.58, 39.03, 'peak'], ['玉龙雪山', 100.18, 27.1, 'peak'], ['峨眉山', 103.33, 29.52, 'peak'],
  ['青藏高原', 88.6, 33.6, 'land'], ['黄土高原', 108.2, 36.9, 'land'], ['内蒙古高原', 112, 43.6, 'land'],
  ['云贵高原', 104.6, 25.7, 'land'], ['四川盆地', 105.6, 30.2, 'land'], ['塔克拉玛干沙漠', 83, 38.9, 'land'],
  ['准噶尔盆地', 87, 45.5, 'land'], ['柴达木盆地', 94.6, 37.3, 'land'], ['东北平原', 125, 45.2, 'land'],
  ['华北平原', 116.1, 36.6, 'land'], ['戈壁', 104.5, 42.4, 'land'], ['河西走廊', 100.6, 39.1, 'land'],
  ['渤海', 120.2, 38.85, 'sea'], ['黄海', 123.6, 35.6, 'sea'], ['东海', 125, 29.2, 'sea'], ['南海', 114.5, 17.6, 'sea'],
  ['台湾海峡', 119.7, 24.25, 'sea'],
]

// Not prefecture-level, or no longer: districts of municipalities and renamed 地区
const SKIP = new Set(['浦东新区', '滨海新区', '吐鲁番地区', '海东地区'])

// Municipalities, SARs and Taiwan's cities aren't in the Wikidata list: [name, province, lon, lat, id?]
const EXTRA_CITIES = [
  ['北京', 'beijing', 116.407, 39.904], ['天津', 'tianjin', 117.2, 39.084], ['上海', 'shanghai', 121.474, 31.23],
  ['重庆', 'chongqing', 106.551, 29.563], ['香港', 'xianggang', 114.17, 22.3], ['澳门', 'aomen', 113.544, 22.199],
  ['台北', 'taiwan', 121.565, 25.033], ['台中', 'taiwan', 120.674, 24.148], ['台南', 'taiwan', 120.227, 22.999],
  ['高雄', 'taiwan', 120.301, 22.627], ['花莲', 'taiwan', 121.604, 23.977], ['新竹', 'taiwan', 120.968, 24.804],
]

// Famous towns people talk about that aren't prefecture-level: [name, province, lon, lat]
const SPOTS = [
  ['敦煌', 'gansu', 94.662, 40.142], ['平遥', 'shanxi', 112.174, 37.189], ['乌镇', 'zhejiang', 120.488, 30.745],
  ['婺源', 'jiangxi', 117.861, 29.248], ['阳朔', 'guangxi', 110.496, 24.778], ['凤凰', 'hunan', 109.599, 27.948],
  ['漠河', 'heilongjiang', 122.538, 52.972], ['义乌', 'zhejiang', 120.075, 29.306], ['曲阜', 'shandong', 116.986, 35.581],
  ['稻城', 'sichuan', 100.298, 29.037], ['都江堰', 'sichuan', 103.647, 30.988], ['九寨沟', 'sichuan', 103.918, 33.252],
  ['满洲里', 'neimenggu', 117.379, 49.598], ['霍尔果斯', 'xinjiang', 80.42, 44.213], ['武夷山', 'fujian', 118.035, 27.756],
  ['庐山', 'jiangxi', 115.98, 29.55], ['宏村', 'anhui', 117.99, 30.0], ['三星堆', 'sichuan', 104.25, 30.99],
  ['昆山', 'jiangsu', 120.981, 31.385], ['瑞丽', 'yunnan', 97.851, 24.013],
]

const ETHNIC = ['藏族', '羌族', '彝族', '回族', '蒙古族', '蒙古', '哈萨克', '柯尔克孜', '傣族', '景颇族', '白族', '哈尼族', '壮族', '苗族', '布依族', '侗族', '土家族', '朝鲜族', '傈僳族']

/** 甘孜藏族自治州 → 甘孜, 锡林郭勒盟 → 锡林郭勒, 成都市 → 成都 (but 吉林市 stays, and 海南州 isn't 海南). */
function shortName(full) {
  if (full === '吉林市') return '吉林市'
  if (full === '海南藏族自治州') return '海南州'
  let s = full.replace(/(市|地区|盟)$/, '')
  if (s.endsWith('自治州')) {
    s = s.slice(0, -3)
    for (let again = true; again; ) {
      again = false
      for (const e of ETHNIC)
        if (s.endsWith(e) && s.length > e.length) {
          s = s.slice(0, -e.length)
          again = true
        }
    }
  }
  return s
}

/**
 * Runs mapshaper commands on a FeatureCollection and reads the result back through TopoJSON,
 * which keeps polygon rings wound the way d3 expects (plain GeoJSON output can come back
 * inverted, drawing "everything except the lake").
 */
async function shape(commands, fc) {
  const out = await mapshaper.applyCommands(`-i in.json ${commands} -o out.json format=topojson`, { 'in.json': JSON.stringify(fc) })
  const topo = JSON.parse(out['out.json'])
  return feature(topo, topo.objects[Object.keys(topo.objects)[0]])
}

const parsePoint = (wkt) => wkt.match(/Point\(([-\d.]+) ([-\d.]+)\)/).slice(1).map(Number)

export async function build({ features, fc, projection, WIDTH, HEIGHT, get }) {
  const path = geoPath(projection).digits(1)
  const project = (lonlat) => projection(lonlat).map((n) => Math.round(n * 10) / 10)
  const dict = JSON.parse(await readFile('public/data/dict.json', 'utf8'))

  /** The place-name reading in tone numbers: 六安 → "Lu4 an1". Proper-noun readings first. */
  function numeric(word) {
    const e = dict[word]
    const proper = e?.find(([p]) => /^[A-Z]/.test(p)) ?? e?.[0]
    return proper ? proper[0] : [...word].map((c) => dict[c]?.[0]?.[0] ?? '').join(' ')
  }
  /** Toneless pinyin for ids and for accepting typed answers: 六安 → luan */
  const pin = (word) => numeric(word).toLowerCase().replace(/[\d\s:]/g, '')
  /** Pinyin with tone marks, shown when a name is tapped: 六安 → lù'ān */
  const py = (word) => numericToMarks(numeric(word)).toLowerCase()

  // ---------- provinces, finer than the locator map ----------
  const provOut = await mapshaper.applyCommands(
    '-i in.json -dissolve id copy-fields=id -simplify 14% keep-shapes -clean -o out.json format=topojson',
    { 'in.json': JSON.stringify({ type: 'FeatureCollection', features }) },
  )
  const ptopo = JSON.parse(provOut['out.json'])
  const pfc = feature(ptopo, ptopo.objects[Object.keys(ptopo.objects)[0]])
  const provinces = Object.fromEntries(pfc.features.map((f) => [f.properties.id, path(f)]))

  // ---------- the rest of the world ----------
  const countries = await get('ne_50m_admin_0_countries.geojson')
  const CHINA_PARTS = new Set(['CHN', 'TWN', 'HKG', 'MAC'])
  const world = countries.features
    .filter((f) => !CHINA_PARTS.has(f.properties.ADM0_A3) && (WORLD_CONTINENTS.has(f.properties.CONTINENT) || COUNTRIES[f.properties.ADM0_A3]))
    .map((f) => ({ type: 'Feature', properties: { a3: f.properties.ADM0_A3 }, geometry: f.geometry }))
  const cFc = await shape(`-filter-islands min-area=3000km2 -simplify dp interval=14000 keep-shapes`, { type: 'FeatureCollection', features: world })
  const props = new Map(countries.features.map((f) => [f.properties.ADM0_A3, f.properties]))
  const worldBox = [Infinity, Infinity, -Infinity, -Infinity]
  const neighbours = cFc.features
    .map((f) => {
      const a3 = f.properties.a3
      const p = props.get(a3)
      const [zh, lon, lat] = COUNTRIES[a3] ?? [COUNTRY_NAMES[a3] ?? p.NAME_ZH, p.LABEL_X, p.LABEL_Y]
      const [x, y] = project([lon, lat])
      const d = geoPath(projection).digits(0)(f)
      if (!d) return undefined
      const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(f)
      // far-off islands of European countries (Réunion…) would stretch the world box
      if (x1 - x0 < 2500) {
        worldBox[0] = Math.min(worldBox[0], x0)
        worldBox[1] = Math.min(worldBox[1], y0)
        worldBox[2] = Math.max(worldBox[2], x1)
        worldBox[3] = Math.max(worldBox[3], y1)
      }
      return { id: a3, zh, en: p.NAME_EN, d, x, y, rank: COUNTRIES[a3] ? 1 : p.LABELRANK, border: LAND_BORDER.has(a3) || undefined }
    })
    .filter(Boolean)

  // ---------- rivers ----------
  const riverSrc = await get('ne_10m_rivers_lake_centerlines.geojson')
  const inBox = (box) => (f) => {
    if (!box) return true
    const c = JSON.stringify(f.geometry.coordinates).match(/-?\d+(\.\d+)?/g).map(Number)
    let hit = 0
    for (let i = 0; i < c.length; i += 2) if (c[i] >= box[0] && c[i] <= box[2] && c[i + 1] >= box[1] && c[i + 1] <= box[3]) hit++
    return hit > c.length / 4
  }
  const riverFeatures = []
  for (const r of RIVERS) {
    for (const f of riverSrc.features.filter((f) => f.geometry && r.ne.includes(f.properties.name)).filter(inBox(r.box)))
      riverFeatures.push({ type: 'Feature', properties: { zh: r.zh }, geometry: f.geometry })
    if (r.extra) riverFeatures.push({ type: 'Feature', properties: { zh: r.zh }, geometry: { type: 'LineString', coordinates: r.extra } })
  }
  const rOut = await mapshaper.applyCommands(
    `-i in.json -clip bbox=${BBOX.join(',')} -dissolve zh -simplify dp interval=1500 -o out.json format=geojson`,
    { 'in.json': JSON.stringify({ type: 'FeatureCollection', features: riverFeatures }) },
  )
  const rivers = JSON.parse(rOut['out.json']).features.map((f) => {
    const r = RIVERS.find((x) => x.zh === f.properties.zh)
    const lines = f.geometry.type === 'MultiLineString' ? f.geometry.coordinates : [f.geometry.coordinates]
    const pts = lines.flat()
    let at
    if (r.at) at = pts.reduce((a, b) => (geoDistance(b, r.at) < geoDistance(a, r.at) ? b : a))
    else {
      const longest = lines.reduce((a, b) => (b.length > a.length ? b : a))
      at = longest[Math.floor(longest.length / 2)]
    }
    const [x, y] = project(at)
    return { zh: r.zh, major: !!r.major, d: path(f), x, y, lz: r.lz ?? (r.major ? 1.25 : 3) }
  })

  // ---------- lakes ----------
  const lakeSrc = await get('ne_10m_lakes.geojson')
  const lakeFeatures = lakeSrc.features
    .filter((f) => f.geometry && (f.properties.scalerank <= 6 || LAKES[f.properties.name_zh]))
    .filter((f) => features.some((p) => geoContains(p, geoCentroid(f))) || LAKES[f.properties.name_zh])
    .map((f) => ({ type: 'Feature', properties: { zh: LAKES[f.properties.name_zh] ?? '' }, geometry: f.geometry }))
  const lakeFc = await shape('-simplify dp interval=1200 keep-shapes', { type: 'FeatureCollection', features: lakeFeatures })
  const lakes = {
    d: path(lakeFc),
    labels: lakeFc.features
      .filter((f) => f.properties.zh)
      .map((f) => {
        const [x, y] = project(geoCentroid(f))
        return { zh: f.properties.zh, x, y }
      }),
  }

  // ---------- cities ----------
  const raw = JSON.parse(await readFile('data/raw/wikidata-cities.json', 'utf8')).results.bindings
  // One entry per name: Wikidata has a few duplicates (a second 福州 with no population)
  const byName = new Map()
  for (const r of raw) {
    const full = r.zh?.value
    if (!full) continue
    const c = byName.get(full) ?? { full, lonlat: parsePoint(r.coord.value), pop: 0 }
    const pop = Number(r.pop?.value ?? 0)
    if (pop > c.pop) Object.assign(c, { pop, lonlat: parsePoint(r.coord.value) })
    byName.set(full, c)
  }
  // Which province a point is in, on the full-detail outlines; for points just off the coast
  // (北海, 珠海, 舟山), the province with the nearest border point
  const provinceAt = (lonlat) => {
    const hit = features.find((f) => geoContains(f, lonlat))
    if (hit) return hit.properties.id
    let best, bestD = Infinity
    for (const f of features)
      for (const pt of JSON.stringify(f.geometry.coordinates).match(/-?\d+(\.\d+)?,-?\d+(\.\d+)?/g)) {
        const d = geoDistance(pt.split(',').map(Number), lonlat)
        if (d < bestD) [best, bestD] = [f.properties.id, d]
      }
    return best
  }
  const capitals = new Map(JSON.parse(await readFile('public/content/places.json', 'utf8')).places.map((p) => [p.capital, p.id]))

  const list = []
  for (const c of byName.values()) {
    if (!c.full || SKIP.has(c.full)) continue
    const name = shortName(c.full)
    list.push({ name, full: c.full, prov: provinceAt(c.lonlat), lonlat: c.lonlat, pop: Math.round(c.pop / 1e4), kind: capitals.has(name) ? 'capital' : 'city' })
  }
  for (const [name, prov, lon, lat] of EXTRA_CITIES)
    list.push({ name, full: name, prov, lonlat: [lon, lat], pop: 0, kind: prov === 'taiwan' ? (name === '台北' ? 'capital' : 'city') : 'muni' })
  for (const [name, prov, lon, lat] of SPOTS) list.push({ name, full: name, prov, lonlat: [lon, lat], pop: 0, kind: 'spot' })

  // ids: pinyin, the bigger city keeps the plain one (苏州 suzhou, 宿州 suzhou-anhui)
  list.sort((a, b) => b.pop - a.pop)
  const used = new Set()
  const cities = list.map((c) => {
    const p = pin(c.name).replace(/ü/g, 'v')
    let id = c.kind === 'muni' ? c.prov : p
    if (used.has(id)) id = `${p}-${c.prov}`
    used.add(id)
    const rank = c.name === '北京' ? 1 : c.kind === 'capital' || c.kind === 'muni' ? 2 : c.kind === 'spot' ? 5 : c.pop >= 600 ? 3 : 4
    const [x, y] = project(c.lonlat)
    return { id, name: c.name, full: c.full, prov: c.prov, x, y, pop: c.pop, kind: c.kind, rank, pin: p, py: py(c.name) }
  })
  cities.sort((a, b) => a.rank - b.rank || b.pop - a.pop)

  const labels = LABELS.map(([zh, lon, lat, kind]) => {
    const [x, y] = project([lon, lat])
    return { zh, x, y, kind }
  })

  // province names with readings, for the 认地图 test
  const placeNames = Object.fromEntries(
    JSON.parse(await readFile('public/content/places.json', 'utf8')).places.map((p) => [p.id, { name: p.name, full: p.full, py: py(p.name), pin: pin(p.name) }]),
  )
  // the projection, so the content build can put 百科 places (given in lon/lat) on this map
  const proj = { scale: projection.scale(), translate: projection.translate() }
  const json = JSON.stringify({ width: WIDTH, height: HEIGHT, proj, world: worldBox.map((n) => Math.round(n)), provinces, neighbours, rivers, lakes, cities, labels, placeNames })
  await writeFile('src/data/china-detail.json', json)
  console.log(`detail: ${cities.length} cities, ${rivers.length} rivers, ${lakes.labels.length} lake labels, ${neighbours.length} countries, world ${worldBox.map(Math.round)}, ${(json.length / 1024).toFixed(0)} KB`)
  const byProv = {}
  for (const c of cities) (byProv[c.prov] ??= []).push(`${c.name}(${c.id})`)
  for (const [p, cs] of Object.entries(byProv)) console.log(`  ${p}: ${cs.join(' ')}`)
}
