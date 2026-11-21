import { DETAIL } from '../lib/cities.ts'

type Box = [number, number, number, number]

/**
 * A still picture of part of the map, no names on it: for city pages and the 认地图 test.
 * `focus` is drawn in the accent colour; `dots` are cities (one can be the target, pulsing).
 */
export function StaticMap({
  box,
  focus,
  dots = [],
  target,
  color = '#ED5126',
  className = '',
}: {
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
  return (
    <svg viewBox={`${box[0]} ${box[1]} ${w} ${h}`} className={`map-ocean block w-full ${className}`} style={{ aspectRatio: `${w} / ${h}` }} role="img" aria-label="地图">
      <g strokeLinejoin="round">
        {DETAIL.neighbours.map((n) => (
          <path key={n.zh} d={n.d} className="map-abroad" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
        ))}
        {Object.entries(DETAIL.provinces).map(([id, d]) => (
          <path
            key={id}
            d={d}
            fill={id === focus ? `color-mix(in oklab, ${color} ${target ? 14 : 85}%, var(--map-china))` : 'var(--map-china)'}
            stroke={id === focus ? color : 'var(--map-border)'}
            strokeWidth={id === focus ? 2 : 1}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <path d={DETAIL.lakes.d} className="map-lake" />
        {DETAIL.rivers.map((r) => (
          <path key={r.zh} d={r.d} fill="none" className="map-river" strokeWidth={r.major ? 1.6 : 0.8} vectorEffect="non-scaling-stroke" />
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
      </g>
    </svg>
  )
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
