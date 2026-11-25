import { DETAIL } from '../lib/cities.ts'
import { isCanal } from '../lib/cities.ts'

type Box = [number, number, number, number]

export interface Pin {
  id: string
  x: number
  y: number
  label?: string
  /** drawn big and pulsing */
  main?: boolean
}

/**
 * A still picture of part of the map: for city, province and 百科 pages and the 认地图 test.
 * `focus` is drawn in the accent colour; `dots` are cities (one can be the target, pulsing);
 * `rivers` are drawn bold and named; `pins` are places, named where there's room, and tappable.
 */
export function StaticMap({
  box,
  focus,
  dots = [],
  target,
  color = '#ED5126',
  className = '',
  rivers = [],
  pins = [],
  onPin,
}: {
  rivers?: string[]
  pins?: Pin[]
  onPin?: (id: string) => void
  box: Box
  /** province to colour in */
  focus?: string
  dots?: { id: string; x: number; y: number }[]
  /** a city id from `dots`, drawn big and pulsing */
  target?: string
  color?: string
  className?: string
}) {
  const w = box[2] - box[0]
  const h = box[3] - box[1]
  const unit = Math.max(w, h) / 320
  // names on pins, biggest first, skipping any that would overlap one already placed
  const fs = unit * 11
  const placed: [number, number, number, number][] = []
  const pinLabels = pins.map((p) => {
    if (!p.label) return undefined
    const tw = [...p.label].length * fs
    for (const [x, anchor] of [[p.x + unit * 6, 'start'], [p.x - unit * 6, 'end']] as const) {
      const x0 = anchor === 'start' ? x : x - tw
      const b: [number, number, number, number] = [x0, p.y - fs * 0.7, x0 + tw, p.y + fs * 0.5]
      if (b[0] < box[0] || b[2] > box[2]) continue
      if (placed.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1])) continue
      placed.push(b)
      return { x, anchor }
    }
    return undefined
  })
  const highlighted = DETAIL.rivers.filter((r) => rivers.includes(r.zh))
  return (
    <svg viewBox={`${box[0]} ${box[1]} ${w} ${h}`} className={`map-ocean block w-full ${className}`} style={{ aspectRatio: `${w} / ${h}` }} role="img" aria-label="地图">
      <g strokeLinejoin="round">
        {DETAIL.neighbours.map((n) => (
          <path key={n.id} d={n.d} className="map-abroad" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
        ))}
        {Object.entries(DETAIL.provinces).map(([id, d]) => (
          <path
            key={id}
            d={d}
            fill={id === focus ? `color-mix(in oklab, ${color} ${target || pins.length ? 18 : 85}%, var(--map-china))` : 'var(--map-china)'}
            stroke={id === focus ? color : 'var(--map-province-line)'}
            strokeWidth={id === focus ? 2 : 1.1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={DETAIL.lakes.d} className="map-lake" />
        {DETAIL.rivers.map((r) => (
          <path key={r.zh} d={r.d} fill="none" className={isCanal(r.zh) ? 'map-canal' : 'map-river'} strokeDasharray={isCanal(r.zh) ? '5 4' : undefined} strokeWidth={r.major ? 1.6 : 0.8} vectorEffect="non-scaling-stroke" />
        ))}
        {highlighted.map((r) => (
          <path key={`hl-${r.zh}`} d={r.d} fill="none" stroke="var(--map-water)" strokeWidth={4.5} strokeLinecap={isCanal(r.zh) ? 'butt' : 'round'} strokeDasharray={isCanal(r.zh) ? '8 5' : undefined} vectorEffect="non-scaling-stroke" />
        ))}
        {highlighted.map((r) => (
          <text key={`hlt-${r.zh}`} x={r.x} y={r.y - unit * 5} fontSize={unit * 12} textAnchor="middle" className="map-water" style={{ fontWeight: 900, strokeWidth: unit * 2.6 }}>
            {r.zh}
          </text>
        ))}
        {dots
          .filter((d) => d.id !== target)
          .map((d) => (
            <circle key={d.id} cx={d.x} cy={d.y} r={unit * 3.2} fill="var(--map-halo)" stroke="var(--mute)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
          ))}
        {dots
          .filter((d) => d.id === target)
          .map((d) => (
            <g key={d.id}>
              <circle cx={d.x} cy={d.y} r={unit * 10} className="map-pulse" style={{ stroke: color }} />
              <circle cx={d.x} cy={d.y} r={unit * 5.5} fill={color} stroke="var(--map-halo)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        {pins.map((p, i) => (
          <g key={p.id} onClick={onPin && (() => onPin(p.id))} className={onPin ? 'cursor-pointer' : undefined}>
            {p.main && <circle cx={p.x} cy={p.y} r={unit * 10} className="map-pulse" style={{ stroke: 'var(--color-zhu)' }} />}
            {onPin && <circle cx={p.x} cy={p.y} r={unit * 9} fill="transparent" />}
            <circle cx={p.x} cy={p.y} r={unit * (p.main ? 5.5 : 4)} fill="var(--color-zhu)" stroke="var(--map-halo)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
            {pinLabels[i] && (
              <text x={pinLabels[i]!.x} y={p.y + fs * 0.35} fontSize={fs} textAnchor={pinLabels[i]!.anchor} className="map-city" style={{ fontWeight: 800, strokeWidth: unit * 2.6 }}>
                {p.label}
              </text>
            )}
          </g>
        ))}
      </g>
    </svg>
  )
}

/** A padded box around a river on the map. */
export function riverBox(zh: string, pad = 0.15): Box | undefined {
  const r = DETAIL.rivers.find((x) => x.zh === zh)
  if (!r) return undefined
  const nums = r.d.match(/-?\d+(\.\d+)?/g)!.map(Number)
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (let i = 0; i < nums.length - 1; i += 2) {
    x0 = Math.min(x0, nums[i])
    x1 = Math.max(x1, nums[i])
    y0 = Math.min(y0, nums[i + 1])
    y1 = Math.max(y1, nums[i + 1])
  }
  const side = Math.max(x1 - x0, y1 - y0, 40) * (1 + pad * 2)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  return [cx - side / 2, cy - side * 0.4, cx + side / 2, cy + side * 0.4]
}

/** A padded box around a province, squared up a little so thin ones still look like places. */
export function provinceBox(id: string, pad = 0.18): Box {
  const d = (DETAIL.provinces as Record<string, string>)[id]
  const nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number)
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (let i = 0; i < nums.length - 1; i += 2) {
    x0 = Math.min(x0, nums[i])
    x1 = Math.max(x1, nums[i])
    y0 = Math.min(y0, nums[i + 1])
    y1 = Math.max(y1, nums[i + 1])
  }
  let w = x1 - x0
  let h = y1 - y0
  const side = Math.max(w, h, 30)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  w = Math.max(w, side * 0.75) * (1 + pad * 2)
  h = Math.max(h, side * 0.75) * (1 + pad * 2)
  return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]
}

/** All of China, with a little sea around it. */
export const CHINA_BOX: Box = [-10, -10, DETAIL.width + 10, DETAIL.height + 10]
