// Each era's map (the `map:` of content/history/<era>.md), drawn in the explorable map's own
// coordinates so it sits on the same map as everything else. Called from build-content.mjs.
//
// A state is made of
//   cities:    today's prefecture-level cities (the map's city points). Each city gets the part of its
//              province nearer to it than to the province's other cities, a rough stand-in for its
//              地级市, so a state's edge follows real province borders wherever it can
//   provinces: whole provinces
//   countries: whole neighbouring countries, by ISO code (MNG …)
//   outlines:  [{ outline: [[lon, lat], …], abroad? }] for land the cities can't reach (the steppe,
//              西域, Korea, Vietnam); cut to the coastline, and with `abroad` to land outside China
// Routes are lines of [lon, lat]; capitals and pins are single points.
import { Delaunay } from 'd3-delaunay'
import pc from 'polygon-clipping'

const r1 = (n) => Math.round(n * 10) / 10

/** "M1,2L3,4Z M…" (absolute M/L/Z, as d3-geo writes them) → closed rings. */
function rings(d) {
  const out = []
  for (const part of d.split(/(?=M)/)) {
    const nums = part.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)?.map(Number) ?? []
    const ring = []
    for (let i = 0; i + 1 < nums.length; i += 2) ring.push([nums[i], nums[i + 1]])
    if (ring.length < 3) continue
    const [a, b] = [ring[0], ring.at(-1)]
    if (a[0] !== b[0] || a[1] !== b[1]) ring.push([a[0], a[1]])
    out.push(ring)
  }
  return out
}

/** Snaps to a 0.01 grid: polygon-clipping copes far better with fewer near-duplicate points. */
const snap = (mp) => mp.map((poly) => poly.map((ring) => ring.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])))

/** Joins shapes; if the library chokes on the whole lot, one at a time, leaving out any that won't join. */
function unionAll(parts, onFail) {
  if (!parts.length) return []
  try {
    return pc.union(...parts)
  } catch {
    let acc = parts[0]
    for (const p of parts.slice(1)) {
      try {
        acc = pc.union(acc, p)
      } catch {
        try {
          acc = pc.union(snap(acc), snap(p))
        } catch {
          onFail?.()
        }
      }
    }
    return acc
  }
}

/** A path's area under the even-odd rule, as a polygon-clipping MultiPolygon. */
function region(d) {
  const rs = rings(d)
  if (!rs.length) return []
  try {
    return pc.xor(...rs.map((r) => [[r]]))
  } catch {
    return pc.union(...rs.map((r) => [[r]]))
  }
}

function bboxOf(mp) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const poly of mp) for (const [x, y] of poly[0]) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)]
  return [x0, y0, x1, y1]
}
const overlaps = (a, b) => a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3]

/** Douglas–Peucker on one closed ring; tiny rings are dropped. */
function simplify(ring, tol) {
  if (ring.length <= 4) return ring
  const keep = new Uint8Array(ring.length)
  keep[0] = keep[ring.length - 1] = 1
  const stack = [[0, ring.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    const [ax, ay] = ring[a]
    const [bx, by] = ring[b]
    const dx = bx - ax
    const dy = by - ay
    const len = Math.hypot(dx, dy) || 1
    let far = -1
    let farD = tol
    for (let i = a + 1; i < b; i++) {
      const dist = len === 1 && dx === 0 && dy === 0 ? Math.hypot(ring[i][0] - ax, ring[i][1] - ay) : Math.abs(dy * ring[i][0] - dx * ring[i][1] + bx * ay - by * ax) / len
      if (dist > farD) [far, farD] = [i, dist]
    }
    if (far > 0) {
      keep[far] = 1
      stack.push([a, far], [far, b])
    }
  }
  return ring.filter((_, i) => keep[i])
}

const ringArea = (ring) => {
  let a = 0
  for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  return a / 2
}

function toPath(mp, tol = 0.3) {
  const parts = []
  for (const poly of mp)
    for (const ring of poly) {
      const s = simplify(ring, tol)
      if (s.length < 4 || Math.abs(ringArea(s)) < 0.4) continue
      parts.push('M' + s.slice(0, -1).map(([x, y]) => `${r1(x)},${r1(y)}`).join('L') + 'Z')
    }
  return parts.join('')
}

function inside(poly, x, y) {
  let hit = false
  for (const ring of poly)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]
      const [xj, yj] = ring[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
    }
  return hit
}

function edgeDistance(poly, x, y) {
  let best = Infinity
  for (const ring of poly)
    for (let i = 0; i < ring.length - 1; i++) {
      const [ax, ay] = ring[i]
      const [bx, by] = ring[i + 1]
      const dx = bx - ax
      const dy = by - ay
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
      best = Math.min(best, Math.hypot(x - ax - t * dx, y - ay - t * dy))
    }
  return best
}

/** Where a state's name goes: the point of its biggest piece farthest from the edges (on a grid). */
function labelPoint(mp) {
  let biggest
  let size = 0
  for (const poly of mp) {
    const a = Math.abs(ringArea(poly[0]))
    if (a > size) [biggest, size] = [poly, a]
  }
  if (!biggest) return [0, 0]
  const coarse = biggest.map((r) => simplify(r, 1))
  const [x0, y0, x1, y1] = bboxOf([coarse])
  let best = [(x0 + x1) / 2, (y0 + y1) / 2]
  let bestD = -1
  const n = 24
  for (let i = 0; i <= n; i++)
    for (let j = 0; j <= n; j++) {
      const x = x0 + ((x1 - x0) * i) / n
      const y = y0 + ((y1 - y0) * j) / n
      if (!inside(coarse, x, y)) continue
      const d = edgeDistance(coarse, x, y)
      if (d > bestD) [best, bestD] = [[x, y], d]
    }
  return best.map(r1)
}

const PALETTE = ['#C8341A', '#2E7D6B', '#3E6FA8', '#B8860B', '#7A4FA0', '#C26A2C', '#2F8F9D', '#8C5A3C', '#5E7D2E', '#A63D5E', '#4A5D8C', '#9C7A2B']
const KIND_COLOR = { lost: '#6B6E75', leased: '#8A6D5A', occupied: '#5B5F66', zone: '#D2462C' }
export const STATE_KINDS = ['state', 'lost', 'leased', 'occupied', 'zone']

/**
 * Sets up the shapes every era is built from (each city's area, each province, each neighbouring
 * country), then `layer(map, where)` draws one era. `names` gives province names for the cards.
 */
export function historyMap(detail, proj, provinceNames, errors) {
  const provRegion = new Map(Object.entries(detail.provinces).map(([id, d]) => [id, snap(region(d))]))
  const cityName = new Map(detail.cities.map((c) => [c.id, c.name]))
  const citiesOf = new Map()
  const cityCell = new Map()
  for (const [prov, reg] of provRegion) {
    const seeds = detail.cities.filter((c) => c.prov === prov && c.kind !== 'spot')
    citiesOf.set(prov, seeds.map((c) => c.id))
    if (seeds.length === 1) {
      cityCell.set(seeds[0].id, reg)
      continue
    }
    const [x0, y0, x1, y1] = bboxOf(reg)
    const vor = Delaunay.from(seeds, (c) => c.x, (c) => c.y).voronoi([x0 - 2, y0 - 2, x1 + 2, y1 + 2])
    seeds.forEach((c, i) => {
      const cell = vor.cellPolygon(i)
      try {
        cityCell.set(c.id, cell ? snap(pc.intersection(reg, [[cell]])) : [])
      } catch {
        cityCell.set(c.id, [])
      }
    })
  }
  const spots = new Set(detail.cities.filter((c) => c.kind === 'spot').map((c) => c.id))
  const countries = new Map(detail.neighbours.map((n) => [n.id, n]))
  const countryRegion = new Map()
  const regionOfCountry = (id) => {
    if (!countryRegion.has(id)) countryRegion.set(id, region(countries.get(id).d))
    return countryRegion.get(id)
  }
  const land = [...[...provRegion].map(([id, reg]) => ({ id, china: true, reg, box: bboxOf(reg) })), ...detail.neighbours.map((n) => ({ id: n.id, china: false, reg: undefined, box: undefined }))]
  const landBox = (f) => {
    if (!f.reg) {
      f.reg = regionOfCountry(f.id)
      f.box = bboxOf(f.reg)
    }
    return f.box
  }

  const at = (ll, where) => {
    if (!Array.isArray(ll) || ll.length !== 2 || !ll.every(Number.isFinite)) {
      errors.push(`${where}: a place should be [lon, lat] (got ${JSON.stringify(ll)})`)
      return [0, 0]
    }
    return proj(ll).map(r1)
  }

  /** an outline cut to the land under it */
  function outlineShape(o, where) {
    if (!Array.isArray(o?.outline) || o.outline.length < 3) {
      errors.push(`${where}: an outline needs at least three [lon, lat] points`)
      return []
    }
    const ring = o.outline.map((p) => proj(p))
    ring.push(ring[0])
    const box = bboxOf([[ring]])
    const pieces = []
    for (const f of land) {
      if (o.abroad && f.china) continue
      if (!overlaps(box, landBox(f))) continue
      try {
        const cut = pc.intersection([[ring]], f.reg)
        if (cut.length) pieces.push(cut)
      } catch {
        // a sliver polygon-clipping can't handle: leave that country out
      }
    }
    return unionAll(pieces)
  }

  function state(s, i, where) {
    const parts = []
    const cities = new Set()
    const today = []
    for (const p of s.provinces ?? []) {
      if (!provRegion.has(p)) {
        errors.push(`${where}: unknown province "${p}"`)
        continue
      }
      parts.push(provRegion.get(p))
      for (const c of citiesOf.get(p)) cities.add(c)
      today.push(provinceNames[p] ?? p)
    }
    for (const c of s.cities ?? []) {
      if (spots.has(c)) errors.push(`${where}: "${c}" is a town on the map, not a prefecture-level city; use its city`)
      else if (!cityCell.has(c)) errors.push(`${where}: unknown city "${c}"`)
      else {
        parts.push(cityCell.get(c))
        cities.add(c)
        today.push(cityName.get(c))
      }
    }
    for (const n of s.countries ?? []) {
      if (!countries.has(n)) errors.push(`${where}: unknown country "${n}"`)
      else {
        parts.push(regionOfCountry(n))
        today.push(countries.get(n).zh)
      }
    }
    for (const o of s.outlines ?? []) parts.push(outlineShape(o, where))
    const kind = s.kind ?? 'state'
    if (!STATE_KINDS.includes(kind)) errors.push(`${where}: kind "${kind}" should be one of ${STATE_KINDS.join(' ')}`)
    if (!s.name) errors.push(`${where}: a state needs a name`)
    const shape = parts.filter((p) => p.length)
    const mp = unionAll(shape, () => console.warn(`  ${where}: one piece of ${s.name} wouldn't join the rest and was left out`))
    if (!mp.length) errors.push(`${where}: ${s.name} has no shape (give cities, provinces, countries or outlines)`)
    const [x, y] = s.label ? at(s.label, where) : labelPoint(mp)
    return {
      name: String(s.name ?? ''),
      kind,
      color: s.color ?? KIND_COLOR[kind] ?? PALETTE[i % PALETTE.length],
      d: toPath(mp),
      x,
      y,
      today: [...new Set(today)],
      cities: [...cities],
      ...(s.note ? { note: String(s.note) } : {}),
    }
  }

  /** One era's layer, all in map coordinates. */
  return function layer(map, where) {
    if (!map) return { box: [0, 0, detail.width, detail.height], states: [], routes: [], pins: [] }
    let box
    if (Array.isArray(map.box) && map.box.length === 4) {
      const [lo0, la0, lo1, la1] = map.box
      const pts = []
      for (const lo of [lo0, (lo0 + lo1) / 2, lo1]) for (const la of [la0, (la0 + la1) / 2, la1]) pts.push(proj([lo, la]))
      box = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))].map(r1)
    } else {
      errors.push(`${where}: map.box should be [lon0, lat0, lon1, lat1]`)
      box = [0, 0, detail.width, detail.height]
    }
    const states = (map.states ?? []).map((s, i) => state(s, i, `${where}: ${s.name ?? `state ${i + 1}`}`))
    const routes = (map.routes ?? []).map((r, i) => {
      if (!r.name || !Array.isArray(r.line) || r.line.length < 2) errors.push(`${where}: route ${i + 1} needs a name and a line of two or more [lon, lat]`)
      const pts = (r.line ?? []).map((p) => at(p, where))
      const mid = pts[Math.floor(pts.length / 2)] ?? [0, 0]
      return { name: String(r.name ?? ''), d: 'M' + pts.map(([x, y]) => `${x},${y}`).join('L'), x: mid[0], y: mid[1], start: pts[0] ?? [0, 0], end: pts.at(-1) ?? [0, 0] }
    })
    const pins = [
      ...(map.capitals ?? []).map((c, i) => ({ id: `capital-${i}`, kind: 'capital', name: String(c.name ?? ''), of: c.of ? String(c.of) : '', ...xy(at(c.at, where)) })),
      ...(map.pins ?? []).map((p, i) => ({ id: `pin-${i}`, kind: 'place', name: String(p.name ?? ''), ...(p.note ? { note: String(p.note) } : {}), ...xy(at(p.at, where)) })),
    ]
    return { box, states, routes, pins }
  }
}

const xy = ([x, y]) => ({ x, y })
