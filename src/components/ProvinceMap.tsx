import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { ArrowsOutIcon } from '@phosphor-icons/react'
import { DETAIL, citiesOf, type MapCity } from '../lib/cities.ts'
import { MAP } from '../lib/places.ts'
import { go } from '../lib/router.ts'
import { provinceBox } from './StaticMap.tsx'

type Box = [number, number, number, number]
type Anchor = 'start' | 'middle' | 'end'
interface Label {
  key: string
  x: number
  y: number
  text: string
  px: number
  anchor: Anchor
  cls: string
  route?: string
  box: Box
}

const PROVINCES = DETAIL.provinces as Record<string, string>

/** A place to see (a 百科 page with a spot on the map). */
export interface Sight {
  id: string
  x: number
  y: number
  name: string
}

/** On screen, places closer than this many pixels share one dot with a +n badge; zooming in splits them. */
const CLUSTER_PX = 28

/** A dot on the map: a city or a sight, standing in for `more` places hidden under it. */
type Pin = ({ kind: 'city'; c: MapCity } | { kind: 'sight'; s: Sight }) & { x: number; y: number; more: number }

/**
 * One province with its cities and sights named. Tap a city to open its page, a sight to open its
 * 百科 page, or a neighbouring province to go there. Places that would touch share one dot with a
 * +n badge; tap it (or the province itself) to zoom in. Sights are named once zoomed in. There's no dragging, so it never traps a scrolling finger
 * (在大地图上看 under it opens the explorable map).
 */
export function ProvinceMap({
  prov,
  current,
  names,
  learnt,
  stories,
  color,
  sights = [],
  rivers = [],
}: {
  /** places to see, drawn as pins that open their 百科 page */
  sights?: Sight[]
  /** rivers to draw bold and name */
  rivers?: string[]
  prov: string
  /** the city whose page this is */
  current?: string
  /** province id → name */
  names: Map<string, string>
  learnt: (cityId: string) => boolean
  /** cities with a written page */
  stories: Set<string>
  color: string
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    if (!wrap.current) return
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
    ro.observe(wrap.current)
    return () => ro.disconnect()
  }, [])

  const box = useMemo(() => provinceBox(prov, 0.1), [prov])
  const cities = useMemo(() => citiesOf(prov).filter((c) => c.kind !== 'muni'), [prov])
  const bw = box[2] - box[0]
  const bh = box[3] - box[1]
  // `view` is what's on screen; names are laid out once it stops moving
  const [view, setView] = useState<Box>(box)
  const [still, setStill] = useState(true)
  const anim = useRef(0)
  useEffect(() => () => cancelAnimationFrame(anim.current), [])
  const [x0, y0, x1, y1] = view
  const vw = x1 - x0
  const zoomed = vw < bw * 0.98
  const maxed = vw <= bw / 6 + 1e-6
  // map units per screen pixel
  const u = width ? vw / width : vw / 360

  // the dots at this zoom: the capital and this page's city always; others only where there's room
  const pins = useMemo(() => {
    const order = [...cities].sort(
      (a, b) =>
        +(b.id === current) - +(a.id === current) ||
        +(b.kind === 'capital') - +(a.kind === 'capital') ||
        a.rank - b.rank ||
        +stories.has(b.id) - +stories.has(a.id) ||
        b.pop - a.pop,
    )
    const out: Pin[] = []
    const near = (x: number, y: number) => out.find((p) => Math.hypot(p.x - x, p.y - y) < CLUSTER_PX * u)
    for (const c of order) {
      const host = c.id === current || c.kind === 'capital' ? undefined : near(c.x, c.y)
      if (host) host.more++
      else out.push({ kind: 'city', c, x: c.x, y: c.y, more: 0 })
    }
    for (const p of sights) {
      const host = near(p.x, p.y)
      if (host) host.more++
      else out.push({ kind: 'sight', s: p, x: p.x, y: p.y, more: 0 })
    }
    return out
  }, [cities, sights, current, stories, u])


  const labels = useMemo(() => {
    if (!width || !still) return []
    const placed: Box[] = []
    const out: Label[] = []
    const free = (b: Box) => b[0] >= x0 && b[2] <= x1 && b[1] >= y0 && b[3] <= y1 && !placed.some((p) => b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1])
    const textBox = (x: number, y: number, text: string, px: number, anchor: Anchor): Box => {
      const w = [...text].length * px * u
      const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x
      return [left - 2 * u, y - px * 0.95 * u, left + w + 2 * u, y + px * 0.3 * u]
    }
    // the dots come first: names go around them, never over them
    for (const p of pins) {
      const r = (p.kind === 'city' ? dotR(p.c, p.c.id === current) : 4) * u + 1.5 * u
      placed.push([p.x - r, p.y - r, p.x + r, p.y + r])
    }
    // a placed name keeps a little air around it, so names never touch
    const keep = (b: Box) => placed.push([b[0] - 2 * u, b[1] - 2 * u, b[2] + 2 * u, b[3] + 2 * u])
    for (const pin of pins) {
      if (pin.kind !== 'city') continue
      const c = pin.c
      const here = c.id === current
      const px = here ? 16 : c.rank <= 2 ? 14.5 : c.kind === 'spot' ? 12 : 13
      const gap = (dotR(c, here) + 4) * u
      const text = c.name + (learnt(c.id) ? ' ✓' : '')
      const g = gap * 0.75
      const spots: [number, number, Anchor][] = [
        [c.x + gap, c.y + px * 0.32 * u, 'start'],
        [c.x - gap, c.y + px * 0.32 * u, 'end'],
        [c.x, c.y - gap - px * 0.2 * u, 'middle'],
        [c.x, c.y + gap + px * 0.9 * u, 'middle'],
        [c.x + g, c.y - g, 'start'],
        [c.x + g, c.y + g + px * 0.7 * u, 'start'],
        [c.x - g, c.y - g, 'end'],
        [c.x - g, c.y + g + px * 0.7 * u, 'end'],
      ]
      const cls = here ? 'map-city map-selected' : c.rank <= 2 || stories.has(c.id) ? 'map-city map-capital' : 'map-city'
      // the capital and this page's city are always named, even if crowded
      const spot = spots.find(([x, y, anchor]) => free(textBox(x, y, text, px, anchor))) ?? (here || c.kind === 'capital' ? spots[0] : undefined)
      if (!spot) continue
      const [x, y, anchor] = spot
      const b = textBox(x, y, text, px, anchor)
      keep(b)
      out.push({ key: `c-${c.id}`, x, y, text, px, anchor, cls, route: here ? undefined : `city/${c.id}`, box: b })
    }
    // sights: after cities, before the background, and only once zoomed in
    for (const pin of zoomed ? pins : []) {
      if (pin.kind !== 'sight') continue
      const p = pin.s
      const px = 12.5
      const gap = 8 * u
      const spots: [number, number, Anchor][] = [
        [p.x + gap, p.y + px * 0.32 * u, 'start'],
        [p.x - gap, p.y + px * 0.32 * u, 'end'],
        [p.x, p.y + gap + px * 0.9 * u, 'middle'],
        [p.x, p.y - gap - px * 0.2 * u, 'middle'],
      ]
      const spot = spots.find(([x, y, anchor]) => free(textBox(x, y, p.name, px, anchor)))
      if (!spot) continue
      const [x, y, anchor] = spot
      const b = textBox(x, y, p.name, px, anchor)
      keep(b)
      out.push({ key: `s-${p.id}`, x, y, text: p.name, px, anchor, cls: 'map-city map-sight', route: `wiki/${p.id}`, box: b })
    }
    for (const r of DETAIL.rivers) {
      if (!rivers.includes(r.zh)) continue
      const b = textBox(r.x, r.y - 4 * u, r.zh, 13, 'middle')
      if (!free(b)) continue
      keep(b)
      out.push({ key: `r-${r.zh}`, x: r.x, y: r.y - 4 * u, text: r.zh, px: 13, anchor: 'middle', cls: 'map-water map-river-name', box: b })
    }
    // neighbouring provinces (and this one, on a city page), then countries and seas, where there's room
    for (const p of MAP.provinces) {
      if ((p.id === prov && !current) || p.box[2] < x0 || p.box[0] > x1 || p.box[3] < y0 || p.box[1] > y1) continue
      const name = names.get(p.id)
      // Hong Kong and Macau are too small to find room inside: name them at their centre
      const spot = name && (p.small ? p.cx > x0 && p.cx < x1 && p.cy > y0 && p.cy < y1 && ([p.cx, p.cy] as [number, number]) : labelSpot(p.id, view))
      if (!spot) continue
      const [x, y] = spot
      const b = textBox(x, y + 5 * u, name, 14, 'middle')
      if (!free(b)) continue
      keep(b)
      out.push({ key: `p-${p.id}`, x, y: y + 5 * u, text: name, px: 14, anchor: 'middle', cls: 'map-province map-other', route: `place/${p.id}`, box: b })
    }
    for (const n of DETAIL.neighbours) {
      const b = textBox(n.x, n.y, n.zh, 12, 'middle')
      if (!free(b)) continue
      keep(b)
      out.push({ key: `n-${n.zh}`, x: n.x, y: n.y, text: n.zh, px: 12, anchor: 'middle', cls: 'map-country', box: b })
    }
    for (const l of DETAIL.labels) {
      if (l.kind !== 'sea') continue
      const b = textBox(l.x, l.y, l.zh, 12, 'middle')
      if (!free(b)) continue
      keep(b)
      out.push({ key: `s-${l.zh}`, x: l.x, y: l.y, text: l.zh, px: 12, anchor: 'middle', cls: 'map-sea', box: b })
    }
    return out
  }, [width, still, u, view, x0, y0, x1, y1, pins, zoomed, current, stories, learnt, names, prov, rivers])

  // the +n badges, at a corner of their dot that no name or other dot covers
  const badges = useMemo(() => {
    if (maxed) return []
    const radius = (p: Pin) => (p.kind === 'city' ? dotR(p.c, p.c.id === current) : 4) * u
    const taken: Box[] = labels.map((l) => l.box)
    const out: { key: string; cx: number; cy: number; text: string; box: Box }[] = []
    for (const p of pins) {
      if (!p.more) continue
      const r = radius(p) * 0.6
      const text = `+${p.more}`
      const w = (text.length * 6.5 + 8) * u
      const h = 14 * u
      const R = radius(p) + 1 * u
      // its corners, then its sides; with no room anywhere, on the dot itself
      const spots: Box[] = [
        [p.x + r, p.y - r - h, p.x + r + w, p.y - r],
        [p.x - r - w, p.y - r - h, p.x - r, p.y - r],
        [p.x + r, p.y + r, p.x + r + w, p.y + r + h],
        [p.x - r - w, p.y + r, p.x - r, p.y + r + h],
        [p.x - w / 2, p.y - R - h, p.x + w / 2, p.y - R],
        [p.x - w / 2, p.y + R, p.x + w / 2, p.y + R + h],
        [p.x + R, p.y - h / 2, p.x + R + w, p.y + h / 2],
        [p.x - R - w, p.y - h / 2, p.x - R, p.y + h / 2],
      ]
      const dots = pins.filter((q) => q !== p).map((q): Box => [q.x - radius(q), q.y - radius(q), q.x + radius(q), q.y + radius(q)])
      const hits = (b: Box) => [...taken, ...dots].some((t) => b[0] < t[2] && b[2] > t[0] && b[1] < t[3] && b[3] > t[1])
      const box = spots.find((b) => !hits(b)) ?? ([p.x - w / 2, p.y - h / 2, p.x + w / 2, p.y + h / 2] as Box)
      taken.push(box)
      out.push({ key: p.kind === 'city' ? p.c.id : p.s.id, cx: p.x, cy: p.y, text, box })
    }
    return out
  }, [labels, pins, maxed, current, u])

  function flyTo(target: Box) {
    cancelAnimationFrame(anim.current)
    const from = view
    const t0 = performance.now()
    setStill(false)
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / 320)
      const e = 1 - (1 - t) ** 3
      setView(from.map((v, i) => v + (target[i] - v) * e) as Box)
      if (t < 1) anim.current = requestAnimationFrame(step)
      else setStill(true)
    }
    anim.current = requestAnimationFrame(step)
  }

  function zoomAt(x: number, y: number) {
    const w = Math.max(vw / 2.5, bw / 6)
    const h = (w * bh) / bw
    const cx = Math.min(Math.max(x, box[0] + w / 2), box[2] - w / 2)
    const cy = Math.min(Math.max(y, box[1] + h / 2), box[3] - h / 2)
    flyTo([cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2])
  }

  function tap(e: MouseEvent<SVGSVGElement>) {
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(e.currentTarget.getScreenCTM()!.inverse())
    // a +n badge: zoom in on the places under it
    const pad = 6 * u
    for (const b of badges)
      if (pt.x >= b.box[0] - pad && pt.x <= b.box[2] + pad && pt.y >= b.box[1] - pad && pt.y <= b.box[3] + pad) return zoomAt(b.cx, b.cy)
    for (const l of labels) if (l.route && pt.x >= l.box[0] && pt.x <= l.box[2] && pt.y >= l.box[1] && pt.y <= l.box[3]) return go(l.route)
    // places within a fingertip: one clear one opens; several close together zoom in first
    const near = [
      ...cities.map((c) => ({ route: c.id === current ? '' : `city/${c.id}`, x: c.x, y: c.y })),
      ...sights.map((p) => ({ route: `wiki/${p.id}`, x: p.x, y: p.y })),
    ]
      .map((n) => ({ ...n, d: Math.hypot(n.x - pt.x, n.y - pt.y) }))
      .filter((n) => n.d < 22 * u)
      .sort((a, b) => a.d - b.d)
    if (near.length > 1 && !maxed && near[1].d < near[0].d * 2.5) return zoomAt(pt.x, pt.y)
    if (near.length) return near[0].route ? go(near[0].route) : undefined
    const hit = (e.target as Element).closest('[data-prov]')?.getAttribute('data-prov')
    if (hit && hit !== prov) return go(`place/${hit}`)
    // the province itself, or the sea: zoom in, or back out once zoomed
    if (zoomed) flyTo(box)
    else if (hit) zoomAt(pt.x, pt.y)
  }

  return (
    <div ref={wrap} className="relative">
      <svg
        viewBox={`${x0} ${y0} ${vw} ${y1 - y0}`}
        className="map-ocean block max-h-[68dvh] w-full cursor-pointer touch-manipulation select-none"
        style={{ aspectRatio: `${bw} / ${bh}` }}
        onClick={tap}
        role="img"
        aria-label={`${names.get(prov) ?? ''}地图：点城市去看看`}
      >
        <g strokeLinejoin="round">
          {DETAIL.neighbours.map((n) => (
            <path key={n.zh} d={n.d} className="map-abroad" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
          ))}
          {Object.entries(PROVINCES).map(([id, d]) => (
            <path
              key={id}
              data-prov={id}
              d={d}
              fill={id === prov ? `color-mix(in oklab, ${color} 16%, var(--map-china))` : 'var(--map-china)'}
              stroke="var(--map-border)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={DETAIL.lakes.d} className="map-lake" pointerEvents="none" />
          {DETAIL.rivers.map((r) => (
            <path key={r.zh} d={r.d} fill="none" className="map-river" strokeWidth={r.major ? 1.8 : 1} vectorEffect="non-scaling-stroke" pointerEvents="none" />
          ))}
          {DETAIL.rivers
            .filter((r) => rivers.includes(r.zh))
            .map((r) => (
              <path key={`hl-${r.zh}`} d={r.d} fill="none" stroke="var(--map-water)" strokeWidth={4.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            ))}
          <path d={PROVINCES[prov]} fill="none" stroke={color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" pointerEvents="none" />
        </g>
        <g pointerEvents="none">
          {pins.map((pin) => {
            if (pin.kind !== 'sight') return null
            const p = pin.s
            return (
              <rect
                key={p.id}
                x={p.x - 3.6 * u}
                y={p.y - 3.6 * u}
                width={7.2 * u}
                height={7.2 * u}
                transform={`rotate(45 ${p.x} ${p.y})`}
                fill="var(--color-zhu)"
                stroke="var(--map-halo)"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
          {pins.map((pin) => {
            if (pin.kind !== 'city') return null
            const c = pin.c
            const here = c.id === current
            const r = dotR(c, here) * u
            if (here)
              return (
                <g key={c.id}>
                  <circle cx={c.x} cy={c.y} r={r * 2.2} className="map-pulse" vectorEffect="non-scaling-stroke" />
                  <circle cx={c.x} cy={c.y} r={r} fill="var(--color-zhu)" stroke="var(--map-halo)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
                </g>
              )
            if (c.kind === 'capital') return <path key={c.id} d={star(c.x, c.y, r * 1.5)} fill="#ED5126" stroke="var(--map-halo)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
            const story = stories.has(c.id)
            return (
              <circle
                key={c.id}
                cx={c.x}
                cy={c.y}
                r={r}
                fill={learnt(c.id) ? '#2BAE85' : c.kind === 'spot' ? '#F7A43A' : story ? 'var(--map-ink)' : 'var(--map-halo)'}
                stroke={story || learnt(c.id) ? 'var(--map-halo)' : 'var(--mute)'}
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
          {badges.map((b) => (
            <g key={`b-${b.key}`}>
              <rect
                x={b.box[0]}
                y={b.box[1]}
                width={b.box[2] - b.box[0]}
                height={b.box[3] - b.box[1]}
                rx={7 * u}
                fill="var(--map-ink)"
                stroke="var(--map-halo)"
                strokeWidth={1.5}
                vectorEffect="non-scaling-stroke"
              />
              <text x={(b.box[0] + b.box[2]) / 2} y={b.box[3] - 3.6 * u} fontSize={10.5 * u} textAnchor="middle" className="map-badge">
                {b.text}
              </text>
            </g>
          ))}
          {labels.map((l) => (
            <text key={l.key} x={l.x} y={l.y} fontSize={l.px * u} textAnchor={l.anchor} className={l.cls} style={{ strokeWidth: 3.5 * u }}>
              {l.text}
            </text>
          ))}
        </g>
      </svg>
      {zoomed && (
        <button
          onClick={() => flyTo(box)}
          className="absolute top-2 right-2 flex h-8 items-center gap-1 rounded-full border-2 border-line bg-surface/90 px-2.5 text-xs font-extrabold backdrop-blur-sm"
        >
          <ArrowsOutIcon size={14} weight="bold" /> 全省
        </button>
      )}
    </div>
  )
}

/*
 * Where to write a province's name inside the box: the point of the part you can see that is
 * furthest from its edges. Found on a grid with a canvas hit test; remembered per province and box.
 */
const spots = new Map<string, [number, number] | null>()
let probe: CanvasRenderingContext2D | null | undefined
function labelSpot(id: string, box: Box): [number, number] | undefined {
  const key = `${id}|${box.join(',')}`
  if (spots.has(key)) return spots.get(key) ?? undefined
  probe ??= document.createElement('canvas').getContext('2d')
  const d = PROVINCES[id]
  let best: [number, number] | undefined
  if (probe && d) {
    const path = new Path2D(d)
    const [x0, y0, x1, y1] = box
    const n = 18
    const pts: { x: number; y: number; on: boolean }[] = []
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x = x0 + ((x1 - x0) * (i + 0.5)) / n
        const y = y0 + ((y1 - y0) * (j + 0.5)) / n
        pts.push({ x, y, on: probe.isPointInPath(path, x, y) })
      }
    const off = pts.filter((p) => !p.on)
    // a name needs some room: at least ~1/12 of the box from any edge
    let room = (x1 - x0) / 12
    for (const p of pts) {
      if (!p.on) continue
      let r = Math.min(p.x - x0, x1 - p.x, p.y - y0, y1 - p.y)
      for (const q of off) r = Math.min(r, Math.hypot(p.x - q.x, p.y - q.y))
      if (r > room) [room, best] = [r, [p.x, p.y]]
    }
  }
  spots.set(key, best ?? null)
  return best
}

function dotR(c: MapCity, here: boolean) {
  return here ? 6.5 : c.kind === 'capital' ? 6 : c.rank <= 3 ? 4.5 : 3.8
}

function star(cx: number, cy: number, r: number) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    pts.push(`${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`)
  }
  return `M${pts.join('L')}Z`
}

/** What the dots mean. */
export function MapKey({ sights = false }: { sights?: boolean }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-xs font-bold text-mute">
      <span>
        <span className="text-zhu">★</span> 省会
      </span>
      {sights && (
        <span className="flex items-center gap-1">
          <span className="inline-block size-2 rotate-45 bg-zhu" /> 必看
        </span>
      )}
      <span className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-full" style={{ background: 'var(--map-ink)' }} /> 有故事
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-full border-[1.5px] border-mute" /> 还没写
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-2.5 rounded-full bg-[#F7A43A]" /> 小城·名胜
      </span>
      <span className="text-lv">✓ 学会了</span>
      <span className="w-full">点城市去看看；点“+2”这样的数字，放大看挤在一起的地方。</span>
    </div>
  )
}
