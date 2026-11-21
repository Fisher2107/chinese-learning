import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'motion/react'
import {
  ArrowRightIcon,
  BookOpenTextIcon,
  CardsThreeIcon,
  CaretRightIcon,
  CheckIcon,
  CoinsIcon,
  DropIcon,
  FlowerTulipIcon,
  LeafIcon,
  MapTrifoldIcon,
  PlayIcon,
  SnowflakeIcon,
  SunIcon,
  type Icon,
} from '@phosphor-icons/react'
import { db } from '../lib/db.ts'
import { loadIndex, loadPlaces, useLoad } from '../lib/content.ts'
import { currentJieqi } from '../lib/jieqi.ts'
import { go } from '../lib/router.ts'
import { finishMorning, today, useStats, useToday } from '../lib/stats.ts'
import type { Place, Sentence } from '../lib/types.ts'
import { TopStats } from '../components/chrome.tsx'
import { GardenGrid } from '../components/Garden.tsx'
import { Pill, ProgressBar, Section } from '../components/ui.tsx'
import { ZhText } from '../components/ZhText.tsx'

const BASE = import.meta.env.BASE_URL
const loadJieqi = () =>
  fetch(`${BASE}content/jieqi.json`).then((r) => r.json()) as Promise<{ hooks: Record<string, Sentence[]>; glossary: Record<string, string> }>

const SEASON = {
  spring: { color: '#2BAE85', Icon: FlowerTulipIcon },
  summer: { color: '#E3A008', Icon: SunIcon },
  autumn: { color: '#C2622D', Icon: LeafIcon },
  winter: { color: '#425066', Icon: SnowflakeIcon },
}

const startOfDay = () => new Date(new Date().setHours(0, 0, 0, 0)).getTime()

function greeting() {
  const h = new Date().getHours()
  return h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
}

/** Today's place to meet: one the user hadn't opened before today, the same all day. */
function placeOfTheDay(places: Place[], visitedBefore: Set<string>): Place | undefined {
  const pool = places.filter((p) => !visitedBefore.has(p.id))
  const list = pool.length ? pool : places
  if (!list.length) return undefined
  const seed = [...today()].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  return list[seed % list.length]
}

export function Today() {
  const stats = useStats()
  const day = useToday()
  const index = useLoad(loadIndex, 'index').data
  const places = useLoad(loadPlaces, 'places').data?.places
  const jieqiText = useLoad(loadJieqi, 'jieqi').data
  const progress = useLiveQuery(() => db.series.toArray(), [], [])
  const lastText = useLiveQuery(() => db.texts.orderBy('updated').last(), [])
  const visits = useLiveQuery(() => db.places.toArray(), [], [])
  const words = useLiveQuery(() => db.words.orderBy('created').reverse().limit(8).toArray(), [], [])
  const { term, next, days } = currentJieqi()
  const season = SEASON[term.season]

  const start = startOfDay()
  // Opened a new place today already? That counts, whichever it was.
  const met = places?.find((p) => visits.some((v) => v.id === p.id && v.visited >= start))
  const place = met ?? (places && placeOfTheDay(places, new Set(visits.filter((v) => v.visited < start).map((v) => v.id))))
  const steps: Step[] = [
    stats.words === 0
      ? { Icon: DropIcon, color: '#3D8FB8', title: '种下第一个生词', sub: '读的时候点一个词，加入生词本', done: false, to: 'feed' }
      : stats.due > 0
        ? { Icon: DropIcon, color: '#3D8FB8', title: `浇水：复习 ${stats.due} 个词`, sub: '复习就是给生词浇水', done: false, to: 'review' }
        : { Icon: DropIcon, color: '#3D8FB8', title: '生词都浇过水了', sub: '去花园看看它们', done: true, to: 'words' },
    { Icon: CardsThreeIcon, color: '#8E5BB5', title: '刷 5 张卡片', sub: `${Math.min(day.cards, 5)}/5`, done: day.cards >= 5, to: 'feed' },
    place
      ? {
          Icon: MapTrifoldIcon,
          color: '#F7A43A',
          title: `认识一个地方：${place.name}`,
          sub: `${place.region} · 简称“${place.short}”`,
          done: !!met,
          to: `place/${place.id}`,
        }
      : { Icon: MapTrifoldIcon, color: '#F7A43A', title: '认识一个地方', sub: '', done: false, to: 'map' },
  ]
  const doneCount = steps.filter((s) => s.done).length

  const following = (index?.series ?? [])
    .map((s) => {
      const p = progress.find((x) => x.id === s.id)
      return { s, p, done: p?.done.length ?? 0, total: s.episodes.length }
    })
    .sort((a, b) => (b.p?.updated ?? 0) - (a.p?.updated ?? 0))
  const lastTextInfo = lastText && index?.texts.find((t) => t.id === lastText.id)
  const active = day.cards + day.reviews + day.saved + day.chars > 0

  return (
    <div className="mx-auto max-w-xl px-4">
      <div className="safe-top flex h-16 items-center justify-between">
        <TopStats />
      </div>

      {/* 节气 banner */}
      <div className="relative overflow-hidden rounded-[20px] p-4 text-white" style={{ background: season.color }}>
        <season.Icon size={120} weight="fill" className="absolute -top-4 -right-5 opacity-15" />
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black">{term.name}</span>
          <span className="text-sm font-bold opacity-85">{days <= 1 ? `明天${next.name}` : `${days}天后${next.name}`}</span>
        </div>
        {jieqiText ? (
          <ZhText
            ui
            id="jieqi"
            className="mt-1 text-[16px] !leading-relaxed"
            paras={[{ kind: 'p', sentences: jieqiText.hooks[term.name] }]}
            glossary={jieqiText.glossary}
            source={{ kind: 'text', route: '', title: `节气 · ${term.name}` }}
          />
        ) : (
          <div className="mt-1 h-6" />
        )}
      </div>

      <Routine steps={steps} doneCount={doneCount} />

      <Section title="追剧中" action={<button className="text-sm font-extrabold text-lv" onClick={() => go('shelf')}>全部</button>}>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {following.map(({ s, p, done, total }) => {
            const nextN = Math.min(p?.unlocked ?? 1, total)
            const ep = s.episodes.find((e) => e.n === nextN)!
            const finished = done >= total
            const updated = p?.known !== undefined && p.known < total
            return (
              <button
                key={s.id}
                onClick={() => go(finished && !updated ? `series/${s.id}` : `series/${s.id}/${nextN}`)}
                className="tile w-[78%] max-w-80 shrink-0 snap-start overflow-hidden text-left"
              >
                <div className="relative flex h-24 flex-col justify-end p-4 text-white" style={{ background: s.color }}>
                  {updated && <span className="absolute top-3 right-3 rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-zhu">更新了</span>}
                  <div className="text-xs font-extrabold opacity-90">
                    {s.kind} · {s.place}
                  </div>
                  <div className="text-xl font-black">{s.title}</div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 text-[15px] font-extrabold">
                    <PlayIcon size={16} weight="fill" style={{ color: s.color }} />
                    {finished ? '看完了 · 再看一遍' : `第${nextN}集 · ${ep.title}`}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={done / total} color={s.color} className="h-3 flex-1" />
                    <span className="text-xs font-extrabold text-mute">
                      {done}/{total}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </Section>

      {lastText && lastTextInfo && (
        <Section title="继续读">
          <button onClick={() => go(`text/${lastText.id}/${lastText.sitting + 1}`)} className="tile flex w-full items-center gap-4 p-4 text-left">
            <BookOpenTextIcon size={36} weight="fill" className="shrink-0 text-dai" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[17px] font-extrabold">{lastTextInfo.title}</div>
              <div className="text-sm font-bold text-mute">
                {lastTextInfo.author} · 第{lastText.sitting + 1}/{lastTextInfo.sittings}部分
              </div>
            </div>
            <ArrowRightIcon size={22} weight="bold" className="text-mute" />
          </button>
        </Section>
      )}

      {words.length > 0 && (
        <Section
          title="生词花园"
          action={
            <button className="text-sm font-extrabold text-lv" onClick={() => go('words')}>
              全部 {stats.words}
            </button>
          }
        >
          <GardenGrid words={words} />
        </Section>
      )}

      {active && (
        <Section title={new Date().getHours() >= 18 ? '今天辛苦了' : '今日小结'}>
          <div className="tile grid grid-cols-4 divide-x-2 divide-line py-3 text-center">
            {(
              [
                ['张卡片', day.cards],
                ['次复习', day.reviews],
                ['个新词', day.saved],
                ['个字', day.chars],
              ] as const
            ).map(([label, n]) => (
              <div key={label} className="px-1">
                <div className="text-[22px] font-black">{n.toLocaleString()}</div>
                <div className="text-xs font-extrabold text-mute">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 px-1 text-sm font-bold text-mute">
            {stats.streakDoneToday ? `连续学习 ${stats.streak} 天。明天见！` : '今天再做一点，连续天数就加一。'}
          </p>
        </Section>
      )}
      <div className="h-6" />
    </div>
  )
}

interface Step {
  Icon: Icon
  color: string
  title: string
  sub: string
  done: boolean
  to: string
}

function Routine({ steps, doneCount }: { steps: Step[]; doneCount: number }) {
  const [coins, setCoins] = useState(0)
  const all = doneCount === steps.length
  useEffect(() => {
    if (all) finishMorning().then(setCoins)
  }, [all])

  return (
    <div className="tile mt-5 overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <div className="text-[19px] font-black">{greeting()}！今天三件事</div>
          <div className="text-sm font-bold text-mute">大概五分钟</div>
        </div>
        <div className="text-[15px] font-black text-lv">
          {doneCount}/{steps.length}
        </div>
      </div>
      <div className="divide-y-2 divide-line border-t-2 border-line">
        {steps.map((s) => (
          <button key={s.title} onClick={() => go(s.to)} className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-sunken">
            <span
              className="grid size-10 shrink-0 place-items-center rounded-full"
              style={{ background: s.done ? 'var(--color-lv)' : `color-mix(in oklab, ${s.color} 16%, transparent)` }}
            >
              {s.done ? <CheckIcon size={22} weight="bold" color="#fff" /> : <s.Icon size={22} weight="fill" color={s.color} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[16px] font-extrabold ${s.done ? 'text-mute line-through decoration-2' : ''}`}>{s.title}</span>
              {s.sub && <span className="block truncate text-sm font-bold text-mute">{s.sub}</span>}
            </span>
            {!s.done && <CaretRightIcon size={18} weight="bold" className="text-mute" />}
          </button>
        ))}
      </div>
      {all && (
        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} className="overflow-hidden bg-lv-soft">
          <div className="flex items-center justify-center gap-2 p-3 text-[16px] font-black text-lv-ink">
            今天的三件事都做完了！
            {coins > 0 && (
              <Pill color="var(--color-huang-dark)">
                <CoinsIcon size={14} weight="fill" className="mr-1" /> +{coins}
              </Pill>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}
