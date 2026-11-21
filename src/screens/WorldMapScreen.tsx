import { GlobeHemisphereEastIcon, XIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import world from '../data/world-map.json'
import { go } from '../lib/router.ts'

const chinaAreas = new Set(['CHN', 'TWN', 'HKG', 'MAC'])
const areas = world.areas.filter(({ id }) => !chinaAreas.has(id) && id !== 'ATA')
const names = new Map(areas.map(({ id, name }) => [id, name]))
const sortedAreas = [...areas].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))

export function WorldMapScreen() {
  const [selected, setSelected] = useState('')
  const name = names.get(selected)
  const openChina = () => go('map/china')

  return (
    <div
      className="map-ocean fixed inset-x-0 top-0 grid grid-rows-[auto_minmax(0,1fr)_5.5rem] overflow-hidden"
      style={{ bottom: 'calc(4rem + 2px + env(safe-area-inset-bottom))' }}
    >
      <div className="safe-top px-3 pt-3">
        <div className="mx-auto flex max-w-xl flex-wrap items-center gap-2">
          <label className="tile flex h-12 min-w-0 flex-1 items-center gap-2 px-3">
            <GlobeHemisphereEastIcon size={22} weight="bold" className="shrink-0 text-lv-ink" aria-hidden />
            <select
              aria-label="查找国家和地区"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="h-full min-w-0 flex-1 bg-surface text-[15px] font-bold text-text"
            >
              <option value="">查找国家和地区</option>
              {sortedAreas.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <button onClick={openChina} className="tile h-12 shrink-0 px-3 text-[15px] font-black text-lv-ink">
            中国地图
          </button>
        </div>
      </div>

      <div className="min-h-0 px-2 py-2 sm:px-5">
        <svg
          viewBox={`0 0 ${world.width} ${world.height}`}
          className="block size-full touch-manipulation select-none"
          role="img"
          aria-label="以中国为中心的世界地图"
          onClick={(event) => {
            const id = (event.target as Element).closest('[data-area]')?.getAttribute('data-area')
            if (id && chinaAreas.has(id)) openChina()
            else setSelected(id && names.has(id) ? id : '')
          }}
        >
          <path d={world.outline} fill="var(--map-water)" fillOpacity={0.16} stroke="var(--map-water)" strokeOpacity={0.6} />
          <path d={world.grid} fill="none" stroke="var(--map-water)" strokeOpacity={0.35} strokeWidth={0.65} />
          <g strokeLinejoin="round" strokeWidth={1.1}>
            {world.areas.map(({ id, d }) => (
              <path
                key={id}
                d={d}
                data-area={id}
                className={id === 'ATA' ? undefined : 'cursor-pointer'}
                fill={chinaAreas.has(id) ? 'var(--color-lv)' : selected === id ? 'var(--color-huang)' : 'var(--map-abroad)'}
                stroke={selected === id ? 'var(--text)' : 'var(--map-border)'}
              />
            ))}
          </g>
          <g data-area="CHN" className="cursor-pointer" transform={`translate(${world.china.join(' ')})`}>
            <rect x={-34} y={-18} width={68} height={36} rx={14} fill="var(--surface)" stroke="var(--color-lv)" strokeWidth={1.5} />
            <text fill="var(--text)" textAnchor="middle" dominantBaseline="central" fontWeight={900} fontSize={22}>中国</text>
          </g>
        </svg>
      </div>

      <div className="mx-auto flex w-full max-w-xl items-end px-3 pb-3">
        <div className="w-full" role="status">
          {name && (
            <div className="tile flex min-h-14 items-center gap-3 py-1 pr-1 pl-3 shadow-[0_4px_18px_rgba(0,0,0,0.1)]">
              <GlobeHemisphereEastIcon size={24} weight="duotone" className="shrink-0 text-lv-ink" aria-hidden />
              <span className="min-w-0 flex-1 text-lg font-black">{name}</span>
              <button
                type="button"
                aria-label="关闭"
                onClick={() => setSelected('')}
                className="grid size-11 shrink-0 place-items-center rounded-full text-mute active:bg-sunken"
              >
                <XIcon size={18} weight="bold" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
