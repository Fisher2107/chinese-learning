import { useEffect, useRef } from 'react'
import { ArrowRightIcon, BookOpenTextIcon, CaretRightIcon, CheckCircleIcon, ScrollIcon, WarningIcon, XIcon } from '@phosphor-icons/react'
import { go } from '../lib/router.ts'
import { eraDone, type Era, type EraSummary, type HistoryIndex, type MapPin, type MapState } from '../lib/history.ts'
import type { WikiIndex, WikiSummary } from '../lib/types.ts'
import { plain } from '../lib/wiki.ts'
import { Photo, usePhoto } from './Photo.tsx'
import { Seal } from './Seal.tsx'
import { NoPhoto } from './WikiCards.tsx'
import { ZhText } from './ZhText.tsx'

const KIND_LABEL: Record<MapState['kind'], string> = { state: '', lost: '被割走的土地', leased: '被租借的地方', occupied: '被占领的地方', zone: '经济特区' }

/**
 * 历史 on the map: every era in the order of the 朝代歌, then 卷二. The chosen one fills with its
 * colour; eras whose 朝代印 is earned have a tick.
 */
export function EraStrip({ index, current, seals, onPick }: { index: HistoryIndex; current: string; seals: Map<string, number>; onPick: (id: string) => void }) {
  const row = useRef<HTMLDivElement>(null)
  const first = useRef(true)
  useEffect(() => {
    // straight there when the strip appears, gliding when you pick another era
    row.current?.querySelector(`[data-era="${current}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: first.current ? 'instant' : 'smooth' })
    first.current = false
  }, [current])
  return (
    <div ref={row} className="no-scrollbar pointer-events-auto mx-auto flex max-w-xl gap-1.5 overflow-x-auto rounded-2xl" role="tablist" aria-label="朝代">
      {index.eras.map((e, i) => {
        const on = e.id === current
        const book2 = e.book === 2 && index.eras[i - 1]?.book === 1
        return (
          <div key={e.id} className="flex shrink-0 items-center gap-1.5">
            {book2 && <span className="px-1 text-[12px] font-black whitespace-nowrap text-mute">近现代</span>}
            <button
              data-era={e.id}
              role="tab"
              aria-selected={on}
              onClick={() => onPick(e.id)}
              className="flex h-10 items-center gap-1 rounded-xl border-2 px-3 text-[16px] font-black whitespace-nowrap shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              style={on ? { background: e.color, borderColor: e.color, color: '#fff' } : { background: 'var(--surface)', borderColor: 'var(--line)' }}
            >
              {!on && <span className="size-2.5 rounded-full" style={{ background: e.color }} />}
              {e.name}
              {seals.has(e.id) && <CheckCircleIcon size={15} weight="fill" className={on ? 'text-white' : 'text-lv'} />}
            </button>
          </div>
        )
      })}
    </div>
  )
}

function Shell({ onClose, children }: { onClose?: () => void; children: React.ReactNode }) {
  return (
    <div className="tile relative max-h-[50dvh] overflow-y-auto p-4 shadow-[0_4px_18px_rgba(0,0,0,0.1)]">
      {onClose && (
        <button aria-label="关闭" onClick={onClose} className="absolute top-2 right-2 grid size-9 place-items-center rounded-full text-mute active:bg-sunken">
          <XIcon size={18} weight="bold" />
        </button>
      )}
      {children}
    </div>
  )
}

/** A story as a small card: photo, name, the line that makes you want to read it. */
function StoryThumb({ page, read }: { page: WikiSummary; read: boolean }) {
  const photo = usePhoto(`wiki/${page.id}`)
  return (
    <button onClick={() => go(`wiki/${page.id}`)} className="w-32 shrink-0 overflow-hidden rounded-xl border-2 border-line text-left">
      <div className="relative">
        {photo ? <Photo k={`wiki/${page.id}`} ratio="4 / 3" credit={false} /> : <NoPhoto name={page.name} ratio="4 / 3" />}
        {read && <CheckCircleIcon size={20} weight="fill" className="absolute top-1 right-1 rounded-full bg-white text-lv" />}
      </div>
      <div className="flex items-center gap-1 px-2 py-1.5">
        <span className="truncate text-[15px] font-black">{page.name}</span>
        {page.sensitive && <WarningIcon size={14} weight="fill" className="shrink-0 text-huang-dark" aria-label="敏感" />}
      </div>
    </button>
  )
}

/** The era's card under the map: what it was, how far you are, its stories. */
export function EraCard({ era, index, wiki, read, sealed }: { era: Era; index: HistoryIndex; wiki?: WikiIndex; read: Set<string>; sealed: boolean }) {
  const summary = index.eras.find((e) => e.id === era.id) as EraSummary
  const { done, total } = eraDone(summary, read)
  const pages = era.stories.map((s) => wiki?.pages.find((p) => p.id === s)).filter((p): p is WikiSummary => !!p)
  return (
    <Shell>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[26px] leading-tight font-black" style={{ color: era.color }}>
              {era.name}
            </span>
            <span className="text-sm font-extrabold text-mute">{era.dates}</span>
          </div>
          <ZhText ui id={`era-card-hook-${era.id}`} paras={[{ kind: 'p', sentences: era.hook }]} glossary={era.glossary} source={{ kind: 'place', route: `history/${era.id}`, title: era.name }} className="mt-0.5 text-[16px] font-bold" />
        </div>
        <Seal char={era.seal} earned={sealed} size={46} />
      </div>
      {pages.length > 0 && (
        <>
          <div className="mt-2 text-sm font-extrabold text-mute">
            故事 · 读完 {done}/{total}
          </div>
          <div className="no-scrollbar -mx-4 mt-1.5 flex gap-2 overflow-x-auto px-4">
            {pages.map((p) => (
              <StoryThumb key={p.id} page={p} read={read.has(p.id)} />
            ))}
          </div>
        </>
      )}
      <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
        <button onClick={() => go(`history/${era.id}`)} className="chunky flex h-12 items-center justify-center gap-2 rounded-2xl text-[16px] font-extrabold text-white" style={{ background: era.color, ['--edge' as string]: 'rgba(0,0,0,0.25)' }}>
          <BookOpenTextIcon size={20} weight="fill" /> 读{era.name}
        </button>
        <button onClick={() => go('history')} className="flex h-12 items-center gap-1.5 rounded-2xl bg-sunken px-4 text-[15px] font-extrabold">
          <ScrollIcon size={20} weight="fill" className="text-zhu-dark" /> 长卷
        </button>
      </div>
    </Shell>
  )
}

/** A state tapped on the map: where it is today, and the era's stories that happened there. */
export function StateCard({ era, state, wiki, onClose }: { era: Era; state: MapState; wiki?: WikiIndex; onClose: () => void }) {
  const cities = new Set(state.cities)
  const pages = era.stories.map((s) => wiki?.pages.find((p) => p.id === s)).filter((p): p is WikiSummary => !!p && p.cities.some((c) => cities.has(c)))
  const shown = state.today.slice(0, 8)
  return (
    <Shell onClose={onClose}>
      <div className="flex flex-wrap items-baseline gap-x-2 pr-8">
        <span className="text-[24px] leading-tight font-black" style={{ color: state.color }}>
          {state.name}
        </span>
        <span className="text-sm font-extrabold text-mute">{KIND_LABEL[state.kind] || `${era.name} · 大致范围`}</span>
      </div>
      {state.note && <p className="mt-1 text-[16px] font-bold">{state.note}</p>}
      {shown.length > 0 && (
        <p className="mt-1.5 text-[15px] font-bold text-mute">
          大约是今天的{shown.join('、')}
          {state.today.length > shown.length ? '等地' : ''}。
        </p>
      )}
      {pages.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {pages.map((p) => (
            <button key={p.id} onClick={() => go(`wiki/${p.id}`)} className="flex h-9 items-center gap-1 rounded-lg bg-sunken px-3 text-[15px] font-extrabold">
              {p.name} <CaretRightIcon size={12} weight="bold" className="text-mute" />
            </button>
          ))}
        </div>
      )}
    </Shell>
  )
}

/** A pin tapped: a story opens onto its page, an event onto the 大事年表, a capital says whose it was. */
export function PinCard({ era, pin, wiki, onClose }: { era: Era; pin: MapPin; wiki?: WikiIndex; onClose: () => void }) {
  const page = pin.route ? wiki?.pages.find((p) => `wiki/${p.id}` === pin.route) : undefined
  const event = pin.n ? era.timeline[pin.n - 1] : undefined
  const photo = usePhoto(page ? `wiki/${page.id}` : undefined)
  return (
    <Shell onClose={onClose}>
      {page ? (
        <button onClick={() => go(`wiki/${page.id}`)} className="flex w-full items-stretch gap-3 pr-8 text-left">
          {photo && <Photo k={`wiki/${page.id}`} ratio="1 / 1" credit={false} className="w-20 shrink-0 rounded-xl" />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[22px] leading-tight font-black">{page.name}</span>
              {page.sensitive && <span className="rounded-md bg-huang/25 px-1.5 text-xs leading-5 font-black text-huang-dark">敏感</span>}
            </div>
            <p className="mt-0.5 line-clamp-3 text-[15px] font-bold text-mute">{plain(page.lede)}</p>
            <span className="mt-1 flex items-center gap-1 text-[14px] font-black text-[var(--link)]">
              读这个故事 <ArrowRightIcon size={14} weight="bold" />
            </span>
          </div>
        </button>
      ) : event ? (
        <button onClick={() => go(`history/${era.id}/${pin.n}`)} className="w-full pr-8 text-left">
          <div className="text-sm font-extrabold text-mute">{event.date}</div>
          <div className="text-[22px] leading-tight font-black">{event.title}</div>
          {event.place && <p className="mt-0.5 text-[15px] font-bold text-mute">{event.place}</p>}
          <span className="mt-1 flex items-center gap-1 text-[14px] font-black text-[var(--link)]">
            在大事年表里看 <ArrowRightIcon size={14} weight="bold" />
          </span>
        </button>
      ) : (
        <div className="pr-8">
          <div className="text-sm font-extrabold text-mute">{pin.kind === 'capital' ? (pin.of ? `${pin.of}的都城` : `${era.name}的都城`) : era.name}</div>
          <div className="text-[22px] leading-tight font-black">{pin.name}</div>
          {pin.note && <p className="mt-1 text-[15px] font-bold">{pin.note}</p>}
        </div>
      )}
    </Shell>
  )
}
