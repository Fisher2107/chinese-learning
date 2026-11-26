import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BankIcon,
  BookOpenTextIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  InfoIcon,
  MapPinIcon,
  MapTrifoldIcon,
  MusicNotesIcon,
  PathIcon,
  PlayIcon,
  SealCheckIcon,
  SpeakerHighIcon,
  StampIcon,
  StarIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { loadEra, loadHistory, loadIndex, loadPlaces, loadWikiIndex, useLoad } from '../lib/content.ts'
import type { WordSource } from '../lib/db.ts'
import { mergeEggs } from '../lib/eggs.ts'
import { BOOK_TITLE, earnEraSeal, useHistoryProgress, visitEra, type Era, type EraLayer, type Relay, type EraSummary, type Figure, type HistoryIndex, type TimelineItem } from '../lib/history.ts'
import { back, go, usePageState } from '../lib/router.ts'
import { speak } from '../lib/speech.ts'
import type { WikiIndex, WikiSummary } from '../lib/types.ts'
import { plain } from '../lib/wiki.ts'
import { FeedbackBanner } from '../components/chrome.tsx'
import { EggList, placeLinks, useEggRows, type EggGroup, type PlaceLinks } from '../components/Eggs.tsx'
import { Fold, JumpBar, Sub, jumpTo } from '../components/Fold.tsx'
import { Photo, usePhoto } from '../components/Photo.tsx'
import { Seal } from '../components/Seal.tsx'
import { SourceList } from '../components/Sources.tsx'
import { StaticMap, type Pin } from '../components/StaticMap.tsx'
import { NoPhoto, SightCard } from '../components/WikiCards.tsx'
import { Button, Loading, PageHeader, ProgressBar, Section } from '../components/ui.tsx'
import { TapText, ZhText } from '../components/ZhText.tsx'
import { Blocks } from './WikiPage.tsx'

const BASE = import.meta.env.BASE_URL
type Box = [number, number, number, number]

/** 卷二's 聊天提示, in the order they're shown. */
const TIP_LABEL: Record<string, string> = { 骄傲: '骄傲', 经历过: '长辈经历过', 少提: '少提' }
const EGG_TABS = ['节日', '成语', '吃的', '还在说'] as const

/** White or dark ink, whichever reads better on an era's colour band (清's 明黄 needs dark). */
function inkOn(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#fff'
  const n = parseInt(m[1], 16)
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  // contrast with white vs with #2a2218
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.0688 ? '#fff' : '#2a2218'
}

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The content lists the right answer first: show the options in a new order each time. */
function mixed(q: { options: string[]; answer: number }) {
  const order = shuffle(q.options.map((_, i) => i))
  return { options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) }
}

/** Egg flashcards made, per era page (history/<era>). */
function useEraEggCards() {
  const rows = useEggRows()
  return useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) if (r.card && r.page.startsWith('history/')) m.set(r.page.slice(8), (m.get(r.page.slice(8)) ?? 0) + 1)
    return m
  }, [rows])
}

/** An era's ring: its stories marked 读完了, plus its eggs added to review. */
function eraProgress(era: EraSummary, read: Set<string>, eggCards = 0) {
  const done = era.stories.filter((s) => read.has(s)).length + Math.min(eggCards, era.eggCount)
  const total = era.stories.length + era.eggCount
  return { done, total, share: total ? done / total : 0 }
}

/* ---------------------------------------------------------------------------------------------- */
/* 历史长卷                                                                                          */
/* ---------------------------------------------------------------------------------------------- */

/** #/history: every era in the order of the 朝代歌, then 卷二. */
export function HistoryScroll() {
  const index = useLoad(loadHistory, 'history').data
  const { seals, read } = useHistoryProgress()
  const eggCards = useEraEggCards()
  if (!index) return <Loading />
  const stories = new Set(index.eras.flatMap((e) => e.stories))
  const readCount = [...stories].filter((s) => read.has(s)).length
  const book1 = index.eras.filter((e) => e.book === 1)
  const book2 = index.eras.filter((e) => e.book === 2)
  // 卷一 under its couplets; an era before the first couplet (传说) stands on its own
  const groups: { song: string; eras: EraSummary[] }[] = []
  for (const e of book1) {
    const last = groups.at(-1)
    if (last && last.song === e.song) last.eras.push(e)
    else groups.push({ song: e.song, eras: [e] })
  }
  const tile = (e: EraSummary) => <EraTile key={e.id} era={e} read={read} sealed={seals.has(e.id)} eggCards={eggCards.get(e.id)} />

  return (
    <div className="pb-12">
      <PageHeader
        title="历史长卷"
        fallback="map"
        below={
          <JumpBar
            items={[
              { id: 'scroll-picks', label: '先读这几个' },
              { id: 'scroll-song', label: '朝代歌' },
              { id: 'scroll-book1', label: '卷一 · 王朝', count: book1.length },
              { id: 'scroll-capitals', label: '都城' },
              { id: 'scroll-book2', label: '卷二 · 近现代', count: book2.length, hot: true },
            ]}
          />
        }
      />
      <div className="mx-auto max-w-xl px-4">
        <div className="tile overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            <div className="font-book text-[32px] leading-tight">历史长卷</div>
            <p className="mt-1 text-[15px] font-bold text-mute">从传说到今天，一共{index.eras.length}段。每段都是一串故事：读完了考一考，盖一个朝代印。</p>
          </div>
          <div className="grid grid-cols-2 divide-x-2 divide-line border-t-2 border-line">
            <div className="px-4 py-2.5">
              <div className="text-[22px] font-black">
                {readCount}
                <span className="text-[15px] text-mute">/{stories.size}</span>
              </div>
              <div className="text-[13px] font-extrabold text-mute">读完的故事</div>
            </div>
            <div className="px-4 py-2.5">
              <div className="text-[22px] font-black text-zhu">
                {seals.size}
                <span className="text-[15px] text-mute">/{index.eras.length}</span>
              </div>
              <div className="text-[13px] font-extrabold text-mute">朝代印</div>
            </div>
          </div>
          <button onClick={() => go('map/history')} className="flex w-full items-center gap-2 border-t-2 border-line px-4 py-3 text-left text-[15px] font-extrabold active:bg-sunken">
            <MapTrifoldIcon size={20} weight="fill" className="text-dai" /> 在地图上看每个朝代 <ArrowRightIcon size={16} weight="bold" className="ml-auto text-mute" />
          </button>
        </div>

        {index.picks.length > 0 && (
          <Fold id="scroll-picks" title="先读这几个" icon={<StarIcon size={20} weight="fill" className="shrink-0 text-huang-dark" />}>
            <p className="-mt-1 mb-3 px-1 text-sm font-bold text-mute">聊天时最常聊到的事，从这里开始。</p>
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
              {index.picks.map((p) => {
                const era = index.eras.find((e) => e.id === p.era)
                return era ? <PickCard key={`${p.era}-${p.n}`} pick={p} era={era} /> : null
              })}
            </div>
          </Fold>
        )}

        <Fold id="scroll-song" title="朝代歌" icon={<MusicNotesIcon size={20} weight="fill" className="shrink-0 text-zhu" />}>
          <SongGame />
        </Fold>

        <Fold id="scroll-book1" title={BOOK_TITLE[1]} count={book1.length}>
          <div className="space-y-5">
            {groups.map((g) => (
              <div key={g.eras[0].id}>
                {g.song && (
                  <div className="mb-2 flex items-center gap-1 px-1">
                    <span className="font-book text-[20px]">{g.song}</span>
                    <button aria-label="朗读" onClick={() => speak(g.song, 0.8)} className="grid size-9 place-items-center rounded-full text-dai active:bg-sunken">
                      <SpeakerHighIcon size={18} weight="fill" />
                    </button>
                  </div>
                )}
                <div className="space-y-2">{g.eras.map(tile)}</div>
              </div>
            ))}
          </div>
        </Fold>

        <Fold id="scroll-capitals" title="都城在哪儿">
          <CapitalsMap index={index} />
        </Fold>

        <Fold id="scroll-book2" title={BOOK_TITLE[2]} count={book2.length}>
          <div className="mb-3 rounded-2xl bg-paper px-4 py-3 text-center font-book text-[19px] text-paper-text">王朝至此完 · 1840年—今天</div>
          <div className="space-y-2">{book2.map(tile)}</div>
        </Fold>
      </div>
    </div>
  )
}

/** A 聊天推荐 pick: the event to read first, with the question that pulls you in. */
function PickCard({ pick, era }: { pick: HistoryIndex['picks'][number]; era: EraSummary }) {
  const photo = usePhoto(`history/${era.id}`)
  return (
    <button onClick={() => go(`history/${era.id}/${pick.n}`)} className="tile w-56 shrink-0 snap-start overflow-hidden text-left">
      {photo ? <Photo k={`history/${era.id}`} ratio="16 / 10" credit={false} /> : <NoPhoto name={pick.title} ratio="16 / 10" />}
      <div className="p-3">
        <div className="flex items-center gap-1.5 text-[12px] font-black" style={{ color: era.color }}>
          <span className="size-2 rounded-full" style={{ background: era.color }} />
          {era.name}
        </div>
        <div className="mt-0.5 text-[17px] leading-snug font-black">{pick.title}</div>
        <p className="mt-1 line-clamp-3 text-[13px] leading-snug font-bold text-mute">{pick.hook}</p>
      </div>
    </button>
  )
}

/** Progress round the seal: stories read and eggs added. */
function Ring({ share, color, children }: { share: number; color: string; children: ReactNode }) {
  const r = 21
  const c = 2 * Math.PI * r
  return (
    <div className="relative grid size-12 place-items-center">
      <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={24} cy={24} r={r} fill="none" stroke="var(--line)" strokeWidth={3.5} />
        {share > 0 && <circle cx={24} cy={24} r={r} fill="none" stroke={color} strokeWidth={3.5} strokeLinecap="round" strokeDasharray={`${c * share} ${c}`} />}
      </svg>
      {children}
    </div>
  )
}

/** One era on the 长卷: its colour, picture, name, dates, hook, ring and seal. Started eras take on colour. */
function EraTile({ era, read, sealed, eggCards, label }: { era: EraSummary; read: Set<string>; sealed: boolean; eggCards?: number; label?: ReactNode }) {
  const { done, total, share } = eraProgress(era, read, eggCards)
  const started = sealed || done > 0
  const photo = usePhoto(`history/${era.id}`)
  return (
    <button
      onClick={() => go(`history/${era.id}`)}
      className="tile flex w-full items-stretch overflow-hidden text-left"
      style={started ? { background: `color-mix(in oklab, ${era.color} 10%, var(--surface))` } : undefined}
    >
      <div className="w-2 shrink-0" style={{ background: era.color, opacity: started ? 1 : 0.5 }} />
      {photo ? (
        <Photo k={`history/${era.id}`} ratio="1 / 1" credit={false} className="w-[72px] shrink-0" />
      ) : (
        <div className="grid w-[72px] shrink-0 place-items-center bg-paper font-book text-[30px]" style={{ color: era.color }}>
          {era.name[0]}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5">
        {label && <div className="text-[12px] font-black text-mute">{label}</div>}
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 text-[20px] leading-tight font-black whitespace-nowrap">{era.name}</span>
          <span className="min-w-0 truncate text-[13px] font-extrabold text-mute">{era.dates}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug font-bold text-mute">{plain(era.hook)}</p>
      </div>
      <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 pr-2.5">
        <Ring share={share} color={era.color}>
          <Seal char={era.seal} earned={sealed} size={30} tilt={0} />
        </Ring>
        {total > 0 && (
          <span className="text-[11px] font-black text-mute">
            {done}/{total}
          </span>
        )}
      </div>
    </button>
  )
}

/** 朝代歌, with the names a round can blank out. */
const SONG = [
  { line: '夏商与西周，东周分两段。', blanks: ['夏', '商', '西周', '东周'] },
  { line: '春秋和战国，一统秦两汉。', blanks: ['春秋', '战国', '秦', '两汉'] },
  { line: '三分魏蜀吴，二晋前后延。', blanks: ['魏', '蜀', '吴', '二晋'] },
  { line: '南北朝并立，隋唐五代传。', blanks: ['隋', '唐', '五代'] },
  { line: '宋元明清后，王朝至此完。', blanks: ['宋', '元', '明', '清'] },
]
const SONG_NAMES = SONG.flatMap((s) => s.blanks)

/** 朝代歌 fill-in: five lines, one blank each. Half a minute, and the order of the dynasties sticks. */
function SongGame() {
  const [round, setRound] = useState<{ i: number; blank: string; options: string[]; wrong: string[]; right?: boolean }>()
  const [done, setDone] = useState(false)
  function start(i: number) {
    const s = SONG[i]
    const blank = s.blanks[Math.floor(Math.random() * s.blanks.length)]
    const others = shuffle(SONG_NAMES.filter((n) => n.length === blank.length && !s.line.includes(n))).slice(0, 2)
    setRound({ i, blank, options: shuffle([blank, ...others]), wrong: [] })
  }
  function answer(o: string) {
    if (!round || round.right) return
    if (o !== round.blank) return setRound({ ...round, wrong: [...round.wrong, o] })
    setRound({ ...round, right: true })
    window.setTimeout(() => {
      if (round.i === SONG.length - 1) {
        setRound(undefined)
        setDone(true)
      } else start(round.i + 1)
    }, 650)
  }

  if (!round)
    return (
      <div className="tile p-4">
        {done ? (
          <>
            <div className="flex items-center gap-2 text-[17px] font-black text-lv">
              <CheckCircleIcon size={22} weight="fill" /> 背会了！
            </div>
            <div className="mt-2 space-y-1 font-book text-[20px]">
              {SONG.map((s) => (
                <div key={s.line}>{s.line}</div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Button tone="plain" size="md" className="flex-1" onClick={() => speak(SONG.map((s) => s.line).join(''), 0.8)}>
                <SpeakerHighIcon size={18} weight="fill" /> 听一遍
              </Button>
              <Button tone="zhu" size="md" className="flex-1" onClick={() => start(0)}>
                <ArrowCounterClockwiseIcon size={18} weight="bold" /> 再来一次
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-[15px] font-bold text-mute">中国小孩用五句顺口溜记住所有朝代的顺序。填五个空，半分钟就会。</p>
            <Button tone="zhu" className="mt-3 w-full" onClick={() => start(0)}>
              <PlayIcon size={20} weight="fill" /> 开始填空
            </Button>
          </>
        )}
      </div>
    )

  const s = SONG[round.i]
  const at = s.line.indexOf(round.blank)
  return (
    <div className="tile p-4">
      <ProgressBar value={round.i / SONG.length} color="var(--color-zhu)" className="h-3" />
      <div className="mt-3 space-y-1 font-book text-[21px]">
        {SONG.slice(0, round.i).map((x) => (
          <div key={x.line} className="text-mute">
            {x.line}
          </div>
        ))}
        <div>
          {s.line.slice(0, at)}
          <span className={`mx-0.5 inline-block min-w-[1.6em] rounded-md border-b-4 px-1 text-center ${round.right ? 'border-lv bg-lv-soft text-lv-ink' : 'border-zhu bg-sunken'}`}>
            {round.right ? round.blank : '？'.repeat(round.blank.length)}
          </span>
          {s.line.slice(at + round.blank.length)}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {round.options.map((o) => {
          const wrong = round.wrong.includes(o)
          return (
            <motion.button
              key={`${round.i}-${o}`}
              animate={wrong ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
              transition={{ duration: 0.3 }}
              disabled={wrong}
              onClick={() => answer(o)}
              className={`h-14 rounded-2xl border-2 font-book text-[24px] ${wrong ? 'border-zhu bg-zhu-soft text-zhu-ink opacity-60' : round.right && o === round.blank ? 'border-lv bg-lv-soft' : 'border-line bg-surface'}`}
            >
              {o}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/** The capitals the eras moved through, and the route the 长卷 is known for. */
const TRACE = ['西安', '洛阳', '开封', '杭州', '南京', '北京']

/** 都城在哪儿: every era's capital on one small map. Tap a 都 to see who built there, and what they called it. */
function CapitalsMap({ index }: { index: HistoryIndex }) {
  const [sel, setSel] = useState('西安')
  const caps = index.capitals
  const box = useMemo<Box>(() => {
    const xs = caps.map((c) => c.x)
    const ys = caps.map((c) => c.y)
    return [Math.min(...xs) - 60, Math.min(...ys) - 50, Math.max(...xs) + 60, Math.max(...ys) + 50]
  }, [caps])
  const layer = useMemo<EraLayer>(() => {
    const trace = TRACE.map((n) => caps.find((c) => c.name === n)).filter((c) => !!c)
    const route =
      trace.length > 1
        ? [{ name: '都城', d: `M${trace.map((c) => `${c.x},${c.y}`).join('L')}`, x: trace[0].x, y: trace[0].y, start: [trace[0].x, trace[0].y] as [number, number], end: [trace.at(-1)!.x, trace.at(-1)!.y] as [number, number] }]
        : []
    return { box, states: [], routes: route, pins: [] }
  }, [caps, box])
  if (!caps.length) return null
  const cap = caps.find((c) => c.name === sel)
  const pins: Pin[] = caps.map((c) => ({ id: c.name, x: c.x, y: c.y, label: c.name, kind: 'capital', main: c.name === sel }))
  return (
    <div className="tile overflow-hidden">
      <StaticMap box={box} layer={layer} pins={pins} onPin={setSel} />
      <div className="border-t-2 border-line p-3.5">
        <p className="text-[14px] font-bold text-mute">两千多年里，都城大致这样搬：{TRACE.join(' → ')}。点地图上的“都”，看看哪些朝代在那里建都。</p>
        {cap && (
          <div className="mt-3">
            <div className="text-[20px] font-black">{cap.name}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {cap.eras.map((x) => {
                const e = index.eras.find((y) => y.id === x.era)
                if (!e) return null
                return (
                  <button key={x.era} onClick={() => go(`history/${x.era}`)} className="flex h-9 items-center gap-1.5 rounded-lg bg-sunken px-2.5 text-[14px] font-extrabold">
                    <span className="size-2.5 rounded-full" style={{ background: e.color }} />
                    {e.name}
                    {x.as !== cap.name && <span className="font-bold text-mute">· {x.as}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------------------------- */
/* An era                                                                                         */
/* ---------------------------------------------------------------------------------------------- */

/** #/history/<era>[/<n>]: the era's page; with n, that 大事年表 entry opens. */
export function EraPage({ id, n }: { id: string; n?: number }) {
  const { data: era, error } = useLoad(() => loadEra(id), `era/${id}`)
  const index = useLoad(loadHistory, 'history').data
  const wiki = useLoad(loadWikiIndex, 'wiki-index').data
  const content = useLoad(loadIndex, 'index').data
  const places = useLoad(loadPlaces, 'places').data
  const { seals, read, seen } = useHistoryProgress()
  const eggCards = useEraEggCards()
  const [open, setOpen] = useState<number | undefined>(n)
  useEffect(() => {
    visitEra(id)
  }, [id])
  // arriving at an entry: open the 年表 and scroll to it
  useEffect(() => {
    if (!era || !n) return
    setOpen(n)
    jumpTo('era-timeline')
    const t = window.setTimeout(() => {
      const el = document.getElementById(`era-item-${n}`)
      if (!el) return
      const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - 8, behavior: 'smooth' })
    }, 350)
    return () => window.clearTimeout(t)
  }, [era, n])
  const links = useMemo(() => (places ? placeLinks(places.places) : undefined), [places])

  if (error) return <PageHeader title="找不到这个朝代" fallback="history" />
  if (!era) return <Loading />

  const source: WordSource = { kind: 'history', route: `history/${id}`, title: `${era.name} · 历史` }
  const sealed = seals.get(id)
  const pages = era.stories.map((s) => wiki?.pages.find((p) => p.id === s)).filter((p): p is WikiSummary => !!p)
  const series = (content?.series ?? []).filter((s) => era.series.includes(s.id))
  const people = pages.filter((p) => p.kind === '人物')
  const figures = [...new Map(era.timeline.flatMap((t) => t.figures).map((f) => [f.id, f])).values()].filter((f) => !people.some((p) => p.name === f.name))
  const quizCount = quizSize(era, wiki)
  const at = index?.eras.findIndex((e) => e.id === id) ?? -1
  const prev = at > 0 ? index!.eras[at - 1] : undefined
  const next = at >= 0 ? index!.eras[at + 1] : undefined
  const ink = inkOn(era.color)
  const eggCount = era.eggs.length

  return (
    <div className="pb-12">
      <PageHeader
        title={era.name}
        fallback="history"
        right={
          <button aria-label="历史长卷" onClick={() => go('history')} className="grid size-11 place-items-center text-mute">
            <BookOpenTextIcon size={22} weight="bold" />
          </button>
        }
        below={
          <JumpBar
            items={[
              ...(era.relay ? [{ id: 'era-relay', label: '接力' }] : []),
              ...(era.system ? [{ id: 'era-system', label: '怎么运作' }] : []),
              ...(pages.length || series.length ? [{ id: 'era-stories', label: '故事', count: pages.length }] : []),
              { id: 'era-eggs', label: '彩蛋', count: eggCount, hot: true },
              { id: 'era-map', label: '地图' },
              ...(era.timeline.length ? [{ id: 'era-timeline', label: '年表', count: era.timeline.length }] : []),
              ...(people.length || figures.length ? [{ id: 'era-people', label: '人物' }] : []),
              ...(quizCount ? [{ id: 'era-quiz', label: '考一考' }] : []),
            ]}
          />
        }
      />
      <div className="mx-auto max-w-xl px-4">
        <div className="tile overflow-hidden">
          <div className="px-4 py-3" style={{ background: era.color, color: ink }}>
            <div className="text-[13px] font-extrabold opacity-85">{BOOK_TITLE[era.book]}</div>
            <div className="flex flex-wrap items-baseline gap-x-2.5">
              <span className="text-[36px] leading-tight font-black">{era.name}</span>
              <span className="text-[15px] font-extrabold opacity-90">{era.dates}</span>
            </div>
          </div>
          <Photo k={`history/${id}`} />
          <div className="px-4 pt-3">
            {era.song && <div className="font-book text-[17px] text-mute">{era.song}</div>}
            <ZhText ui id={`era-hook-${id}`} paras={[{ kind: 'p', sentences: era.hook }]} glossary={era.glossary} source={source} className="mt-0.5 text-[18px] font-bold" />
          </div>
          <div className="mt-2 flex items-center gap-3 border-t-2 border-line px-3 py-2.5">
            <Seal char={era.seal} earned={!!sealed} size={42} />
            {sealed ? (
              <div className="flex-1 text-sm font-bold text-mute">
                <span className="mr-2 inline-flex items-center gap-1 font-black text-zhu">
                  <SealCheckIcon size={18} weight="fill" /> 朝代印
                </span>
                {new Date(sealed).toLocaleDateString('zh-CN')}
              </div>
            ) : quizCount ? (
              <Button tone="zhu" size="md" className="flex-1" onClick={() => go(`history/${id}/seal`)}>
                <StampIcon size={18} weight="fill" /> 考一考，盖朝代印
              </Button>
            ) : (
              <div className="flex-1 text-sm font-bold text-mute">这一段的题目还在写。</div>
            )}
          </div>
        </div>

        <Fold id="era-intro" title="一分钟读懂">
          <div className="rounded-2xl bg-paper p-4 text-[19px] text-paper-text">
            <Blocks blocks={era.intro} id={`era-${id}-intro`} glossary={era.glossary} source={source} />
          </div>
          {era.more.length > 0 && (
            <div className="mt-3">
              <Sub title="再多读一点">
                <div className="rounded-2xl bg-paper p-4 text-[19px] text-paper-text">
                  <Blocks blocks={era.more} id={`era-${id}-more`} glossary={era.glossary} source={source} />
                </div>
              </Sub>
            </div>
          )}
          {era.tips.length > 0 && (
            <div className="mt-3 rounded-2xl border-2 border-dashed border-line p-3.5">
              <div className="flex items-center gap-1.5 text-sm font-black text-dai">
                <InfoIcon size={18} weight="fill" /> 聊天提示
              </div>
              <div className="mt-1.5 space-y-2.5">
                {era.tips.map((t) => (
                  <div key={t.k} className="flex gap-2.5">
                    <span className={`mt-1 h-6 shrink-0 rounded-md px-1.5 text-[12px] leading-6 font-black ${t.k === '少提' ? 'bg-huang/30 text-huang-dark' : 'bg-sunken text-mute'}`}>{TIP_LABEL[t.k] ?? t.k}</span>
                    <ZhText ui id={`era-tip-${id}-${t.k}`} paras={[{ kind: 'p', sentences: t.v }]} glossary={era.glossary} source={source} className="min-w-0 flex-1 text-[16px]" />
                  </div>
                ))}
              </div>
              {era.tips.some((t) => t.k === '少提') && wiki?.pages.some((p) => p.id === 'mingan-huati') && (
                <button onClick={() => go('wiki/mingan-huati')} className="mt-3 flex w-full items-center gap-2 rounded-xl bg-huang/20 px-3 py-2.5 text-left text-[15px] font-black text-huang-dark">
                  <InfoIcon size={18} weight="fill" className="shrink-0" /> 敏感话题一览：哪些话题敏感，为什么
                  <ArrowRightIcon size={16} weight="bold" className="ml-auto shrink-0" />
                </button>
              )}
            </div>
          )}
        </Fold>

        {era.relay && (
          <Fold id="era-relay" title="权力接力" icon={<UsersThreeIcon size={22} weight="fill" className="shrink-0" style={{ color: era.color }} />}>
            <PowerRelay era={era} source={source} />
          </Fold>
        )}

        {era.system && (
          <Fold id="era-system" title="今天的中国怎么运作" icon={<BankIcon size={22} weight="fill" className="shrink-0" style={{ color: era.color }} />}>
            <HowChinaWorks era={era} source={source} />
          </Fold>
        )}

        {(pages.length > 0 || series.length > 0) && (
          <Fold id="era-stories" title={`${era.name}的故事`} count={pages.length} icon={<BookOpenTextIcon size={21} weight="fill" className="shrink-0" style={{ color: era.color }} />}>
            {series.map((s) => (
              <button key={s.id} onClick={() => go(`series/${s.id}`)} className="tile mb-3 flex w-full overflow-hidden text-left">
                <div className="w-2 shrink-0" style={{ background: s.color }} />
                <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3">
                  <PlayIcon size={22} weight="fill" style={{ color: s.color }} className="shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-black text-mute">追剧 · {s.episodes.length}集</div>
                    <div className="truncate text-[17px] font-black">{s.title}</div>
                    <div className="truncate text-sm font-bold text-mute">{s.subtitle}</div>
                  </div>
                  <ArrowRightIcon size={18} weight="bold" className="ml-auto shrink-0 text-mute" />
                </div>
              </button>
            ))}
            <div className="grid grid-cols-2 gap-3">
              {pages.map((p) => (
                <SightCard key={p.id} page={p} seen={read.has(p.id) || seen.has(p.id)} wide />
              ))}
            </div>
          </Fold>
        )}

        <Fold id="era-eggs" title="聊天彩蛋 · 今天还在" count={eggCount} icon={<ChatCircleDotsIcon size={22} weight="fill" className="shrink-0 text-lv" />}>
          <EraEggs era={era} links={links} />
        </Fold>

        <Fold id="era-map" title="地图">
          <EraMap era={era} open={open} />
        </Fold>

        {era.timeline.length > 0 && (
          <Fold id="era-timeline" title="大事年表" count={era.timeline.length}>
            <ol className="relative ml-1.5 border-l-2 border-line pl-4">
              {era.timeline.map((t, i) => (
                <li key={i} id={`era-item-${i + 1}`} className="relative mb-3 last:mb-0">
                  <span
                    className="absolute top-4 -left-[23px] size-3.5 rounded-full border-[3px]"
                    style={{ borderColor: era.color, background: open === i + 1 ? era.color : 'var(--bg)' }}
                  />
                  <button onClick={() => setOpen(open === i + 1 ? undefined : i + 1)} aria-expanded={open === i + 1} className="tile w-full px-3.5 py-2.5 text-left">
                    <div className="text-[13px] font-extrabold text-mute">{t.date}</div>
                    <div className="text-[18px] leading-snug font-black">{t.title}</div>
                    {t.hook && open !== i + 1 && <p className="mt-0.5 text-[14px] font-bold text-mute">{plain(t.hook)}</p>}
                  </button>
                  {open === i + 1 && <TimelineBody t={t} era={era} n={i + 1} source={source} />}
                </li>
              ))}
            </ol>
          </Fold>
        )}

        {(people.length > 0 || figures.length > 0) && (
          <Fold id="era-people" title="人物" count={people.length + figures.length} icon={<UsersThreeIcon size={21} weight="fill" className="shrink-0 text-dai" />}>
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
              {people.map((p) => (
                <PersonCard key={p.id} page={p} read={read.has(p.id)} />
              ))}
              {figures.map((f) => (
                <FigureCard key={f.id} f={f} />
              ))}
            </div>
          </Fold>
        )}

        {quizCount > 0 && (
          <Fold id="era-quiz" title="考一考">
            <div className="tile flex items-center gap-4 p-4">
              <Seal char={era.seal} earned={!!sealed} size={64} />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-mute">{sealed ? `${era.name}的朝代印已经盖上了。想再考一次也行。` : `${quizCount}道题，全答对就盖上${era.name}的朝代印。答错的题会再来一次。`}</p>
                <Button tone={sealed ? 'plain' : 'zhu'} size="md" className="mt-2 w-full" onClick={() => go(`history/${id}/seal`)}>
                  <StampIcon size={18} weight="fill" /> {sealed ? '再考一次' : '开始'}
                </Button>
              </div>
            </div>
          </Fold>
        )}

        {(prev || next) && index && (
          <Section
            title={
              <span className="flex items-center gap-2">
                <PathIcon size={24} weight="fill" className="text-zhu" /> 下一站
              </span>
            }
          >
            <div className="space-y-2">
              {next && <EraTile era={next} read={read} sealed={seals.has(next.id)} eggCards={eggCards.get(next.id)} label={<span className="flex items-center gap-1">后来 <ArrowRightIcon size={12} weight="bold" /></span>} />}
              {prev && <EraTile era={prev} read={read} sealed={seals.has(prev.id)} eggCards={eggCards.get(prev.id)} label={<span className="flex items-center gap-1"><ArrowLeftIcon size={12} weight="bold" /> 之前</span>} />}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

/** 聊天彩蛋 in tabs: 节日, 成语, 吃的, 还在说, and the ones you wrote. */
function EraEggs({ era, links }: { era: Era; links?: PlaceLinks }) {
  const rows = useEggRows()
  const page = `history/${era.id}`
  const views = useMemo(() => mergeEggs(page, era.name, era.eggs, rows), [page, era, rows])
  const tagOf = useMemo(() => new Map(era.eggs.map((e) => [e.id, e.tag])), [era.eggs])
  const tabs: string[] = EGG_TABS.filter((t) => views.some((v) => tagOf.get(v.key) === t))
  if (views.some((v) => !tagOf.has(v.key))) tabs.push('我写的')
  const [tab, setTab] = useState<string>()
  const cur = tab && tabs.includes(tab) ? tab : tabs[0]
  const shown = cur ? views.filter((v) => (cur === '我写的' ? !tagOf.has(v.key) : tagOf.get(v.key) === cur)) : views
  const group: EggGroup = { page, title: era.name, eggs: era.eggs, glossary: era.glossary }
  return (
    <div>
      <p className="mb-3 px-1 text-[13px] leading-snug font-bold text-mute">这个朝代留到今天的东西：节日、成语、吃的、还挂在嘴边的话。聊天时说出一个，对方会觉得你懂行。每个都有一个问题，可以加入复习。</p>
      {tabs.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex h-9 shrink-0 items-center gap-1 rounded-xl border-2 px-3 text-sm font-extrabold ${t === cur ? 'border-text bg-text text-bg' : 'border-line bg-surface'}`}
            >
              {t}
              <span className="font-bold opacity-60">{views.filter((v) => (t === '我写的' ? !tagOf.has(v.key) : tagOf.get(v.key) === t)).length}</span>
            </button>
          ))}
        </div>
      )}
      <EggList key={cur ?? 'all'} group={group} eggs={shown} links={links} here={page} />
    </div>
  )
}

/** The era on the app's own map: states, capitals, marches, its stories and events. Tap to explore it. */
function EraMap({ era, open }: { era: Era; open?: number }) {
  const pins: Pin[] = era.layer.pins
    .filter((p) => p.kind === 'story' || p.kind === 'event' || p.kind === 'place')
    .map((p) => ({ id: p.id, x: p.x, y: p.y, label: p.name, kind: p.kind, main: p.kind === 'event' && p.n === open }))
  const states = era.layer.states
  return (
    <div className="tile overflow-hidden">
      <button onClick={() => go(`map/history/${era.id}`)} aria-label="在大地图上看" className="block w-full">
        <StaticMap box={era.layer.box} layer={era.layer} pins={pins} />
      </button>
      {states.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t-2 border-line px-4 py-2.5">
          {states.map((st, i) => (
            <span key={i} className="flex items-center gap-1.5 text-[13px] font-extrabold">
              <span className="size-3 rounded-[4px] border-2" style={{ borderColor: st.color, background: `color-mix(in oklab, ${st.color} 34%, transparent)`, borderStyle: st.kind === 'state' ? 'solid' : 'dashed' }} />
              {st.name}
            </span>
          ))}
        </div>
      )}
      <button onClick={() => go(`map/history/${era.id}`)} className="flex w-full items-center gap-2 border-t-2 border-line px-4 py-2.5 text-[14px] font-extrabold text-mute">
        <MapTrifoldIcon size={18} weight="fill" style={{ color: era.color }} /> 在大地图上看 <ArrowRightIcon size={14} weight="bold" className="ml-auto" />
      </button>
    </div>
  )
}

/** A 大事年表 entry, opened: where, who (portraits), what happened, and the sources. */
function TimelineBody({ t, era, n, source }: { t: TimelineItem; era: Era; n: number; source: WordSource }) {
  const credits = t.figures.filter((f) => f.credit)
  return (
    <div className="mt-2 rounded-2xl bg-paper p-4 text-paper-text">
      {t.place && (
        <div className="mb-2 flex items-center gap-1.5 font-ui text-[14px] font-extrabold opacity-75">
          <MapPinIcon size={16} weight="fill" /> {t.place}
        </div>
      )}
      {t.figures.length > 0 && (
        <div className="no-scrollbar -mx-1 mb-3 flex gap-3 overflow-x-auto px-1 font-ui">
          {t.figures.map((f) => (
            <FigureCard key={f.id} f={f} small />
          ))}
        </div>
      )}
      <div className="text-[18px]">
        <Blocks blocks={t.story} id={`era-${era.id}-${n}`} glossary={era.glossary} source={{ ...source, route: `history/${era.id}/${n}`, title: t.title }} />
      </div>
      {(t.sources.length > 0 || credits.length > 0) && (
        <details className="group mt-3 font-ui">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-extrabold opacity-70">
            <ArrowRightIcon size={13} weight="bold" className="transition-transform group-open:rotate-90" /> 来源和图片
          </summary>
          <SourceList sources={t.sources} className="mt-2" />
          {credits.length > 0 && (
            <ul className="mt-2 space-y-1 text-[12px] font-bold opacity-70">
              {credits.map((f) => (
                <li key={f.id}>
                  {f.name}像：
                  {f.page ? (
                    <a href={f.page} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                      {f.credit}
                    </a>
                  ) : (
                    f.credit
                  )}
                </li>
              ))}
            </ul>
          )}
        </details>
      )}
    </div>
  )
}

/** A portrait from the 大事年表: the whole picture, never cropped, with the name and what they did. */
/** 权力接力: 毛泽东 to 习近平, one runner after another, this chapter's runners marked. */
function PowerRelay({ era, source }: { era: Era; source: WordSource }) {
  const relay = era.relay!
  return (
    <div>
      <ol className="relative">
        {relay.runners.map((r, i) => (
          <RelayRow key={r.page} r={r} n={i} era={era} source={source} last={i === relay.runners.length - 1} />
        ))}
      </ol>
      <div className="mt-2">
        <Sub title="接班的规矩">
          <div className="rounded-2xl bg-paper p-4 text-[18px] text-paper-text">
            <Blocks blocks={relay.arc} id={`era-${era.id}-relay`} glossary={era.glossary} source={source} />
          </div>
        </Sub>
      </div>
    </div>
  )
}

function RelayRow({ r, n, era, source, last }: { r: Relay; n: number; era: Era; source: WordSource; last: boolean }) {
  const photo = usePhoto(`wiki/${r.page}`)
  const here = r.era === era.id
  return (
    <li className={`relative flex gap-3 pb-3 ${r.side ? 'ml-8' : ''}`}>
      {!last && <span className={`absolute top-2 bottom-0 w-[3px] rounded-full bg-line ${r.side ? '-left-5' : 'left-[30px]'}`} />}
      {r.side && <span className="absolute top-8 -left-5 h-[3px] w-4 rounded-full bg-line" />}
      <button onClick={() => go(`wiki/${r.page}`)} aria-label={r.name} className="relative z-[1] w-[63px] shrink-0">
        <div className="overflow-hidden rounded-xl border-[3px] bg-bg" style={{ borderColor: here ? era.color : 'var(--line)' }}>
          {photo ? <Photo k={`wiki/${r.page}`} ratio="3 / 4" credit={false} /> : <NoPhoto name={r.name} ratio="3 / 4" />}
        </div>
      </button>
      <div className={`tile min-w-0 flex-1 px-3 py-2 ${here ? '' : 'opacity-80'}`} style={here ? { boxShadow: `inset 4px 0 0 ${era.color}` } : undefined}>
        <button onClick={() => go(`wiki/${r.page}`)} className="flex w-full flex-wrap items-baseline gap-x-2 text-left">
          <span className="text-[18px] font-black text-[var(--link)]">{r.name}</span>
          <span className="text-[13px] font-extrabold text-mute">{r.years}</span>
          {here && n >= 0 && <span className="rounded-md px-1.5 text-[11px] leading-5 font-black" style={{ background: era.color, color: inkOn(era.color) }}>本章</span>}
        </button>
        <ZhText ui id={`relay-${era.id}-${r.page}-how`} paras={[{ kind: 'p', sentences: r.how }]} glossary={era.glossary} source={source} className="mt-0.5 text-[15px]" />
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="shrink-0 text-[12px] font-black text-mute">一句话</span>
          <ZhText ui inline id={`relay-${era.id}-${r.page}-phrase`} paras={[{ kind: 'p', sentences: r.phrase }]} glossary={era.glossary} source={source} className="rounded-md bg-sunken px-2 text-[15px] font-bold" />
        </div>
      </div>
    </li>
  )
}

/** 今天的中国怎么运作: the party as a pyramid, the state beside it, and the year's political calendar. */
function HowChinaWorks({ era, source }: { era: Era; source: WordSource }) {
  const sys = era.system!
  const top = [...sys.party].reverse()
  const z = (key: string, sentences: Era['hook'], className: string, inline = false) => (
    <ZhText ui inline={inline} id={`system-${key}`} paras={[{ kind: 'p', sentences }]} glossary={era.glossary} source={source} className={className} />
  )
  return (
    <div>
      <div className="mb-2 text-[15px] font-black text-mute">党：从一亿党员到一个总书记</div>
      <div>
        <div className="flex flex-col items-center gap-1.5">
          {top.map((x, i) => {
            const w = 38 + (62 * i) / Math.max(1, top.length - 1)
            return (
              <div key={i} className="flex w-full flex-col items-center">
                <div className="rounded-xl px-2 py-1.5 text-center" style={{ width: `${w}%`, background: era.color, color: inkOn(era.color), opacity: 0.55 + (0.45 * (top.length - i)) / top.length }}>
                  {z(`party-${i}-name`, x.name, 'text-center text-[17px] font-black')}
                  {z(`party-${i}-count`, x.count, 'text-center text-[13px] font-extrabold opacity-90')}
                </div>
                {z(`party-${i}-note`, x.note, 'mt-0.5 mb-1 px-2 text-center text-[14px] text-mute')}
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-3">
        <Sub title="国家：人大、政府、主席、军委">
          <div className="grid grid-cols-2 gap-2">
            {sys.state.map((x, i) => (
              <div key={i} className="tile px-3 py-2">
                {z(`state-${i}-name`, x.name, 'text-[16px] font-black')}
                {z(`state-${i}-note`, x.note, 'mt-0.5 text-[14px]')}
              </div>
            ))}
          </div>
        </Sub>
      </div>
      <div className="mt-3">
        <Sub title="一个人，三个职务">
          <div className="rounded-2xl bg-paper p-4 text-[18px] text-paper-text">
            <Blocks blocks={sys.posts} id={`era-${era.id}-posts`} glossary={era.glossary} source={source} />
          </div>
        </Sub>
      </div>
      <div className="mt-3">
        <Sub title="政治的一年">
          <div className="space-y-2">
            {sys.calendar.map((x, i) => (
              <div key={i} className="flex gap-2.5">
                {z(`cal-${i}-when`, x.when, 'mt-0.5 h-fit w-[5.5em] shrink-0 rounded-md bg-sunken px-1.5 text-center text-[13px] font-black')}
                {z(`cal-${i}-what`, x.what, 'min-w-0 flex-1 text-[15px]')}
              </div>
            ))}
          </div>
        </Sub>
      </div>
      {sys.checked && <p className="mt-3 text-[12px] font-bold text-mute">人名和数字核对于{sys.checked.replace(/^(\d{4})-0?(\d+)$/, '$1年$2月')}，会随着换届变化。</p>}
    </div>
  )
}

function FigureCard({ f, small }: { f: Figure; small?: boolean }) {
  return (
    <div className={`${small ? 'w-24' : 'w-28'} shrink-0 snap-start`}>
      {f.src ? (
        <img src={`${BASE}${f.src}`} alt={f.caption ?? f.name} loading="lazy" className="aspect-[3/4] w-full rounded-xl bg-sunken object-contain" />
      ) : (
        <div className="grid aspect-[3/4] w-full place-items-center rounded-xl bg-sunken font-book text-[32px]">{f.name[0]}</div>
      )}
      <div className="mt-1 text-[15px] font-black">{f.name}</div>
      <div className="line-clamp-3 text-[12px] leading-snug font-bold opacity-70">{f.role}</div>
    </div>
  )
}

/** A person with a 百科 page: their photo, whole, and a tick once read. */
function PersonCard({ page, read }: { page: WikiSummary; read: boolean }) {
  const photo = usePhoto(`wiki/${page.id}`)
  return (
    <button onClick={() => go(`wiki/${page.id}`)} className="w-28 shrink-0 snap-start text-left">
      <div className={`relative overflow-hidden rounded-xl border-[3px] ${read ? 'border-lv' : 'border-line'}`}>
        {photo ? <Photo k={`wiki/${page.id}`} ratio="3 / 4" credit={false} /> : <NoPhoto name={page.name} ratio="3 / 4" />}
      </div>
      <div className="mt-1 text-[15px] font-black text-[var(--link)]">{page.name}</div>
      <div className="line-clamp-2 text-[12px] leading-snug font-bold text-mute">{page.dates || plain(page.lede).slice(0, 16)}</div>
    </button>
  )
}

/* ---------------------------------------------------------------------------------------------- */
/* 考一考 · 朝代印                                                                                  */
/* ---------------------------------------------------------------------------------------------- */

type EraQ =
  | { kind: 'choice'; q: string; options: string[]; answer: number; why: string; more?: { route: string; title: string } }
  /** 排一排: `items` in the order they happened, shown in the order of `shown` */
  | { kind: 'order'; items: { date: string; title: string }[]; shown: number[] }

/** The era's own questions, one from each of its stories, up to five, then one 排一排. */
function makeEraQuiz(era: Era, wiki?: WikiIndex): EraQ[] {
  const own: EraQ[] = era.quiz.map((q) => ({ kind: 'choice', ...q, ...mixed(q) }))
  const fromStories: EraQ[] = era.stories.flatMap((s) => {
    const q = wiki?.quiz[s]?.[0]
    const page = wiki?.pages.find((p) => p.id === s)
    return q && page ? [{ kind: 'choice' as const, q: q.q, ...mixed(q), why: q.why, more: { route: `wiki/${s}`, title: page.name } }] : []
  })
  const out = [...own.slice(0, 3), ...shuffle(fromStories)]
  for (const q of own.slice(3)) out.push(q)
  const picked = out.slice(0, 5)
  const n = era.timeline.length
  if (n >= 4) {
    const idx = [...new Set([0, 1, 2, 3].map((i) => Math.round((i * (n - 1)) / 3)))]
    if (idx.length === 4) {
      let shown = shuffle([0, 1, 2, 3])
      while (shown.every((v, i) => v === i)) shown = shuffle([0, 1, 2, 3])
      picked.push({ kind: 'order', items: idx.map((i) => ({ date: era.timeline[i].date, title: era.timeline[i].title })), shown })
    }
  }
  return picked
}

function quizSize(era: Era, wiki?: WikiIndex) {
  const own = era.quiz.length
  const stories = era.stories.filter((s) => wiki?.quiz[s]?.length).length
  return Math.min(own + stories, 5) + (era.timeline.length >= 4 ? 1 : 0)
}

/** #/history/<era>/seal: the era's 考一考. All right (wrong ones come back) stamps the 朝代印. */
export function EraQuiz({ id }: { id: string }) {
  const era = useLoad(() => loadEra(id), `era/${id}`).data
  const wiki = useLoad(loadWikiIndex, 'wiki-index')
  // made once both have loaded, then kept with the page: a link out and back carries on
  const [questions, setQuestions] = usePageState<EraQ[] | undefined>('questions', undefined)
  useEffect(() => {
    if (era && (wiki.data || wiki.error) && !questions) setQuestions(makeEraQuiz(era, wiki.data))
  }, [era, wiki.data, wiki.error, questions, setQuestions])
  const [queue, setQueue] = usePageState<number[] | undefined>('queue', undefined)
  const [choice, setChoice] = usePageState<number | undefined>('choice', undefined)
  const [order, setOrder] = usePageState<number[]>('order', [])
  const [result, setResult] = usePageState<'right' | 'wrong' | undefined>('result', undefined)
  const [coins, setCoins] = usePageState<number | undefined>('coins', undefined)
  if (!era || !questions) return <Loading />
  if (!questions.length)
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader close fallback={`history/${id}`} title={era.name} />
        <p className="p-6 text-center font-bold text-mute">{era.name}的题目还在写。</p>
      </div>
    )
  if (coins !== undefined) return <SealDone era={era} coins={coins} />

  const q0 = queue ?? questions.map((_, i) => i)
  const qi = q0[0]
  const q = questions[qi]
  const glossary = era.glossary
  const source: WordSource = { kind: 'history', route: `history/${id}`, title: `朝代印 · ${era.name}` }
  const ready = q.kind === 'choice' ? choice !== undefined : order.length === q.items.length

  function check() {
    if (!ready) return
    const right = q.kind === 'choice' ? choice === q.answer : order.every((v, i) => v === i)
    setResult(right ? 'right' : 'wrong')
  }
  async function next() {
    const rest = q0.slice(1)
    const newQueue = result === 'right' ? rest : [...rest, qi]
    setResult(undefined)
    setChoice(undefined)
    setOrder([])
    if (newQueue.length === 0) setCoins(await earnEraSeal(id))
    else setQueue(newQueue)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <PageHeader close fallback={`history/${id}`} title={<ProgressBar value={(questions.length - q0.length) / questions.length} color={era.color} />} />
      <div className="flex-1 px-5 pt-4 pb-56">
        <div className="flex items-center gap-2 text-sm font-black" style={{ color: era.color }}>
          <StampIcon size={18} weight="fill" /> 朝代印 · {era.name}
        </div>
        <motion.div key={`${qi}-${q0.length}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
          {q.kind === 'choice' ? (
            <>
              <h2 className="mt-3 text-[23px] font-black">
                <TapText inline id={`era-q-${qi}`} text={q.q} glossary={glossary} source={source} className="!leading-snug" />
              </h2>
              <div className="mt-5 grid gap-3">
                {q.options.map((o, oi) => {
                  const on = choice === oi
                  const showRight = result && oi === q.answer
                  const showWrong = result === 'wrong' && on
                  return (
                    // not `disabled` once answered: the options stay pressable for their pinyin
                    <button
                      key={oi}
                      aria-disabled={!!result}
                      onClick={() => !result && setChoice(oi)}
                      className="tile flex min-h-14 items-center px-4 py-3 text-left text-[18px] font-black transition-colors"
                      style={{
                        borderColor: showRight ? 'var(--color-lv)' : showWrong ? 'var(--color-zhu)' : on ? era.color : undefined,
                        background: showRight ? 'var(--color-lv-soft)' : showWrong ? 'var(--color-zhu-soft)' : on ? `color-mix(in oklab, ${era.color} 10%, var(--surface))` : undefined,
                      }}
                    >
                      {result ? <TapText inline id={`era-o-${qi}-${oi}`} text={o} glossary={glossary} source={source} /> : o}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <OrderQuestion q={q} order={order} setOrder={setOrder} result={result} color={era.color} />
          )}
        </motion.div>
      </div>
      {!result && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 border-t-2 border-line bg-bg">
          <div className="mx-auto max-w-xl px-5 py-4">
            <Button tone="lv" className="w-full" disabled={!ready} onClick={check}>
              检查
            </Button>
          </div>
        </div>
      )}
      <FeedbackBanner
        state={result}
        answer={q.kind === 'choice' ? <TapText inline id={`era-a-${qi}`} text={q.options[q.answer]} glossary={glossary} source={source} /> : q.items.map((it) => it.title).join(' → ')}
        onContinue={next}
        extra={
          q.kind === 'choice' ? (
            <>
              <TapText id={`era-why-${qi}`} text={q.why} glossary={glossary} source={source} className="mt-1 text-[16px] font-bold text-mute" />
              {q.more && (
                <button onClick={() => go(q.more!.route)} className="mt-2 flex items-center gap-1 text-[15px] font-black text-[var(--link)]">
                  读一读：{q.more.title} <ArrowRightIcon size={15} weight="bold" />
                </button>
              )}
            </>
          ) : (
            <ul className="mt-2 space-y-1 text-[15px] font-bold text-mute">
              {q.items.map((it) => (
                <li key={it.title}>
                  {it.date} · {it.title}
                </li>
              ))}
            </ul>
          )
        }
      />
    </div>
  )
}

/** 排一排: tap the four events from the earliest to the latest. */
function OrderQuestion({ q, order, setOrder, result, color }: { q: Extract<EraQ, { kind: 'order' }>; order: number[]; setOrder: (o: number[]) => void; result?: 'right' | 'wrong'; color: string }) {
  return (
    <>
      <h2 className="mt-3 text-[23px] font-black">排一排：哪个最早？按先后点一遍。</h2>
      <div className="mt-5 grid gap-3">
        {q.shown.map((i) => {
          const at = order.indexOf(i)
          const placed = at >= 0
          const wrongHere = result === 'wrong' && placed && at !== i
          return (
            <button
              key={i}
              aria-disabled={!!result}
              onClick={() => !result && !placed && setOrder([...order, i])}
              className="tile flex min-h-14 items-center gap-3 px-4 py-3 text-left text-[18px] font-black"
              style={{
                borderColor: result ? (wrongHere ? 'var(--color-zhu)' : placed ? 'var(--color-lv)' : undefined) : placed ? color : undefined,
                background: placed && !result ? `color-mix(in oklab, ${color} 10%, var(--surface))` : undefined,
              }}
            >
              <span
                className="grid size-8 shrink-0 place-items-center rounded-full border-2 text-[15px]"
                style={placed ? { background: color, borderColor: color, color: inkOn(color) } : { borderColor: 'var(--line)' }}
              >
                {placed ? at + 1 : ''}
              </span>
              <span className="min-w-0 flex-1">{q.items[i].title}</span>
              {result && <span className="shrink-0 text-[13px] font-extrabold text-mute">{q.items[i].date}</span>}
            </button>
          )
        })}
      </div>
      {!result && order.length > 0 && (
        <button onClick={() => setOrder([])} className="mt-3 flex items-center gap-1.5 px-1 text-[15px] font-extrabold text-mute">
          <ArrowCounterClockwiseIcon size={16} weight="bold" /> 重新排
        </button>
      )}
    </>
  )
}

function SealDone({ era, coins }: { era: Era; coins: number }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
      <motion.div initial={{ scale: 2.4, opacity: 0, rotate: 12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
        <Seal char={era.seal} earned size={140} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <h1 className="mt-8 text-[28px] font-black">盖印！</h1>
        <p className="mt-1 text-[17px] font-bold text-mute">{era.name}的朝代印收进历史长卷了。</p>
        {coins > 0 && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[17px] font-black text-huang-dark">
            <CheckCircleIcon size={22} weight="fill" /> +{coins} 铜钱
          </p>
        )}
      </motion.div>
      <div className="mt-10 w-full space-y-3">
        <Button tone="lv" className="w-full" onClick={() => go('history')}>
          回到历史长卷
        </Button>
        <Button tone="plain" className="w-full" onClick={() => back(`history/${era.id}`)}>
          回到{era.name}
        </Button>
      </div>
    </div>
  )
}
