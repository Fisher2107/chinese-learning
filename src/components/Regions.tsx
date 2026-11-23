import { ArrowRightIcon, CaretRightIcon, ChatsTeardropIcon, XIcon } from '@phosphor-icons/react'
import { blockColor, blocksOf, onlineNoteFor } from '../lib/regions.ts'
import { regionColor } from '../lib/places.ts'
import { go } from '../lib/router.ts'
import type { FeedCard, Place, RegionInfo, RegionsFile } from '../lib/types.ts'
import { LocatorMap } from './ChinaMap.tsx'
import { ZhText } from './ZhText.tsx'

const source = (r: RegionInfo) => ({ kind: 'place' as const, route: `map/regions/${r.id}`, title: `${r.name} · 分区` })
const cardTitle = (c: FeedCard) => c.title.flatMap((s) => s.tokens.map((t) => t.t)).join('')

/** 网上的说法: what a short video or the internet jokes about a block, and the 刷一刷 cards that dig into it. */
export function OnlineNote({ block, glossary, feed }: { block: RegionInfo; glossary: Record<string, string>; feed?: FeedCard[] }) {
  const cards = block.cards.map((id) => feed?.find((c) => c.id === id)).filter((c): c is FeedCard => !!c)
  return (
    <div className="mt-3 rounded-2xl bg-sunken p-3">
      <div className="flex items-center gap-1.5 text-sm font-black text-zhu-ink">
        <ChatsTeardropIcon size={18} weight="fill" /> 网上的说法
      </div>
      <ZhText ui id={`online-${block.id}`} paras={[{ kind: 'p', sentences: block.online }]} glossary={glossary} source={source(block)} className="mt-1 text-[16px]" />
      {cards.length > 0 && (
        <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl bg-surface">
          {cards.map((c) => (
            <li key={c.id}>
              <a className="flex items-center gap-2 px-3 py-2.5 text-[15px] font-bold" href={'#/feed/' + c.id}>
                <span className="shrink-0 rounded-md bg-zhu-soft px-1.5 text-xs leading-5 font-black text-zhu-ink">故事</span>
                <span className="min-w-0 flex-1">{cardTitle(c)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Chip({ on, color, onClick, children }: { on?: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border-2 px-3 text-[15px] font-extrabold"
      style={on ? { background: color, borderColor: color, color: '#fff' } : { borderColor: 'var(--line)' }}
    >
      {!on && <span className="size-2.5 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  )
}

/**
 * The 分区 map's card: the seven regions and the blocks people name (江浙沪…) as chips, and the one
 * picked: its provinces, what it is, and what people say about it online.
 */
export function BlocksCard({
  file,
  places,
  feed,
  picked,
  onPick,
  onClose,
}: {
  file: RegionsFile
  places: Place[]
  feed?: FeedCard[]
  picked?: RegionInfo
  onPick: (id?: string) => void
  onClose: () => void
}) {
  const name = (id: string) => places.find((p) => p.id === id)?.name ?? id
  const chips = (kind: RegionInfo['kind']) =>
    file.regions
      .filter((r) => r.kind === kind)
      .map((r) => (
        <Chip key={r.id} on={picked?.id === r.id} color={blockColor(r, places)} onClick={() => onPick(picked?.id === r.id ? undefined : r.id)}>
          {r.name}
        </Chip>
      ))
  const color = picked && blockColor(picked, places)
  return (
    <div className="tile relative max-h-[48dvh] overflow-y-auto p-4 shadow-[0_4px_18px_rgba(0,0,0,0.1)]">
      <button aria-label="关闭" onClick={picked ? () => onPick(undefined) : onClose} className="absolute top-2 right-2 grid size-9 place-items-center rounded-full text-mute active:bg-sunken">
        <XIcon size={18} weight="bold" />
      </button>
      {picked ? (
        <div className="flex flex-wrap items-baseline gap-x-2 pr-8">
          <span className="text-[24px] leading-tight font-black" style={{ color }}>
            {picked.name}
          </span>
          <span className="text-sm font-extrabold text-mute">
            {picked.kind === '分区' ? '七大地区之一' : '常说的叫法'} · {picked.provinces.length}个省级行政区
          </span>
        </div>
      ) : (
        <>
          <div className="pr-8 text-[20px] leading-tight font-black">中国七大地区</div>
          <p className="mt-1 text-[15px] font-bold text-mute">地理课上常把中国分成七块。点地图上的一块，或者下面的名字。</p>
        </>
      )}
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">{chips('分区')}</div>
      <div className="no-scrollbar -mx-4 mt-2 flex items-center gap-2 overflow-x-auto px-4">
        <span className="shrink-0 text-sm font-black text-mute">还常说</span>
        {chips('常说')}
      </div>
      {picked && (
        <>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {picked.provinces.map((id) => (
              <button key={id} onClick={() => go(`place/${id}`)} className="flex h-8 items-center gap-0.5 rounded-lg bg-sunken px-2.5 text-[15px] font-extrabold">
                {name(id)} <CaretRightIcon size={12} weight="bold" className="text-mute" />
              </button>
            ))}
          </div>
          <ZhText ui id={`region-${picked.id}`} paras={[{ kind: 'p', sentences: picked.intro }]} glossary={file.glossary} source={source(picked)} className="mt-2 text-[16px]" />
          {picked.online.length > 0 && <OnlineNote block={picked} glossary={file.glossary} feed={feed} />}
        </>
      )}
    </div>
  )
}

/** On a province's map: which of the seven regions it's in, the names people use for its block, and what's said online. */
export function PlaceRegion({ place, file, places, feed }: { place: Place; file: RegionsFile; places: Place[]; feed?: FeedCard[] }) {
  const { region, common } = blocksOf(place.id, file.regions)
  if (!region) return null
  const color = regionColor(region.name)
  const note = onlineNoteFor(place.id, file.regions)
  const name = (id: string) => places.find((p) => p.id === id)?.name ?? id
  const others = region.provinces.filter((p) => p !== place.id)
  return (
    <div className="tile mt-3 p-3.5">
      <div className="flex items-center gap-3">
        <LocatorMap
          id={place.id}
          color={color}
          rest="var(--line)"
          edge="var(--surface)"
          group={region.provinces}
          groupColor={`color-mix(in oklab, ${color} 45%, var(--line))`}
          className="w-24 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-mute">所在地区</div>
          <div className="text-[20px] leading-snug font-black">
            {place.name}属于<span style={{ color }}>{region.name}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[14px] font-bold text-mute">
            <span>还有</span>
            {others.map((id) => (
              <button key={id} onClick={() => go(`place/${id}`)} className="rounded-md bg-sunken px-1.5 leading-6 font-extrabold text-text">
                {name(id)}
              </button>
            ))}
          </div>
        </div>
      </div>
      {common.map((c) => (
        <p key={c.id} className="mt-2 text-[15px] font-bold">
          也常说“<span style={{ color }}>{c.name}</span>”：{c.provinces.map(name).join('、')}
        </p>
      ))}
      {note && <OnlineNote block={note} glossary={file.glossary} feed={feed} />}
      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-1 text-sm font-extrabold text-mute">
          <CaretRightIcon size={14} weight="bold" className="transition-transform group-open:rotate-90" /> 说说{[region, ...common].map((r) => r.name).join('和')}
        </summary>
        {[region, ...common].map((r) => (
          <ZhText key={r.id} ui id={`region-${place.id}-${r.id}`} paras={[{ kind: 'p', sentences: r.intro }]} glossary={file.glossary} source={source(r)} className="mt-2 text-[16px]" />
        ))}
      </details>
      <button onClick={() => go(`map/regions/${region.id}`)} className="mt-2 flex items-center gap-1 px-1 py-1.5 text-sm font-extrabold text-lv">
        在大地图上看七大地区 <ArrowRightIcon size={14} weight="bold" />
      </button>
    </div>
  )
}
