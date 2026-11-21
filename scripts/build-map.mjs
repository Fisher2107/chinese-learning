// Builds src/data/china-map.json: the 34 provincial-level divisions as SVG paths, with label
// points and neighbours, from Natural Earth (public domain).
//
//   node scripts/build-map.mjs
//
// Run by hand when the map needs to change; the output is committed. It downloads the
// Natural Earth files into data/raw/ne/ the first time.
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import mapshaper from 'mapshaper'
import { geoConicEqualArea, geoPath, geoArea } from 'd3-geo'
import { feature, neighbors } from 'topojson-client'

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson'
const RAW = 'data/raw/ne'

// Natural Earth English name → our id
const IDS = {
  Beijing: 'beijing', Tianjin: 'tianjin', Hebei: 'hebei', Shanxi: 'shanxi', 'Inner Mongol': 'neimenggu',
  Liaoning: 'liaoning', Jilin: 'jilin', Heilongjiang: 'heilongjiang', Shanghai: 'shanghai', Jiangsu: 'jiangsu',
  Zhejiang: 'zhejiang', Anhui: 'anhui', Fujian: 'fujian', Jiangxi: 'jiangxi', Shandong: 'shandong',
  Henan: 'henan', Hubei: 'hubei', Hunan: 'hunan', Guangdong: 'guangdong', Guangxi: 'guangxi',
  Hainan: 'hainan', 'Paracel Islands': 'hainan', Chongqing: 'chongqing', Sichuan: 'sichuan', Guizhou: 'guizhou',
  Yunnan: 'yunnan', Xizang: 'xizang', Shaanxi: 'shaanxi', Gansu: 'gansu', Qinghai: 'qinghai',
  Ningxia: 'ningxia', Xinjiang: 'xinjiang',
}
const OTHER = { TWN: 'taiwan', HKG: 'xianggang', MAC: 'aomen' }
// These come from a different file, so their borders aren't shared arcs
const EXTRA_NEIGHBOURS = { xianggang: ['guangdong'], aomen: ['guangdong'] }

async function get(file) {
  const path = `${RAW}/${file}`
  if (!existsSync(path)) {
    await mkdir(RAW, { recursive: true })
    const res = await fetch(`${NE}/${file}`)
    if (!res.ok) throw new Error(`${file}: ${res.status}`)
    await writeFile(path, Buffer.from(await res.arrayBuffer()))
  }
  return JSON.parse(await readFile(path, 'utf8'))
}

const admin1 = await get('ne_10m_admin_1_states_provinces.geojson')
const countries = await get('ne_50m_admin_0_countries.geojson')

const features = [
  ...admin1.features
    .filter((f) => f.properties.adm0_a3 === 'CHN')
    .map((f) => {
      const id = IDS[f.properties.name]
      if (!id) throw new Error(`unmapped province: ${f.properties.name}`)
      return { type: 'Feature', properties: { id }, geometry: f.geometry }
    }),
  ...countries.features
    .filter((f) => OTHER[f.properties.ADM0_A3])
    .map((f) => ({ type: 'Feature', properties: { id: OTHER[f.properties.ADM0_A3] } , geometry: f.geometry })),
]

// Merge pieces per id, simplify while keeping shared borders, output topology
const out = await mapshaper.applyCommands(
  '-i in.json -dissolve id copy-fields=id -simplify 4% keep-shapes -clean -o out.json format=topojson',
  { 'in.json': JSON.stringify({ type: 'FeatureCollection', features }) },
)
const topo = JSON.parse(out['out.json'])
const objectName = Object.keys(topo.objects)[0]
const geoms = topo.objects[objectName].geometries
const fc = feature(topo, topo.objects[objectName])
const nb = neighbors(geoms)

const WIDTH = 1000
const projection = geoConicEqualArea().parallels([25, 47]).rotate([-105, 0]).fitWidth(WIDTH - 20, fc)
const [[, y0], [, y1]] = geoPath(projection).bounds(fc)
projection.translate([projection.translate()[0] + 10, projection.translate()[1] - y0 + 10])
const path = geoPath(projection).digits(1)
const HEIGHT = Math.ceil(y1 - y0 + 20)

/** Label point: centroid of the largest polygon, so islands don't pull it into the sea. */
function labelPoint(f) {
  const g = f.geometry
  if (g.type !== 'MultiPolygon') return path.centroid(f)
  const biggest = g.coordinates.reduce((a, b) => (geoArea({ type: 'Polygon', coordinates: b }) > geoArea({ type: 'Polygon', coordinates: a }) ? b : a))
  return path.centroid({ type: 'Feature', geometry: { type: 'Polygon', coordinates: biggest } })
}

const provinces = fc.features.map((f, i) => {
  const id = f.properties.id
  const [cx, cy] = labelPoint(f).map((n) => Math.round(n))
  const [[bx0, by0], [bx1, by1]] = path.bounds(f)
  const neighbours = new Set([...nb[i].map((j) => fc.features[j].properties.id), ...(EXTRA_NEIGHBOURS[id] ?? [])])
  for (const [other, list] of Object.entries(EXTRA_NEIGHBOURS)) if (list.includes(id)) neighbours.add(other)
  const box = [bx0, by0, bx1, by1].map((n) => Math.round(n))
  return { id, d: path(f), cx, cy, box, small: Math.max(bx1 - bx0, by1 - by0) < 18, neighbours: [...neighbours].sort() }
})

if (provinces.length !== 34) throw new Error(`expected 34 divisions, got ${provinces.length}`)
await mkdir('src/data', { recursive: true })
const json = JSON.stringify({ width: WIDTH, height: HEIGHT, provinces })
await writeFile('src/data/china-map.json', json)
console.log(`map: ${provinces.length} divisions, ${WIDTH}×${HEIGHT}, ${(json.length / 1024).toFixed(0)} KB`)
for (const p of provinces) console.log(`  ${p.id.padEnd(13)} ${p.small ? 'small ' : '      '}${p.neighbours.join(', ')}`)
