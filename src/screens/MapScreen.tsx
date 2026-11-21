import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRightIcon, MapTrifoldIcon } from '@phosphor-icons/react'
import { loadFeed, loadIndex, loadPlaces, useLoad } from '../lib/content.ts'
import { boxOf, LIGHT, REGIONS, regionColor, usePlaceStats } from '../lib/places.ts'
import { go } from '../lib/router.ts'
import type { Place, Region } from '../lib/types.ts'
import { ChinaMap } from '../components/ChinaMap.tsx'
import { Seal } from '../components/Seal.tsx'
import { Button, Loading, ProgressBar, Section } from '../components/ui.tsx'

const STEPS = ['打开看看', '考一考盖章', '读两篇', '存三个词']

/** Last selection survives switching tabs. */
let remembered: { id?: string; region: Region | '' } = { region: '' }

export function MapScreen() {
  const places = useLoad(loadPlaces, 'places').data?.places
  const feed = useLoad(loadFeed, 'feed').data
  const index = useLoad(loadIndex, 'index').data
  const stats = usePlaceStats(feed?.cards, index?.series)
  const [sel, setSelState] = useState(remembered.id)
  const [region, setRegionState] = useState(remembered.region)
  if (!places) return <Loading />

  const setSel = (id?: string) => setSelState((remembered.id = id))
  const setRegion = (r: Region | '') => setRegionState((remembered.region = r))
  const light = (id: string) => stats.get(id)?.light ?? 0
  const lit = places.filter((p) => light(p.id) > 0).length
  const stamped = places.filter((p) => stats.get(p.id)?.stamp)
  const box = region ? boxOf(places.filter((p) => p.region === region).map((p) => p.id)) : undefined
  const place = places.find((p) => p.id === sel)

  return (
    <div className="mx-auto max-w-xl px-4">
      <div className="safe-top flex items-end justify-between pt-5">
        <h1 className="text-[28px] font-black">点亮中国</h1>
        <span className="pb-1.5 text-sm font-extrabold text-mute">
          {lit}/34 点亮 · {stamped.length} 个章
        </span>
      </div>
      <ProgressBar value={lit / 34} color="#F7A43A" className="mt-3 h-3" />

      <div className="tile mt-4 overflow-hidden p-2">
        <ChinaMap
          light={light}
          selected={sel}
          onSelect={(id) => setSel(id === sel ? undefined : id)}
          box={box}
          names={new Map(places.map((p) => [p.id, p.name]))}
          stamps={new Map(stamped.map((p) => [p.id, p.short]))}
        />
      </div>

      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
        {[{ name: '' as const, color: 'var(--dai)' }, ...REGIONS].map((r) => {
          const on = region === r.name
          return (
            <button
              key={r.name || 'all'}
              onClick={() => setRegion(r.name)}
              className="h-9 shrink-0 rounded-full border-2 px-3.5 text-sm font-extrabold transition-colors"
              style={{ borderColor: on ? r.color : 'var(--line)', background: on ? r.color : 'var(--surface)', color: on ? '#fff' : 'var(--mute)' }}
            >
              {r.name || '全国'}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {place ? (
          <motion.div key={place.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4">
            <PlaceCard place={place} light={light(place.id)} stamp={!!stats.get(place.id)?.stamp} />
          </motion.div>
        ) : (
          <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tile mt-4 flex items-center gap-3 p-4">
            <MapTrifoldIcon size={30} weight="fill" className="shrink-0 text-huang-dark" />
            <p className="text-[15px] font-bold text-mute">点一个地方看看。可以先从中国朋友的家乡开始！</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-xs font-bold text-mute">
        怎么点亮：
        {STEPS.map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            <span className="size-3 rounded-[4px]" style={{ background: LIGHT[i + 1] }} />
            {s}
          </span>
        ))}
      </div>

      <Section title="集章册" action={<span className="text-sm font-extrabold text-mute">{stamped.length}/34</span>}>
        <div className="space-y-5">
          {REGIONS.map((r) => (
            <div key={r.name}>
              <div className="mb-2 px-1 text-sm font-black" style={{ color: r.color }}>
                {r.name}
              </div>
              <div className="grid grid-cols-5 gap-y-3 sm:grid-cols-6">
                {places
                  .filter((p) => p.region === r.name)
                  .map((p) => (
                    <button key={p.id} onClick={() => go(`place/${p.id}`)} className="flex flex-col items-center gap-1.5">
                      <Seal char={p.short} earned={!!stats.get(p.id)?.stamp} size={48} tilt={((p.id.charCodeAt(0) % 7) - 3) * 1.5} />
                      <span className="text-xs font-extrabold text-mute">{p.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </Section>
      <div className="h-6" />
    </div>
  )
}

function PlaceCard({ place, light, stamp }: { place: Place; light: number; stamp: boolean }) {
  const color = regionColor(place.region)
  return (
    <div className="tile overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        <Seal char={place.short} earned={stamp} size={60} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black">{place.name}</span>
            <span className="text-sm font-extrabold" style={{ color }}>
              {place.region} · {place.type}
            </span>
          </div>
          <div className="mt-0.5 text-[15px] font-bold text-mute">
            <span className="whitespace-nowrap">简称“{place.short}”{place.alias && `或“${place.alias}”`}</span>
                {place.capital && <span className="whitespace-nowrap"> · 省会{place.capital}</span>}
          </div>
          <div className="mt-2 flex gap-1" aria-label={`亮度 ${light}/4`}>
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className="h-2 w-7 rounded-full" style={{ background: i <= light ? LIGHT[i] : 'var(--line)' }} />
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 pb-4">
        <Button tone="lv" className="w-full" onClick={() => go(`place/${place.id}`)}>
          去{place.name}看看 <ArrowRightIcon size={20} weight="bold" />
        </Button>
      </div>
    </div>
  )
}
