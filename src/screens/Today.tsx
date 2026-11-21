import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRightIcon, BookOpenTextIcon, CardsIcon, LeafIcon, PlayIcon, SnowflakeIcon, SunIcon, FlowerTulipIcon } from '@phosphor-icons/react'
import { db } from '../lib/db.ts'
import { loadIndex, useLoad } from '../lib/content.ts'
import { currentJieqi } from '../lib/jieqi.ts'
import { go } from '../lib/router.ts'
import { useStats } from '../lib/stats.ts'
import type { Sentence } from '../lib/types.ts'
import { TopStats } from '../components/chrome.tsx'
import { Button, ProgressBar, Section } from '../components/ui.tsx'
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

export function Today() {
  const stats = useStats()
  const index = useLoad(loadIndex, 'index').data
  const jieqiText = useLoad(loadJieqi, 'jieqi').data
  const progress = useLiveQuery(() => db.series.toArray(), [], [])
  const lastText = useLiveQuery(() => db.texts.orderBy('updated').last(), [])
  const { term, next, days } = currentJieqi()
  const season = SEASON[term.season]

  const following = (index?.series ?? [])
    .map((s) => {
      const p = progress.find((x) => x.id === s.id)
      return { s, p, done: p?.done.length ?? 0, total: s.episodes.length }
    })
    .sort((a, b) => (b.p?.updated ?? 0) - (a.p?.updated ?? 0))
  const lastTextInfo = lastText && index?.texts.find((t) => t.id === lastText.id)

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
            className="mt-1 text-[16px] !leading-relaxed [&_rt]:!text-white/75"
            paras={[{ kind: 'p', sentences: jieqiText.hooks[term.name] }]}
            glossary={jieqiText.glossary}
            source={{ kind: 'text', route: '', title: `节气 · ${term.name}` }}
          />
        ) : (
          <div className="mt-1 h-6" />
        )}
      </div>

      {/* 今日复习 */}
      <div className="mt-5">
        {stats.due > 0 ? (
          <Button tone="zhu" className="h-16 w-full text-[19px]" onClick={() => go('review')}>
            <CardsIcon size={26} weight="fill" />
            今日复习 · {stats.due} 个词
          </Button>
        ) : (
          <div className="tile flex items-center gap-3 p-4">
            <CardsIcon size={30} weight="fill" className="shrink-0 text-lv" />
            <div className="text-[15px] font-bold text-mute">
              {stats.words === 0 ? '读故事的时候点一下生词，加入生词本，明天就会出现在这里。' : '今天的生词都复习完了。去读一集新的吧！'}
            </div>
          </div>
        )}
      </div>

      <Section title="追剧中" action={<button className="text-sm font-extrabold text-lv" onClick={() => go('shelf')}>全部</button>}>
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
          {following.map(({ s, p, done, total }) => {
            const nextN = Math.min(p?.unlocked ?? 1, total)
            const ep = s.episodes.find((e) => e.n === nextN)!
            const finished = done >= total
            return (
              <button
                key={s.id}
                onClick={() => go(finished ? `series/${s.id}` : `series/${s.id}/${nextN}`)}
                className="tile w-[78%] max-w-80 shrink-0 snap-start overflow-hidden text-left"
              >
                <div className="flex h-24 flex-col justify-end p-4 text-white" style={{ background: s.color }}>
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
      <div className="h-6" />
    </div>
  )
}
