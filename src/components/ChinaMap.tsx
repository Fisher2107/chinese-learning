import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { motion } from 'motion/react'
import { LIGHT, MAP, MAP_BY_ID } from '../lib/places.ts'

type Box = [number, number, number, number]
const FULL: Box = [0, 0, MAP.width, MAP.height]

function useWidth<T extends Element>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/**
 * The 34 provincial-level divisions. Fill shows how lit each one is (0–4).
 * Tiny ones (Beijing, Tianjin, Shanghai, Hong Kong, Macau) also catch taps near them.
 */
export function ChinaMap({
  light,
  selected,
  onSelect,
  box = FULL,
  names,
  stamps,
  className = '',
}: {
  light: (id: string) => number
  selected?: string
  onSelect?: (id: string) => void
  box?: Box
  /** id → short label drawn on the selected province */
  names?: Map<string, string>
  /** id → 简称 for stamped provinces, drawn as tiny seals when there's room */
  stamps?: Map<string, string>
  className?: string
}) {
  const [ref, width] = useWidth<SVGSVGElement>()
  const vbW = box[2] - box[0]
  const vbH = box[3] - box[1]
  const pxPerUnit = width ? width / vbW : 0.35
  const unit = (px: number) => px / pxPerUnit

  function click(e: MouseEvent<SVGSVGElement>) {
    if (!onSelect) return
    const svg = e.currentTarget
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    // Prefer a tiny division whose centre is within ~22px of the tap
    let best: string | undefined
    let bestD = 22
    for (const p of MAP.provinces) {
      if (Math.max(p.box[2] - p.box[0], p.box[3] - p.box[1]) * pxPerUnit > 30) continue
      const d = Math.hypot(p.cx - pt.x, p.cy - pt.y) * pxPerUnit
      if (d < bestD) [best, bestD] = [p.id, d]
    }
    const hit = best ?? (e.target as Element).closest('[data-id]')?.getAttribute('data-id') ?? undefined
    if (hit) onSelect(hit)
  }

  const sel = selected ? MAP_BY_ID.get(selected) : undefined
  return (
    <motion.svg
      ref={ref}
      viewBox={box.join(' ')}
      animate={{ viewBox: box.join(' ') }}
      transition={{ duration: 0.45, ease: [0.3, 0.7, 0.2, 1] }}
      className={`block w-full touch-manipulation ${className}`}
      style={{ aspectRatio: `${vbW} / ${vbH}` }}
      onClick={click}
      role="img"
      aria-label="中国地图"
    >
      <g strokeLinejoin="round">
        {MAP.provinces.map((p) => (
          <path
            key={p.id}
            data-id={p.id}
            d={p.d}
            fill={LIGHT[light(p.id)]}
            stroke="var(--bg)"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
            className={onSelect ? 'cursor-pointer' : undefined}
          />
        ))}
        {/* Hong Kong and Macau are too small to see at this scale: draw a dot */}
        {MAP.provinces
          .filter((p) => p.small)
          .map((p) => (
            <circle
              key={p.id}
              data-id={p.id}
              cx={p.cx}
              cy={p.cy}
              r={unit(3.5)}
              fill={light(p.id) ? LIGHT[light(p.id)] : 'var(--mute)'}
            />
          ))}
      </g>
      {stamps &&
        MAP.provinces.map((p) => {
          const ch = stamps.get(p.id)
          const room = Math.min(p.box[2] - p.box[0], p.box[3] - p.box[1]) * pxPerUnit
          if (!ch || room < 26 || p.id === selected) return null
          const s = unit(15)
          return (
            <g key={p.id} transform={`translate(${p.cx} ${p.cy}) rotate(-6)`} pointerEvents="none">
              <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={s * 0.16} fill="#C8341A" />
              <text y={s * 0.05} fontSize={s * 0.66} textAnchor="middle" dominantBaseline="middle" fill="#FFF6EE" className="font-book">
                {ch}
              </text>
            </g>
          )
        })}
      {sel && (
        <g pointerEvents="none">
          <path d={sel.d} fill="none" stroke="var(--text)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {sel.small && <circle cx={sel.cx} cy={sel.cy} r={unit(6)} fill="none" stroke="var(--text)" strokeWidth={2.5} vectorEffect="non-scaling-stroke" />}
          {names?.get(sel.id) && (
            <text
              x={sel.cx}
              y={sel.cy - unit(sel.small ? 12 : 2)}
              fontSize={unit(14)}
              fontWeight={900}
              textAnchor="middle"
              dominantBaseline={sel.small ? 'auto' : 'middle'}
              fill="var(--text)"
              stroke="var(--bg)"
              strokeWidth={unit(4)}
              paintOrder="stroke"
            >
              {names.get(sel.id)}
            </text>
          )}
        </g>
      )}
    </motion.svg>
  )
}

/** A small locator map: the whole country in grey with one province in colour. */
export function LocatorMap({
  id,
  color,
  rest = 'var(--sunken)',
  edge = 'var(--bg)',
  className = '',
}: {
  id: string
  color: string
  rest?: string
  edge?: string
  className?: string
}) {
  const me = MAP_BY_ID.get(id)
  return (
    <svg viewBox={`0 0 ${MAP.width} ${MAP.height}`} className={`block ${className}`} aria-hidden>
      {MAP.provinces.map((p) => (
        <path key={p.id} d={p.d} fill={p.id === id ? color : rest} stroke={edge} strokeWidth={2} strokeLinejoin="round" />
      ))}
      {me?.small && <circle cx={me.cx} cy={me.cy} r={22} fill="none" stroke={color} strokeWidth={8} />}
    </svg>
  )
}
