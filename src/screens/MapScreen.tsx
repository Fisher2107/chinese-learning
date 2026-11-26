import { Photo } from '../components/Photo.tsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowRightIcon,
  BooksIcon,
  CornersOutIcon,
  ExamIcon,
  GlobeHemisphereEastIcon,
  MagnifyingGlassIcon,
  MagnifyingGlassPlusIcon,
  MinusIcon,
  PlusIcon,
  ScrollIcon,
  SealCheckIcon,
  SpeakerHighIcon,
  SquaresFourIcon,
  XIcon,
} from '@phosphor-icons/react'
import { loadCities, loadEra, loadFeed, loadHistory, loadIndex, loadPlaces, loadRegions, loadWikiIndex, useLoad } from '../lib/content.ts'
import { useHistoryProgress, type Era } from '../lib/history.ts'
import { EraCard, EraStrip, PinCard, StateCard } from '../components/HistoryMap.tsx'
import { CITY_BY_ID, CITIES, cityBox, cityKind, type MapCity } from '../lib/cities.ts'
import { markKey, setLearnt, useMarks } from '../lib/learn.ts'
import { LIGHT, MAP_BY_ID, REGIONS, regionColor, usePlaceStats } from '../lib/places.ts'
import { go } from '../lib/router.ts'
import type { CitiesFile, Place, PlacesFile } from '../lib/types.ts'
import { ExploreMap, WORLD_BOX, type Area, type MapApi, type MapSight, type Selection } from '../components/ExploreMap.tsx'
import { BlocksCard } from '../components/Regions.tsx'
import { blockBox, blockCentre, blockColor, blocksOf } from '../lib/regions.ts'
import { DETAIL } from '../lib/cities.ts'
import { speak } from '../lib/speech.ts'
import { LearntButton } from '../components/LearntButton.tsx'
import { Seal } from '../components/Seal.tsx'
import { Button, Loading, PageHeader, Section } from '../components/ui.tsx'
import { ZhText } from '../components/ZhText.tsx'

const STEPS = ['读完介绍', '考一考盖章', '再读两篇', '存三个词']

/** The last selection survives switching tabs, and so do the 分区 and 历史 views. */
let remembered: Selection | undefined
let rememberedBlocks: { on: boolean; id?: string } = { on: false }
let rememberedHistory: { on: boolean; era?: string } = { on: false }

/** 卷二 is written first: the map opens on 晚清 until you pick another era. */
const FIRST_ERA = 'late-qing'
const nothing = () => Promise.resolve(undefined)

/**
 * 点亮中国: a map to wander around, like a maps app, with every province and city tappable.
 * 分区 colours it by the seven regions instead; `blocks` (from map/regions/<id>) opens that view.
 * 历史 lays an era over it: its states, capitals, marches and stories; `history` (from
 * map/history/<era>) opens that view.
 */
export function MapScreen({ focus, blocks: blocksRoute, history: historyRoute }: { focus?: Selection; blocks?: string; history?: string }) {
  const placesFile = useLoad(loadPlaces, 'places').data
  const regionsFile = useLoad(loadRegions, 'regions').data
  const [blocks, setBlocksState] = useState(() =>
    blocksRoute !== undefined ? (rememberedBlocks = { on: true, id: blocksRoute || undefined }) : focus || historyRoute !== undefined ? (rememberedBlocks = { on: false }) : rememberedBlocks,
  )
  const [hist, setHistState] = useState(() =>
    historyRoute !== undefined
      ? (rememberedHistory = { on: true, era: historyRoute || rememberedHistory.era })
      : focus || blocksRoute !== undefined
        ? (rememberedHistory = { ...rememberedHistory, on: false })
        : rememberedHistory,
  )
  const [histSel, setHistSel] = useState<Selection>()
  const historyIndex = useLoad(hist.on ? loadHistory : nothing, hist.on ? 'history' : 'off').data
  const eraId = hist.era && (!historyIndex || historyIndex.eras.some((e) => e.id === hist.era)) ? hist.era : FIRST_ERA
  const loadedEra = useLoad(hist.on ? () => loadEra(eraId) : nothing, hist.on ? `era/${eraId}` : 'off').data
  // the era before stays up while the next one loads, so the map never goes blank
  const lastEra = useRef<Era>(undefined)
  if (loadedEra) lastEra.current = loadedEra
  const era = hist.on ? (loadedEra ?? lastEra.current) : undefined
  const wiki = useLoad(hist.on ? loadWikiIndex : nothing, hist.on ? 'wiki-index' : 'off').data
  const progress = useHistoryProgress()
  /** fly to the era once it has loaded (picked, or 历史 just turned on) */
  const flyToEra = useRef(false)
  const citiesFile = useLoad(loadCities, 'cities').data
  const feed = useLoad(loadFeed, 'feed').data
  const index = useLoad(loadIndex, 'index').data
  const wikiIndex = useLoad(loadWikiIndex, 'wiki-index').data
  // 百科 pages with a place: sights, and where people are remembered
  const sights = useMemo<MapSight[]>(
    () => (wikiIndex?.pages ?? []).filter((p) => p.xy).sort((a, b) => b.links - a.links).map((p) => ({ id: p.id, name: p.pin || p.name, x: p.xy![0], y: p.xy![1], person: p.kind === '人物' })),
    [wikiIndex],
  )
  const stats = usePlaceStats(feed?.cards, index?.series)
  const marks = useMarks()
  const [sel, setSelState] = useState(() => (focus ? (remembered = focus) : remembered))
  const [initialBox] = useState(() => (focus ? boxFor(focus) : undefined))
  const [searching, setSearching] = useState(false)
  const [cardH, setCardH] = useState(120)
  const api = useRef<MapApi>(null)
  const card = useRef<HTMLDivElement>(null)

  const setSel = (s?: Selection) => setSelState((remembered = s))
  const setBlocks = (b: { on: boolean; id?: string }) => {
    setBlocksState((rememberedBlocks = b))
    if (b.on && hist.on) setHistState((rememberedHistory = { ...hist, on: false }))
  }
  const setHist = (h: { on: boolean; era?: string }) => {
    setHistState((rememberedHistory = h))
    setHistSel(undefined)
    if (h.on) {
      flyToEra.current = true
      if (blocks.on) setBlocksState((rememberedBlocks = { on: false }))
    }
  }
  /** 历史: another era from the strip (on a map/history link, the link follows along) */
  function pickEra(id: string) {
    if (id === eraId) return
    setHist({ on: true, era: id })
    if (historyRoute !== undefined) go(`map/history/${id}`, true)
  }
  useEffect(() => {
    if (!era || !flyToEra.current) return
    flyToEra.current = false
    api.current?.flyToBox(era.layer.box, 6)
  }, [era])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  useEffect(() => {
    const el = card.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setCardH(e.contentRect.height))
    ro.observe(el)
    return () => ro.disconnect()
  }, [placesFile])

  const stories = useMemo(() => new Set((citiesFile?.cities ?? []).filter((c) => c.intro.length).map((c) => c.id)), [citiesFile])
  const names = useMemo(() => new Map((placesFile?.places ?? []).map((p) => [p.id, p.name])), [placesFile])
  const picked = blocks.on ? regionsFile?.regions.find((r) => r.id === blocks.id) : undefined
  /** 分区: each province's region colour, and the region names over them */
  const regionOf = useMemo(() => new Map((placesFile?.places ?? []).map((p) => [p.id, regionColor(p.region)])), [placesFile])
  const areas = useMemo<Area[] | undefined>(() => {
    if (hist.on) return era?.layer.states.map((st, i) => ({ key: `st-${i}`, text: st.name, x: st.x, y: st.y, color: st.color, small: st.kind !== 'state' }))
    if (!blocks.on || !regionsFile || !placesFile) return undefined
    const shown = regionsFile.regions.filter((r) => r.kind === '分区' || r.id === blocks.id).sort((a, b) => +(b.id === blocks.id) - +(a.id === blocks.id))
    return shown.map((r) => {
      const [x, y] = blockCentre(r)
      return { key: r.id, text: r.name, x, y, color: blockColor(r, placesFile.places) }
    })
  }, [blocks.on, blocks.id, regionsFile, placesFile, hist.on, era])
  if (!placesFile || (blocksRoute && !regionsFile) || (historyRoute !== undefined && hist.on && !era)) return <Loading />

  const light = (id: string) => stats.get(id)?.light ?? 0
  const fill = hist.on
    ? () => 'var(--map-china)'
    : blocks.on
      ? (id: string) => `color-mix(in oklab, ${regionOf.get(id) ?? '#888'} ${picked ? (picked.provinces.includes(id) ? 62 : 10) : 40}%, var(--map-china))`
      : (id: string) => (light(id) ? LIGHT[light(id)] : 'var(--map-china)')
  const lit = placesFile.places.filter((p) => light(p.id) > 0).length
  const place = sel?.kind === 'province' ? placesFile.places.find((p) => p.id === sel.id) : undefined
  const city = sel?.kind === 'city' ? CITY_BY_ID.get(sel.id) : undefined
  const country = sel?.kind === 'country' ? DETAIL.neighbours.find((n) => n.id === sel.id) : undefined

  function pick(s: Selection) {
    if (blocks.on) setBlocks({ on: false })
    setSel(s)
    setSearching(false)
    const b = boxFor(s)
    if (b) api.current?.flyToBox(b, 12)
  }

  /** 分区: pick a block (or none) and fly to it */
  function pickBlock(id?: string) {
    setBlocks({ on: true, id })
    const r = regionsFile?.regions.find((x) => x.id === id)
    if (r) api.current?.flyToBox(blockBox(r), 8)
  }

  /** 分区: a tap on the map picks the region of the province (or city) under it */
  function tapBlocks(s?: Selection) {
    const prov = s?.kind === 'province' ? s.id : s?.kind === 'city' ? CITY_BY_ID.get(s.id)?.prov : undefined
    if (!prov || !regionsFile) return
    if (picked?.provinces.includes(prov)) return
    pickBlock(blocksOf(prov, regionsFile.regions).region?.id)
  }
  const routeBlock = blocksRoute ? regionsFile?.regions.find((r) => r.id === blocksRoute) : undefined
  const layer = hist.on ? era?.layer : undefined
  const histState = layer && histSel?.kind === 'state' ? layer.states[Number(histSel.id)] : undefined
  const histPin = layer && histSel?.kind === 'pin' ? layer.pins.find((p) => p.id === histSel.id) : undefined

  return (
    <div className="fixed inset-x-0 top-0 overflow-hidden" style={{ bottom: 'calc(4rem + 2px + env(safe-area-inset-bottom))' }}>
      <ExploreMap
        names={names}
        fill={fill}
        selected={hist.on ? histSel : blocks.on ? undefined : sel}
        onSelect={hist.on ? setHistSel : blocks.on ? tapBlocks : setSel}
        learnt={marks.learnt}
        stories={stories}
        insets={{ top: 112, bottom: cardH + 16 }}
        initialBox={initialBox ?? (routeBlock && blockBox(routeBlock)) ?? (historyRoute !== undefined ? era?.layer.box : undefined)}
        areas={areas}
        sights={blocks.on || layer ? undefined : sights}
        onSight={(id) => go(`wiki/${id}`)}
        layer={layer}
        api={api}
      />

      {/* search bar, or the eras on 历史 */}
      <div className="safe-top pointer-events-none absolute inset-x-0 top-0 px-3 pt-3">
        {hist.on ? (
          historyIndex ? (
            <EraStrip index={historyIndex} current={eraId} seals={progress.seals} onPick={pickEra} />
          ) : (
            <div className="h-10" />
          )
        ) : (
          <button
            onClick={() => setSearching(true)}
            className="tile pointer-events-auto mx-auto flex h-12 w-full max-w-xl items-center gap-2.5 px-4 text-left shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
          >
            <MagnifyingGlassIcon size={20} weight="bold" className="text-mute" />
            <span className="flex-1 text-[16px] font-bold text-mute">找一个省或者城市</span>
            <span className="text-sm font-black text-huang-dark">点亮 {lit}/34</span>
          </button>
        )}
        <div className="mx-auto mt-2 flex max-w-xl gap-2">
          <ModeChip on={blocks.on} onClick={() => (blocks.on ? setBlocks({ on: false }) : setBlocks({ on: true, id: undefined }))}>
            <SquaresFourIcon size={17} weight="fill" /> 分区
          </ModeChip>
          <ModeChip on={hist.on} onClick={() => setHist({ ...hist, on: !hist.on })}>
            <ScrollIcon size={17} weight="fill" /> 历史
          </ModeChip>
        </div>
      </div>

      {/* zoom */}
      <div className="absolute right-3 flex flex-col gap-2" style={{ bottom: cardH + 24 }}>
        {(
          [
            [PlusIcon, '放大', () => api.current?.zoomBy(2)],
            [MinusIcon, '缩小', () => api.current?.zoomBy(0.5)],
            [CornersOutIcon, '看全国', () => api.current?.reset()],
            [GlobeHemisphereEastIcon, '看世界', () => api.current?.flyToBox(WORLD_BOX, 1)],
          ] as const
        ).map(([Icon, label, onClick]) => (
          <button key={label} aria-label={label} onClick={onClick} className="tile grid size-11 place-items-center shadow-[0_2px_8px_rgba(0,0,0,0.08)] active:scale-95">
            <Icon size={20} weight="bold" />
          </button>
        ))}
      </div>

      {/* card */}
      <div ref={card} className="absolute inset-x-0 bottom-0 px-3 pb-3">
        <div className="mx-auto max-w-xl">
          <AnimatePresence mode="wait" initial={false}>
            {hist.on ? (
              !era || !historyIndex ? (
                <Slide key="era-loading">
                  <div className="tile h-40 shadow-[0_4px_18px_rgba(0,0,0,0.1)]" />
                </Slide>
              ) : histState ? (
                <Slide key={`st-${era.id}-${histSel!.id}`}>
                  <StateCard era={era} state={histState} wiki={wiki} onClose={() => setHistSel(undefined)} />
                </Slide>
              ) : histPin ? (
                <Slide key={`pin-${era.id}-${histPin.id}`}>
                  <PinCard era={era} pin={histPin} wiki={wiki} onClose={() => setHistSel(undefined)} />
                </Slide>
              ) : (
                <Slide key={`era-${era.id}`}>
                  <EraCard era={era} index={historyIndex} wiki={wiki} read={progress.read} sealed={progress.seals.has(era.id)} />
                </Slide>
              )
            ) : blocks.on && regionsFile ? (
              <Slide key="blocks">
                <BlocksCard file={regionsFile} places={placesFile.places} feed={feed?.cards} picked={picked} onPick={pickBlock} onClose={() => setBlocks({ on: false })} />
              </Slide>
            ) : place ? (
              <Slide key={`p-${place.id}`}>
                <ProvinceCard
                  place={place}
                  file={placesFile}
                  light={light(place.id)}
                  stamp={!!stats.get(place.id)?.stamp}
                  learnt={marks.learnt.has(markKey('province', place.id))}
                  onClose={() => setSel(undefined)}
                  onZoom={() => pick({ kind: 'province', id: place.id })}
                />
              </Slide>
            ) : city ? (
              <Slide key={`c-${city.id}`}>
                <CityCard
                  city={city}
                  file={citiesFile}
                  province={placesFile.places.find((p) => p.id === city.prov)}
                  learnt={marks.learnt.has(markKey('city', city.id))}
                  onClose={() => setSel(undefined)}
                />
              </Slide>
            ) : country ? (
              <Slide key={`n-${country.id}`}>
                <CountryCard country={country} onClose={() => setSel(undefined)} />
              </Slide>
            ) : (
              <Slide key="home">
                <HomeCard learnt={marks.learnt.size} stamps={placesFile.places.filter((p) => stats.get(p.id)?.stamp).length} onHistory={() => setHist({ ...hist, on: true })} />
              </Slide>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>{searching && <Search places={placesFile.places} onPick={pick} onClose={() => setSearching(false)} />}</AnimatePresence>
    </div>
  )
}

function boxFor(s: Selection): [number, number, number, number] | undefined {
  if (s.kind === 'country') {
    const n = DETAIL.neighbours.find((c) => c.id === s.id)
    return n && [n.x - 120, n.y - 120, n.x + 120, n.y + 120]
  }
  if (s.kind === 'province') return MAP_BY_ID.get(s.id)?.box as [number, number, number, number] | undefined
  const c = CITY_BY_ID.get(s.id)
  return c && cityBox(c, 40)
}

/** 分区 and 历史: the two ways to colour the map, under the search bar. */
function ModeChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`pointer-events-auto flex h-9 items-center gap-1.5 rounded-full border-2 px-3.5 text-[15px] font-extrabold shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${on ? 'border-dai bg-dai text-white' : 'border-line bg-surface'}`}
    >
      {children}
    </button>
  )
}

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }} transition={{ duration: 0.18 }}>
      {children}
    </motion.div>
  )
}

function HomeCard({ learnt, stamps, onHistory }: { learnt: number; stamps: number; onHistory: () => void }) {
  return (
    <div className="tile p-4 shadow-[0_4px_18px_rgba(0,0,0,0.1)]">
      <p className="text-[15px] font-bold text-mute">拖一拖、放大看看，点一个省、城市或者国家。缩小就能看到全世界。</p>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <button onClick={() => go('wiki')} className="flex flex-col items-center gap-1 rounded-2xl bg-sunken py-2.5 text-[14px] font-extrabold">
          <BooksIcon size={24} weight="fill" className="text-dai" />
          百科
        </button>
        <button onClick={onHistory} className="flex flex-col items-center gap-1 rounded-2xl bg-sunken py-2.5 text-[14px] font-extrabold">
          <ScrollIcon size={24} weight="fill" className="text-zhu-dark" />
          历史地图
        </button>
        <button onClick={() => go('map/test')} disabled={!learnt} className="flex flex-col items-center gap-1 rounded-2xl bg-sunken py-2.5 text-[14px] font-extrabold disabled:opacity-50">
          <ExamIcon size={24} weight="fill" className="text-zhu" />
          考考我{learnt ? ` · ${learnt}` : ''}
        </button>
        <button onClick={() => go('map/stamps')} className="flex flex-col items-center gap-1 rounded-2xl bg-sunken py-2.5 text-[14px] font-extrabold">
          <SealCheckIcon size={24} weight="fill" className="text-zhu-dark" />
          集章册 · {stamps}
        </button>
      </div>
    </div>
  )
}

function CloseX({ onClose }: { onClose: () => void }) {
  return (
    <button aria-label="关闭" onClick={onClose} className="absolute top-2 right-2 grid size-9 place-items-center rounded-full text-mute active:bg-sunken">
      <XIcon size={18} weight="bold" />
    </button>
  )
}

function ProvinceCard({
  place,
  file,
  light,
  stamp,
  learnt,
  onClose,
  onZoom,
}: {
  place: Place
  file: PlacesFile
  light: number
  stamp: boolean
  learnt: boolean
  onClose: () => void
  onZoom: () => void
}) {
  const color = regionColor(place.region)
  const first = place.intro[0]?.sentences[0]
  const cityCount = CITIES.filter((c) => c.prov === place.id && c.kind !== 'muni').length
  return (
    <div className="tile relative p-4 shadow-[0_4px_18px_rgba(0,0,0,0.1)]">
      <CloseX onClose={onClose} />
      <div className="flex items-center gap-3 pr-8">
        <Seal char={place.short} earned={stamp} size={50} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] leading-tight font-black">{place.name}</span>
            <span className="truncate text-sm font-extrabold" style={{ color }}>
              {place.region} · {place.type}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[14px] font-bold text-mute">
            <span className="truncate">
              简称“{place.short}”{place.capital && ` · 省会${place.capital}`}
            </span>
            <span className="flex shrink-0 gap-0.5" aria-label={`亮度 ${light}/4`}>
              {[1, 2, 3, 4].map((i) => (
                <span key={i} className="h-1.5 w-4 rounded-full" style={{ background: i <= light ? LIGHT[i] : 'var(--line)' }} />
              ))}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-start gap-3">
        <Photo k={`place/${place.id}`} ratio="4 / 3" fit="cover" credit={false} className="w-20 shrink-0 rounded-xl" />
        {first && (
          <ZhText
            ui
            id={`map-p-${place.id}`}
            paras={[{ kind: 'p', sentences: [first] }]}
            glossary={file.glossary}
            source={{ kind: 'place', route: `place/${place.id}`, title: `${place.name} · 地图` }}
            className="line-clamp-3 min-w-0 flex-1 text-[16px]"
          />
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <LearntButton on={learnt} onToggle={() => setLearnt('province', place.id, !learnt)} />
        {cityCount > 0 && (
          <button onClick={onZoom} aria-label="放大看城市" className="grid size-12 shrink-0 place-items-center rounded-2xl border-2 border-line">
            <MagnifyingGlassPlusIcon size={22} weight="bold" />
          </button>
        )}
        <Button tone="lv" size="md" className="h-12 min-w-0 flex-1 !px-3" onClick={() => go(`place/${place.id}`)}>
          打开 <ArrowRightIcon size={18} weight="bold" />
        </Button>
      </div>
    </div>
  )
}

function CityCard({ city, file, province, learnt, onClose }: { city: MapCity; file?: CitiesFile; province?: Place; learnt: boolean; onClose: () => void }) {
  const content = file?.cities.find((c) => c.id === city.id)
  const first = content?.intro[0]?.sentences[0] ?? content?.facts[0]
  const muni = city.kind === 'muni'
  return (
    <div className="tile relative p-4 shadow-[0_4px_18px_rgba(0,0,0,0.1)]">
      <CloseX onClose={onClose} />
      <div className="pr-8">
        <div className="flex items-baseline gap-2">
          <span className="text-[24px] leading-tight font-black">{city.name}</span>
          <span className="truncate text-sm font-extrabold text-mute">
            {cityKind(city)}
            {province && !muni && ` · ${province.name}`}
          </span>
        </div>
        {(content?.nickname || city.pop > 0) && (
          <div className="text-[14px] font-bold text-mute">
            {content?.nickname && <span>别称“{content.nickname}”</span>}
            {content?.nickname && city.pop > 0 && ' · '}
            {city.pop > 0 && <span>人口约{city.pop >= 100 ? Math.round(city.pop / 10) * 10 : city.pop}万</span>}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-start gap-3">
        <Photo k={`city/${city.id}`} ratio="4 / 3" fit="cover" credit={false} className="w-20 shrink-0 rounded-xl" />
        {first && file && !muni && (
          <ZhText
            ui
            id={`map-c-${city.id}`}
            paras={[{ kind: 'p', sentences: [first] }]}
            glossary={file.glossary}
            source={{ kind: 'place', route: `city/${city.id}`, title: `${city.name} · 地图` }}
            className="line-clamp-3 min-w-0 flex-1 text-[16px]"
          />
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <LearntButton on={learnt} onToggle={() => setLearnt('city', city.id, !learnt)} />
        <Button tone="lv" size="md" className="h-12 min-w-0 flex-1 !px-3" onClick={() => go(muni ? `place/${city.prov}` : `city/${city.id}`)}>
          打开 <ArrowRightIcon size={18} weight="bold" />
        </Button>
      </div>
    </div>
  )
}

/** Another country: its name in Chinese, to hear and learn. */
function CountryCard({ country, onClose }: { country: (typeof DETAIL.neighbours)[number]; onClose: () => void }) {
  const [py, setPy] = useState('')
  useEffect(() => {
    import('pinyin-pro').then((m) => setPy(m.pinyin(country.zh)), () => {})
  }, [country.zh])
  return (
    <div className="tile relative p-4 shadow-[0_4px_18px_rgba(0,0,0,0.1)]">
      <CloseX onClose={onClose} />
      <div className="flex items-center gap-3 pr-8">
        <GlobeHemisphereEastIcon size={40} weight="duotone" className="shrink-0 text-dai" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[24px] leading-tight font-black">{country.zh}</span>
            <span className="text-[16px] font-extrabold text-zhu">{py}</span>
          </div>
          <div className="truncate text-[14px] font-bold text-mute">{country.en}</div>
        </div>
        <button aria-label="朗读" onClick={() => speak(country.zh, 0.8)} className="grid size-11 shrink-0 place-items-center rounded-xl bg-sunken text-dai">
          <SpeakerHighIcon size={22} weight="fill" />
        </button>
      </div>
      {'border' in country && country.border && (
        <p className="mt-2 rounded-xl bg-sunken px-3 py-2 text-[15px] font-bold">和中国接壤：中国有14个陆地邻国，{country.zh}是其中之一。</p>
      )}
    </div>
  )
}

/** Type a name (汉字 or pinyin) to fly there. */
function Search({ places, onPick, onClose }: { places: Place[]; onPick: (s: Selection) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const norm = q.trim().toLowerCase().replace(/[\s'’]/g, '').replace(/ü/g, 'v')
  const results = useMemo(() => {
    if (!norm) return []
    const out: { s: Selection; name: string; sub: string }[] = []
    for (const p of places)
      if (p.name.includes(norm) || p.full.includes(norm) || p.id.startsWith(norm)) out.push({ s: { kind: 'province', id: p.id }, name: p.name, sub: `${p.region} · ${p.type}` })
    for (const c of CITIES)
      if (c.kind !== 'muni' && (c.name.includes(norm) || c.full.includes(norm) || c.pin.startsWith(norm)))
        out.push({ s: { kind: 'city', id: c.id }, name: c.name, sub: `${cityKind(c)} · ${places.find((p) => p.id === c.prov)?.name ?? ''}` })
    return out.slice(0, 40)
  }, [norm, places])
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 bg-bg/95 backdrop-blur-sm">
      <div className="safe-top mx-auto max-w-xl px-3 pt-3">
        <div className="tile flex h-12 items-center gap-2 px-3">
          <MagnifyingGlassIcon size={20} weight="bold" className="text-mute" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="成都、chengdu、四川…"
            className="min-w-0 flex-1 bg-transparent text-[17px] font-bold outline-none placeholder:text-mute"
          />
          <button onClick={onClose} className="h-10 px-2 text-[15px] font-extrabold text-mute">
            取消
          </button>
        </div>
        <div className="no-scrollbar mt-2 max-h-[calc(100dvh-180px)] overflow-y-auto">
          {results.map((r) => (
            <button key={`${r.s.kind}-${r.s.id}`} onClick={() => onPick(r.s)} className="flex w-full items-center gap-3 border-b-2 border-line px-2 py-3 text-left active:bg-sunken">
              <span className="text-[18px] font-black">{r.name}</span>
              <span className="truncate text-sm font-bold text-mute">{r.sub}</span>
            </button>
          ))}
          {norm && !results.length && <p className="p-4 text-center font-bold text-mute">没找到。试试别的写法？</p>}
        </div>
      </div>
    </motion.div>
  )
}

/** 集章册: every province's seal, and how provinces light up. */
export function StampBook() {
  const places = useLoad(loadPlaces, 'places').data?.places
  const feed = useLoad(loadFeed, 'feed').data
  const index = useLoad(loadIndex, 'index').data
  const wikiIndex = useLoad(loadWikiIndex, 'wiki-index').data
  // 百科 pages with a place: sights, and where people are remembered
  const sights = useMemo<MapSight[]>(
    () => (wikiIndex?.pages ?? []).filter((p) => p.xy).sort((a, b) => b.links - a.links).map((p) => ({ id: p.id, name: p.pin || p.name, x: p.xy![0], y: p.xy![1], person: p.kind === '人物' })),
    [wikiIndex],
  )
  const stats = usePlaceStats(feed?.cards, index?.series)
  if (!places) return <Loading />
  const stamped = places.filter((p) => stats.get(p.id)?.stamp)
  return (
    <div className="pb-12">
      <PageHeader title="集章册" fallback="map/china" right={<span className="pr-2 text-sm font-extrabold text-mute">{stamped.length}/34</span>} />
      <div className="mx-auto max-w-xl px-4">
        <div className="tile p-4">
          <div className="text-[15px] font-black">怎么点亮一个地方</div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {STEPS.map((s, i) => (
              <span key={s} className="flex items-center gap-2 text-sm font-bold text-mute">
                <span className="size-3.5 shrink-0 rounded-[4px]" style={{ background: LIGHT[i + 1] }} />
                {s}
              </span>
            ))}
          </div>
        </div>
        <Section title="印章">
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
      </div>
    </div>
  )
}
