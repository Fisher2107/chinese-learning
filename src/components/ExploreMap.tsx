import { useEffect, useLayoutEffect, useMemo, useRef, useState, type Ref } from 'react'
import { MAP } from '../lib/places.ts'
import { CITIES, DETAIL, type MapCity } from '../lib/cities.ts'

export type Selection = { kind: 'province' | 'city' | 'country'; id: string }
type Box = [number, number, number, number]
type LabelHit = { selection: Selection; box: Box }
type CityHit = { id: string; x: number; y: number; r: number }

/** screen = map · k + (x, y) */
interface View {
  k: number
  x: number
  y: number
}

export interface MapApi {
  /** fly so this map box fills the free part of the screen */
  flyToBox: (box: Box, maxZoom?: number) => void
  /** zoom in or out around the centre (+/− buttons) */
  zoomBy: (factor: number) => void
  /** back to all of China */
  reset: () => void
}

const W = DETAIL.width
const H = DETAIL.height
/** the whole map, China and the world around it */
const [WX0, WY0, WX1, WY1] = DETAIL.world
export const WORLD_BOX: Box = [WX0, WY0, WX1, WY1]
const MAX_ZOOM = 16
const PROVINCE_CENTRE = new Map(MAP.provinces.map((p) => [p.id, p]))

/** The view survives tab switches, kept as a map centre and a zoom relative to "all of China". */
let remembered: { cx: number; cy: number; z: number } | undefined

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/**
 * The explorable map: drag to move, pinch / wheel / double-tap / +− to zoom, tap a province or a
 * city. While a finger is down only a CSS transform changes (smooth on phones); when it lifts,
 * the SVG is redrawn sharp and labels are laid out again so they don't overlap.
 * More appears as you zoom in: capitals, then big cities, then every prefecture-level city.
 */
export function ExploreMap({
  names,
  fill,
  selected,
  onSelect,
  learnt,
  stories,
  insets = { top: 0, bottom: 0 },
  initialBox,
  api,
}: {
  /** open looking at this box instead of where the user left off */
  initialBox?: Box
  /** province id → name */
  names: Map<string, string>
  /** province fill colour */
  fill: (id: string) => string
  selected?: Selection
  onSelect: (s?: Selection) => void
  /** ids marked 学会了, as `p:<province>` and `c:<city>` */
  learnt: Set<string>
  /** city ids that have a written page: they show up earlier */
  stories: Set<string>
  /** parts of the screen covered by floating UI, for fitting */
  insets?: { top: number; bottom: number }
  api?: Ref<MapApi>
}) {
  const wrap = useRef<HTMLDivElement>(null)
  const svg = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState<View>()
  const base = useRef<View>(undefined)
  const live = useRef<View>(undefined)
  const anim = useRef(0)
  const hits = useRef<{ labels: LabelHit[]; cities: CityHit[] }>({ labels: [], cities: [] })
  const insetsRef = useRef(insets)
  insetsRef.current = insets

  // ---------- geometry helpers ----------
  const fitK = (w: number, h: number) => Math.min(w / W, (h - insetsRef.current.top - insetsRef.current.bottom) / H) * 0.96

  function clamp(v: View): View {
    const { w, h } = size
    if (!w) return v
    const k0 = fitK(w, h)
    // zoom out as far as the whole world, in as far as a city
    const kWorld = Math.min(w / (WX1 - WX0), (h - insetsRef.current.top - insetsRef.current.bottom) / (WY1 - WY0))
    const k = Math.min(Math.max(v.k, Math.min(kWorld, k0 * 0.75)), k0 * MAX_ZOOM)
    const m = 140
    // keep the centre of the screen over (or near) the map
    const x = Math.min(Math.max(v.x, w / 2 - (WX1 + m) * k), w / 2 - (WX0 - m) * k)
    const y = Math.min(Math.max(v.y, h / 2 - (WY1 + m) * k), h / 2 - (WY0 - m) * k)
    return { k, x, y }
  }

  function boxView(b: Box, maxZoom = 8): View {
    const { w, h } = size
    const { top, bottom } = insetsRef.current
    const k0 = fitK(w, h)
    const bw = Math.max(b[2] - b[0], 1)
    const bh = Math.max(b[3] - b[1], 1)
    const k = Math.min((w * 0.88) / bw, ((h - top - bottom) * 0.86) / bh, k0 * maxZoom)
    const cx = (b[0] + b[2]) / 2
    const cy = (b[1] + b[3]) / 2
    return clamp({ k, x: w / 2 - cx * k, y: top + (h - top - bottom) / 2 - cy * k })
  }

  /** Shows `v` right away by moving the already-drawn SVG (no React render). */
  function apply(v: View) {
    live.current = v
    const b = base.current
    const el = svg.current
    if (!b || !el) return
    const s = v.k / b.k
    el.style.transform = `translate(${v.x - s * b.x}px, ${v.y - s * b.y}px) scale(${s})`
  }

  /** Redraws the map at `v`. */
  function commit(v: View) {
    live.current = v
    base.current = v
    setView(v)
    const { w, h } = size
    if (w) remembered = { cx: (w / 2 - v.x) / v.k, cy: (h / 2 - v.y) / v.k, z: v.k / fitK(w, h) }
  }
  useLayoutEffect(() => {
    if (svg.current) svg.current.style.transform = ''
  }, [view])

  function stop() {
    cancelAnimationFrame(anim.current)
    anim.current = 0
  }

  function flyTo(target: View, ms = 520) {
    stop()
    const from = live.current ?? target
    const t0 = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ms)
      const e = ease(t)
      // zoom in log space; keep the screen centre moving in a straight line
      const k = from.k * (target.k / from.k) ** e
      const { w, h } = size
      const c0 = [(w / 2 - from.x) / from.k, (h / 2 - from.y) / from.k]
      const c1 = [(w / 2 - target.x) / target.k, (h / 2 - target.y) / target.k]
      const cx = c0[0] + (c1[0] - c0[0]) * e
      const cy = c0[1] + (c1[1] - c0[1]) * e
      apply({ k, x: w / 2 - cx * k, y: h / 2 - cy * k })
      if (t < 1) anim.current = requestAnimationFrame(step)
      else {
        anim.current = 0
        commit(target)
      }
    }
    anim.current = requestAnimationFrame(step)
  }

  function zoomAt(sx: number, sy: number, f: number, animate = false) {
    const v = live.current
    if (!v) return
    const k = clamp({ ...v, k: v.k * f }).k
    const mx = (sx - v.x) / v.k
    const my = (sy - v.y) / v.k
    const next = clamp({ k, x: sx - mx * k, y: sy - my * k })
    if (animate) flyTo(next, 320)
    else apply(next)
  }

  // ---------- size and first view ----------
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useLayoutEffect(() => {
    const { w, h } = size
    if (!w || !h) return
    if (!base.current) {
      if (initialBox) commit(boxView(initialBox, 12))
      else if (remembered) {
        const k = remembered.z * fitK(w, h)
        commit(clamp({ k, x: w / 2 - remembered.cx * k, y: h / 2 - remembered.cy * k }))
      } else commit(boxView([0, 0, W, H], 1))
    } else commit(clamp(base.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h])

  useEffect(() => () => stop(), [])

  // ---------- imperative API ----------
  useEffect(() => {
    if (!api) return
    const value: MapApi = {
      flyToBox: (b, maxZoom) => flyTo(boxView(b, maxZoom)),
      zoomBy: (f) => zoomAt(size.w / 2, insetsRef.current.top + (size.h - insetsRef.current.top - insetsRef.current.bottom) / 2, f, true),
      reset: () => flyTo(boxView([0, 0, W, H], 1)),
    }
    if (typeof api === 'function') api(value)
    else (api as { current: MapApi | null }).current = value
  })

  // ---------- gestures ----------
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const pts = new Map<number, { x: number; y: number }>()
    let g:
      | { kind: 'pan'; v: View; x: number; y: number; t: number; moved: number; trail: { x: number; y: number; t: number }[] }
      | { kind: 'pinch'; v: View; mid: [number, number]; dist: number }
      | undefined
    let lastTap = { t: 0, x: 0, y: 0 }
    let wheelTimer = 0

    const local = (e: PointerEvent | WheelEvent) => {
      const r = el.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const two = () => {
      const [a, b] = [...pts.values()]
      return { mid: [(a.x + b.x) / 2, (a.y + b.y) / 2] as [number, number], dist: Math.hypot(a.x - b.x, a.y - b.y) || 1 }
    }
    const startPan = (p: { x: number; y: number }) => {
      g = { kind: 'pan', v: live.current!, x: p.x, y: p.y, t: performance.now(), moved: 0, trail: [{ ...p, t: performance.now() }] }
    }

    function down(e: PointerEvent) {
      if (!live.current) return
      if (e.pointerType === 'mouse' && e.button !== 0) return
      stop()
      el!.setPointerCapture(e.pointerId)
      const p = local(e)
      pts.set(e.pointerId, p)
      if (pts.size === 1) startPan(p)
      else if (pts.size === 2) g = { kind: 'pinch', v: live.current, ...two() }
    }

    function move(e: PointerEvent) {
      if (!pts.has(e.pointerId) || !g) return
      const p = local(e)
      pts.set(e.pointerId, p)
      if (g.kind === 'pinch' && pts.size >= 2) {
        const { mid, dist } = two()
        const k = clamp({ ...g.v, k: (g.v.k * dist) / g.dist }).k
        const mx = (g.mid[0] - g.v.x) / g.v.k
        const my = (g.mid[1] - g.v.y) / g.v.k
        apply(clamp({ k, x: mid[0] - mx * k, y: mid[1] - my * k }))
      } else if (g.kind === 'pan') {
        const dx = p.x - g.x
        const dy = p.y - g.y
        g.moved = Math.max(g.moved, Math.hypot(dx, dy))
        const now = performance.now()
        g.trail.push({ ...p, t: now })
        while (g.trail.length > 2 && now - g.trail[0].t > 90) g.trail.shift()
        apply(clamp({ k: g.v.k, x: g.v.x + dx, y: g.v.y + dy }))
      }
    }

    function up(e: PointerEvent) {
      if (!pts.has(e.pointerId)) return
      const p = local(e)
      pts.delete(e.pointerId)
      if (pts.size === 1) {
        // one finger lifted from a pinch: carry on panning with the other
        startPan([...pts.values()][0])
        if (g?.kind === 'pan') g.moved = 99
        return
      }
      if (pts.size > 0 || !g) return
      const ended = g
      g = undefined
      if (ended.kind === 'pan' && ended.moved < 8 && performance.now() - ended.t < 450) {
        const now = performance.now()
        if (now - lastTap.t < 300 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 30) {
          lastTap = { t: 0, x: 0, y: 0 }
          zoomAt(p.x, p.y, 2, true)
          return
        }
        lastTap = { t: now, x: p.x, y: p.y }
        tap(p.x, p.y, e.clientX, e.clientY)
        return
      }
      // a flick keeps gliding for a moment
      if (ended.kind === 'pan' && ended.trail.length >= 2) {
        const a = ended.trail[0]
        const b = ended.trail[ended.trail.length - 1]
        const dt = Math.max(16, b.t - a.t)
        let vx = (b.x - a.x) / dt
        let vy = (b.y - a.y) / dt
        if (Math.hypot(vx, vy) > 0.35 && performance.now() - b.t < 80) {
          let prev = performance.now()
          const glide = (now: number) => {
            const dtf = now - prev
            prev = now
            const v = live.current!
            apply(clamp({ ...v, x: v.x + vx * dtf, y: v.y + vy * dtf }))
            const decay = Math.pow(0.994, dtf)
            vx *= decay
            vy *= decay
            if (Math.hypot(vx, vy) > 0.02) anim.current = requestAnimationFrame(glide)
            else {
              anim.current = 0
              commit(live.current!)
            }
          }
          anim.current = requestAnimationFrame(glide)
          return
        }
      }
      commit(live.current!)
    }

    function wheel(e: WheelEvent) {
      e.preventDefault()
      if (!live.current) return
      stop()
      const p = local(e)
      if (e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.012 : 0.0022)))
      } else {
        const v = live.current
        apply(clamp({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }))
      }
      clearTimeout(wheelTimer)
      wheelTimer = window.setTimeout(() => commit(live.current!), 140)
    }

    el.addEventListener('pointerdown', down)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', up)
    el.addEventListener('pointercancel', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerup', up)
      el.removeEventListener('pointercancel', up)
      el.removeEventListener('wheel', wheel)
      clearTimeout(wheelTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h])

  function tap(sx: number, sy: number, clientX: number, clientY: number) {
    // Match the displayed positions even if a tap interrupts a pan or zoom.
    const b = base.current!
    const v = live.current!
    const scale = b.k / v.k
    const x = (sx - v.x) * scale + b.x
    const y = (sy - v.y) * scale + b.y
    for (const { selection, box } of hits.current.labels) {
      if (x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3]) return onSelect(selection)
    }

    // Then try the nearest city dot.
    let best: string | undefined
    let bestD = 20
    for (const h of hits.current.cities) {
      const d = (Math.hypot(h.x - x, h.y - y) - h.r) / scale
      if (d < bestD) [best, bestD] = [h.id, d]
    }
    if (best) return onSelect({ kind: 'city', id: best })
    // tiny divisions (Hong Kong, Macau…) catch taps near them
    for (const p of MAP.provinces) {
      if (!p.small) continue
      if (Math.hypot(p.cx * v.k + v.x - sx, p.cy * v.k + v.y - sy) < 18) return onSelect({ kind: 'province', id: p.id })
    }
    const el = document.elementFromPoint(clientX, clientY)?.closest('[data-prov],[data-country]')
    const id = el?.getAttribute('data-prov')
    const country = el?.getAttribute('data-country')
    onSelect(id ? { kind: 'province', id } : country ? { kind: 'country', id: country } : undefined)
  }

  // ---------- what to draw at this zoom ----------
  const layout = useMemo(() => {
    if (!view || !size.w) return undefined
    const { k, x, y } = view
    const z = k / fitK(size.w, size.h)
    const sx = (mx: number) => mx * k + x
    const sy = (my: number) => my * k + y
    const onScreen = (px: number, py: number, m = 40) => px > -m && px < size.w + m && py > -m && py < size.h + m

    const placed: Box[] = []
    const fits = (b: Box) => {
      if (b[0] < 4 || b[2] > size.w - 4 || b[1] < insets.top || b[3] > size.h - insets.bottom) return false
      for (const p of placed) if (b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1]) return false
      placed.push(b)
      return true
    }
    type Anchor = 'middle' | 'start' | 'end'
    const textBox = (cx: number, cy: number, text: string, size: number, anchor: Anchor, tracking = 0): Box => {
      const w = [...text].length * size * (1 + tracking)
      const x0 = anchor === 'middle' ? cx - w / 2 : anchor === 'end' ? cx - w : cx
      return [x0 - 3, cy - size * 0.95 - 3, x0 + w + 3, cy + size * 0.3 + 3]
    }

    // cities visible at this zoom
    const minZ = (c: MapCity) => {
      if (selected?.kind === 'city' && selected.id === c.id) return 0
      if (c.rank === 1) return 0
      if (c.rank === 2) return 1.3
      if (c.rank === 3) return 1.7
      if (stories.has(c.id)) return 2.1
      return 2.7
    }
    const labelZ = (c: MapCity) => (c.rank === 1 ? 0 : c.rank === 2 ? 1.45 : c.rank === 3 ? 2.1 : stories.has(c.id) ? 2.5 : 3.2)
    const dots = CITIES.filter((c) => z >= minZ(c) && onScreen(sx(c.x), sy(c.y)))
    const selCity = selected?.kind === 'city' ? dots.find((c) => c.id === selected.id) : undefined

    type Label = { key: string; x: number; y: number; text: string; size: number; anchor: Anchor; cls: string }
    const labels: Label[] = []
    const labelHits: LabelHit[] = []
    const cityHits = dots.map((c) => ({ id: c.id, x: sx(c.x), y: sy(c.y), r: c.rank === 1 ? 7 : c.rank === 2 ? 4.5 : 3.5 }))
    const cityLabel = (c: MapCity, active = false) => {
      const r = c.rank === 1 ? 7 : c.rank === 2 ? 4.5 : 3.5
      const px = sx(c.x)
      const py = sy(c.y)
      const size = active ? 19 : c.rank <= 2 ? 17 : c.rank === 3 ? 16 : 15
      const text = c.name + (learnt.has(`c:${c.id}`) ? ' ✓' : '')
      const gap = r + (active ? 7 : 5)
      const positions: [number, number, Anchor][] = [
        [px + gap, py + size * 0.32, 'start'],
        [px - gap, py + size * 0.32, 'end'],
        [px, py - gap - size * 0.3, 'middle'],
        [px, py + gap + size * 0.95, 'middle'],
      ]
      for (const [x, y, anchor] of positions) {
        const box = textBox(x, y, text, size, anchor)
        if (!active && cityHits.some((dot) => dot.id !== c.id &&
          dot.x + dot.r > box[0] && dot.x - dot.r < box[2] &&
          dot.y + dot.r > box[1] && dot.y - dot.r < box[3])) continue
        if (!fits(box)) continue
        const cls = active ? 'map-city map-selected' : c.rank <= 2 ? 'map-city map-capital' : 'map-city'
        labels.push({ key: `c-${c.id}`, x, y, text, size, anchor, cls })
        labelHits.push({ selection: { kind: 'city', id: c.id }, box })
        break
      }
    }

    const provinceLabel = (p: (typeof MAP.provinces)[number], active = false) => {
      const px = sx(p.cx)
      const py = sy(p.cy)
      const name = names.get(p.id)
      if (!name || !onScreen(px, py, 0)) return
      const text = name + (learnt.has(`p:${p.id}`) ? ' ✓' : '')
      const size = active ? 19 : z < 1.3 ? 16 : 18
      const box = textBox(px, py, text, size, 'middle', 0.04)
      if (!fits(box)) return
      labels.push({ key: `p-${p.id}`, x: px, y: py, text, size, anchor: 'middle', cls: active ? 'map-province map-selected' : 'map-province' })
      labelHits.push({ selection: { kind: 'province', id: p.id }, box })
    }

    // Keep the selection and nearby place names ahead of background geography.
    if (selCity) cityLabel(selCity, true)
    const selProvince = selected?.kind === 'province' ? PROVINCE_CENTRE.get(selected.id) : undefined
    if (selProvince) provinceLabel(selProvince, true)
    for (const c of dots.filter((c) => c.rank === 1)) if (c !== selCity) cityLabel(c)
    if (z < 2.9 && z >= 0.6)
      for (const p of MAP.provinces)
        if (p !== selProvince && (!p.small || z >= 1.6)) provinceLabel(p)
    if (z < 0.6 && fits(textBox(sx(W * 0.55), sy(H * 0.55), '中国', 20, 'middle', 0.2)))
      labels.push({ key: 'china', x: sx(W * 0.55), y: sy(H * 0.55), text: '中国', size: 20, anchor: 'middle', cls: 'map-province' })
    const ranked = dots.filter((c) => c.rank > 1 && c !== selCity && z >= labelZ(c)).sort((a, b) => a.rank - b.rank || +stories.has(b.id) - +stories.has(a.id) || b.pop - a.pop)
    for (const c of ranked) cityLabel(c)

    for (const l of DETAIL.labels)
      if (l.kind === 'sea' && z >= 0.6 && onScreen(sx(l.x), sy(l.y)) && fits(textBox(sx(l.x), sy(l.y), l.zh, 13, 'middle', 0.4)))
        labels.push({ key: `l-${l.zh}`, x: sx(l.x), y: sy(l.y), text: l.zh, size: 13, anchor: 'middle', cls: 'map-sea' })
    // countries: China's neighbours always, the rest of the world as there's room (big ones first)
    const selCountry = selected?.kind === 'country' ? DETAIL.neighbours.find((n) => n.id === selected.id) : undefined
    const countryZ = (rank: number) => (rank <= 1 ? 0 : rank === 2 ? 0.25 : rank === 3 ? 0.7 : rank === 4 ? 1.4 : 2.4)
    const countries = [...DETAIL.neighbours].sort((a, b) => +(b === selCountry) - +(a === selCountry) || a.rank - b.rank)
    if (z < 6)
      for (const n of countries) {
        const active = n === selCountry
        if (!active && z < countryZ(n.rank)) continue
        const size = active ? 17 : 12
        const box = textBox(sx(n.x), sy(n.y), n.zh, size, 'middle', 0.15)
        if (onScreen(sx(n.x), sy(n.y)) && fits(box)) {
          labels.push({ key: `n-${n.id}`, x: sx(n.x), y: sy(n.y), text: n.zh, size, anchor: 'middle', cls: active ? 'map-country map-selected' : 'map-country' })
          labelHits.push({ selection: { kind: 'country', id: n.id }, box })
        }
      }
    // water and land last: they give way to cities
    for (const r of DETAIL.rivers)
      if (z >= r.lz && onScreen(sx(r.x), sy(r.y)) && fits(textBox(sx(r.x), sy(r.y) - 4, r.zh, 11, 'middle')))
        labels.push({ key: `r-${r.zh}`, x: sx(r.x), y: sy(r.y) - 4, text: r.zh, size: 11, anchor: 'middle', cls: 'map-water' })
    if (z >= 1.8)
      for (const l of DETAIL.lakes.labels)
        if (onScreen(sx(l.x), sy(l.y)) && fits(textBox(sx(l.x), sy(l.y) + 14, l.zh, 11, 'middle')))
          labels.push({ key: `k-${l.zh}`, x: sx(l.x), y: sy(l.y) + 14, text: l.zh, size: 11, anchor: 'middle', cls: 'map-water' })
    for (const l of DETAIL.labels) {
      if (l.kind === 'sea') continue
      if (l.kind === 'peak' && z < 2.4) continue
      if (l.kind === 'shan' && z < 1.15) continue
      if (l.kind === 'land' && z < 0.7) continue
      const text = l.kind === 'peak' ? `▲${l.zh}` : l.zh
      const size = l.kind === 'land' ? 12 : 11
      if (onScreen(sx(l.x), sy(l.y)) && fits(textBox(sx(l.x), sy(l.y), text, size, 'middle', l.kind === 'land' ? 0.3 : 0)))
        labels.push({ key: `g-${l.zh}`, x: sx(l.x), y: sy(l.y), text, size, anchor: 'middle', cls: l.kind === 'land' ? 'map-land' : 'map-shan' })
    }
    return { z, dots, labels, hits: { labels: labelHits, cities: cityHits } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, size.w, size.h, insets.top, insets.bottom, selected?.kind, selected?.id, learnt, stories, names])

  useLayoutEffect(() => {
    if (layout) hits.current = layout.hits
  }, [layout])

  const v = view
  const selProv = selected?.kind === 'province' ? selected.id : undefined
  const selCity = selected?.kind === 'city' ? selected.id : undefined
  const selCountry = selected?.kind === 'country' ? selected.id : undefined
  const riverW = (major: boolean) => (layout ? (major ? Math.min(3.2, 1.3 + layout.z * 0.12) : Math.min(2, 0.6 + layout.z * 0.1)) : 1)

  return (
    <div ref={wrap} className="map-ocean absolute inset-0 touch-none overflow-hidden select-none" style={{ cursor: 'grab' }}>
      {v && (
        <svg ref={svg} width={size.w} height={size.h} className="absolute top-0 left-0 origin-top-left will-change-transform" role="img" aria-label="可以拖动和放大的中国地图">
          <g transform={`translate(${v.x} ${v.y}) scale(${v.k})`} strokeLinejoin="round">
            {DETAIL.neighbours.map((n) => (
              <path
                key={n.id}
                data-country={n.id}
                d={n.d}
                className="map-abroad"
                style={n.id === selCountry ? { fill: 'color-mix(in oklab, var(--color-huang) 45%, var(--map-abroad))' } : undefined}
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {Object.entries(DETAIL.provinces).map(([id, d]) => (
              <path key={id} data-prov={id} d={d} fill={fill(id)} stroke="var(--map-province-line)" strokeWidth={1.3} vectorEffect="non-scaling-stroke" />
            ))}
            <path d={DETAIL.lakes.d} className="map-lake" />
            {DETAIL.rivers.map((r) => (
              <path key={r.zh} d={r.d} fill="none" className="map-river" strokeWidth={riverW(r.major)} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            ))}
            {selCountry && (
              <path
                d={DETAIL.neighbours.find((n) => n.id === selCountry)?.d}
                fill="none"
                stroke="var(--text)"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )}
            {selProv && (
              <path
                d={(DETAIL.provinces as Record<string, string>)[selProv]}
                fill="none"
                stroke="var(--text)"
                strokeWidth={2.6}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )}
          </g>
          {layout && (
            <g pointerEvents="none">
              {MAP.provinces
                .filter((p) => p.small && layout.z < 3)
                .map((p) => (
                  <circle key={p.id} cx={p.cx * v.k + v.x} cy={p.cy * v.k + v.y} r={selProv === p.id ? 7 : 4} fill={fill(p.id)} stroke="var(--text)" strokeWidth={selProv === p.id ? 2.5 : 1} />
                ))}
              {layout.dots.map((c) => {
                const cx = c.x * v.k + v.x
                const cy = c.y * v.k + v.y
                const isLearnt = learnt.has(`c:${c.id}`)
                const r = c.rank <= 2 ? 4.5 : 3.5
                return (
                  <g key={c.id}>
                    {c.id === selCity && <circle cx={cx} cy={cy} r={11} className="map-pulse" />}
                    {c.rank === 1 ? (
                      <path d={star(cx, cy, 7)} fill="#ED5126" stroke="var(--map-halo)" strokeWidth={1.5} />
                    ) : (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={c.id === selCity ? r + 1.5 : r}
                        fill={isLearnt ? '#2BAE85' : c.kind === 'spot' ? '#F7A43A' : 'var(--map-halo)'}
                        stroke={isLearnt ? 'var(--map-halo)' : c.rank <= 2 ? 'var(--text)' : 'var(--mute)'}
                        strokeWidth={c.rank <= 2 ? 2 : 1.5}
                      />
                    )}
                  </g>
                )
              })}
              {layout.labels.map((l) => (
                <text
                  key={l.key}
                  x={l.x}
                  y={l.y}
                  fontSize={l.size}
                  textAnchor={l.anchor}
                  className={l.cls}
                >
                  {l.text}
                </text>
              ))}
            </g>
          )}
        </svg>
      )}
    </div>
  )
}

function star(cx: number, cy: number, r: number) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}
