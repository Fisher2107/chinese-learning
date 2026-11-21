// Build the committed world overview from Natural Earth 1:50m Admin 0 Countries (public domain).
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { geoArea, geoEqualEarth, geoGraticule10, geoPath } from 'd3-geo'
import mapshaper from 'mapshaper'

const raw = 'data/raw/ne/ne_50m_admin_0_countries-v5.1.2.geojson'
const url = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson'
if (!existsSync(raw)) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Natural Earth: HTTP ${response.status}`)
  await mkdir('data/raw/ne', { recursive: true })
  await writeFile(raw, Buffer.from(await response.arrayBuffer()))
}

const countries = JSON.parse(await readFile(raw, 'utf8'))
const features = countries.features.map(({ properties, geometry }) => ({
  type: 'Feature',
  properties: { id: properties.ADM0_A3, name: properties.NAME_ZH },
  geometry,
}))
const output = await mapshaper.applyCommands(
  '-i countries.json -simplify 5% keep-shapes -o world.json format=geojson',
  { 'countries.json': JSON.stringify({ type: 'FeatureCollection', features }) },
)

const sphere = { type: 'Sphere' }
const width = 1000
const inset = 4
const projection = geoEqualEarth().rotate([-105, 0]).fitWidth(width - 2 * inset, sphere)
const [tx, ty] = projection.translate()
projection.translate([tx + inset, ty + inset])
const path = geoPath(projection).digits(1)
const height = Math.ceil(path.bounds(sphere)[1][1] + inset)
const china = projection([105, 35]).map((n) => Math.round(n))

const globeArea = path.area(sphere)
const areas = JSON.parse(output['world.json']).features.map(({ properties, geometry }) => {
  // D3 expects clockwise exterior rings for polygons smaller than a hemisphere.
  // Mapshaper exports GeoJSON with counterclockwise exterior rings.
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  for (const rings of polygons) {
    if (geoArea({ type: 'Polygon', coordinates: rings }) > 2 * Math.PI) {
      for (const ring of rings) ring.reverse()
    }
  }
  const projectedArea = path.area(geometry)
  if (projectedArea <= 0 || projectedArea >= globeArea / 10) {
    throw new Error(`Unexpected projected area for ${properties.id}: ${projectedArea}`)
  }
  return { id: properties.id, name: properties.name, d: path(geometry) }
})

if (areas.some(({ id, name, d }) => !id || !name || !d) || new Set(areas.map((a) => a.id)).size !== areas.length) {
  throw new Error('Invalid or duplicate world map area')
}
await writeFile('src/data/world-map.json', JSON.stringify({ width, height, outline: path(sphere), grid: path(geoGraticule10()), china, areas }))
console.log(`world map: ${areas.length} areas, ${width}×${height}`)
