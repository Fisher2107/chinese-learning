import { Photo } from '../components/Photo.tsx'
import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ChatCircleDotsIcon, CheckCircleIcon, InfoIcon, LightbulbIcon, MapPinIcon, PlayIcon, SealCheckIcon, StampIcon } from '@phosphor-icons/react'
import { useLiveQuery } from '../lib/live.ts'
import { db, type WordSource } from '../lib/db.ts'
import { loadCities, loadFeed, loadIndex, loadPlaces, useLoad } from '../lib/content.ts'
import { citiesOf } from '../lib/cities.ts'
import { markKey, setLearnt, useMarks } from '../lib/learn.ts'
import { earnStamp, makeQuiz, MAP_BY_ID, markPlaceRead, markPlaceUnread, regionColor, visitPlace, type QuizQuestion } from '../lib/places.ts'
import { back, go } from '../lib/router.ts'
import { LocatorMap } from '../components/ChinaMap.tsx'
import { ReadMark } from '../components/ReadMark.tsx'
import { LearntButton } from '../components/LearntButton.tsx'
import { CityChips } from './CityPage.tsx'
import { Seal } from '../components/Seal.tsx'
import { FeedbackBanner } from '../components/chrome.tsx'
import { Button, Loading, PageHeader, Pill, ProgressBar, Section } from '../components/ui.tsx'
import { ZhText } from '../components/ZhText.tsx'

export function PlacePage({ id }: { id: string }) {
  const placesFile = useLoad(loadPlaces, 'places').data
  const feed = useLoad(loadFeed, 'feed').data
  const index = useLoad(loadIndex, 'index').data
  const progress = useLiveQuery(() => db.places.get(id), [id])
  const citiesFile = useLoad(loadCities, 'cities').data
  const marks = useMarks()
  useEffect(() => {
    visitPlace(id)
  }, [id])
  if (!placesFile) return <Loading />
  const place = placesFile.places.find((p) => p.id === id)
  if (!place) return <PageHeader title="找不到这个地方" fallback="map" />

  const color = regionColor(place.region)
  const source: WordSource = { kind: 'place', route: `place/${id}`, title: `${place.name} · 地图` }
  const byId = new Map(placesFile.places.map((p) => [p.id, p]))
  const neighbours = (MAP_BY_ID.get(id)?.neighbours ?? []).map((n) => byId.get(n)!).filter(Boolean)
  const series = (index?.series ?? []).filter((s) => s.provinces?.includes(id))
  const cards = (feed?.cards ?? []).filter((c) => c.province === id)
  const stamped = !!progress?.stamp
  const cities = citiesOf(id).filter((c) => c.kind !== 'muni')

  return (
    <div className="pb-12">
      <PageHeader title={place.full} fallback="map" />
      <div className="mx-auto max-w-xl px-4">
        <div className="tile relative overflow-hidden">
          <div className="flex items-center gap-4 p-5 text-white" style={{ background: color }}>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold opacity-90">
                {place.region} · {place.type}
              </div>
              <div className="text-[34px] leading-tight font-black">{place.name}</div>
              <div className="mt-1 text-[15px] font-bold opacity-90">
                <span className="whitespace-nowrap">简称“{place.short}”{place.alias && `或“${place.alias}”`}</span>
                {place.capital && <span className="whitespace-nowrap"> · 省会{place.capital}</span>}
              </div>
            </div>
            <LocatorMap id={id} color="#fff" rest="rgba(255,255,255,0.28)" edge="transparent" className="w-28 shrink-0" />
          </div>
          <Photo k={`place/${id}`} />
          <div className="flex items-center gap-4 p-4">
            <Seal char={place.short} earned={stamped} size={56} />
            {stamped ? (
              <div className="flex-1 text-[15px] font-bold text-mute">
                <div className="flex items-center gap-1.5 font-black text-zhu">
                  <SealCheckIcon size={20} weight="fill" /> 已盖章
                </div>
                {new Date(progress!.stamp!).toLocaleDateString('zh-CN')}
              </div>
            ) : (
              <Button tone="zhu" size="md" className="flex-1" onClick={() => go(`place/${id}/stamp`)}>
                <StampIcon size={20} weight="fill" /> 考一考，盖个章
              </Button>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-paper p-4 text-[19px] text-paper-text">
          <ZhText id={`place-${id}`} paras={place.intro} glossary={placesFile.glossary} source={source} />
        </div>

        <Section
          title={
            <span className="flex items-center gap-2">
              <ChatCircleDotsIcon size={24} weight="fill" className="text-lv" /> 聊天彩蛋
            </span>
          }
        >
          <p className="-mt-1 mb-3 px-1 text-sm font-bold text-mute">跟{place.name}朋友聊天的时候，这些话题能聊起来。</p>
          <div className="space-y-3">
            {place.eggs.map((egg, i) => (
              <div key={i} className="tile flex gap-3 p-4">
                <LightbulbIcon size={22} weight="fill" className="mt-1.5 shrink-0 text-huang-dark" />
                <ZhText id={`egg-${id}-${i}`} paras={[{ ...egg, kind: 'p' }]} glossary={placesFile.glossary} source={source} className="min-w-0 flex-1 text-[18px]" />
              </div>
            ))}
          </div>
        </Section>

        {place.note.length > 0 && (
          <div className="mt-4 flex gap-3 rounded-2xl border-2 border-dashed border-line p-4">
            <InfoIcon size={22} weight="fill" className="mt-1 shrink-0 text-dai" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-dai">聊天小贴士</div>
              <ZhText id={`note-${id}`} paras={[{ kind: 'p', sentences: place.note }]} glossary={placesFile.glossary} source={source} className="text-[17px]" />
            </div>
          </div>
        )}

        <div className="mt-6">
          <ReadMark readAt={progress?.read} onRead={() => markPlaceRead(id, place.chars ?? 0)} onUnread={() => markPlaceUnread(id)} />
        </div>

        <div className="mt-3 flex gap-2">
          <LearntButton on={marks.learnt.has(markKey('province', id))} onToggle={() => setLearnt('province', id, !marks.learnt.has(markKey('province', id)))} />
          <Button tone="plain" size="md" className="h-12 min-w-0 flex-1 border-2 border-line !px-2" onClick={() => go(`map/place/${id}`)}>
            <MapPinIcon size={20} weight="fill" style={{ color }} /> 地图
          </Button>
        </div>

        {cities.length > 0 && (
          <Section title={`${place.name}的城市`}>
            <CityChips ids={cities.map((c) => c.id)} learnt={marks.learnt} stories={new Set((citiesFile?.cities ?? []).filter((c) => c.intro.length).map((c) => c.id))} />
          </Section>
        )}

        {(series.length > 0 || cards.length > 0) && (
          <Section title={`跟${place.name}有关`}>
            <div className="space-y-3">
              {series.map((s) => (
                <button key={s.id} onClick={() => go(`series/${s.id}`)} className="tile flex w-full overflow-hidden text-left">
                  <div className="w-2.5 shrink-0" style={{ background: s.color }} />
                  <div className="flex min-w-0 flex-1 items-center gap-3 p-4">
                    <PlayIcon size={22} weight="fill" style={{ color: s.color }} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[17px] font-black">{s.title}</div>
                      <div className="truncate text-sm font-bold text-mute">
                        {s.kind} · {s.episodes.length}集
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {cards.map((c) => (
                <button key={c.id} onClick={() => go(`feed/${c.id}`)} className="tile flex w-full items-center gap-3 p-4 text-left">
                  <Pill color={color}>刷一刷</Pill>
                  <span className="min-w-0 flex-1 truncate text-[16px] font-extrabold">{c.title.map((s) => s.tokens.map((t) => t.t).join('')).join('')}</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {neighbours.length > 0 && (
          <Section title="邻居">
            <div className="flex flex-wrap gap-2">
              {neighbours.map((n) => (
                <button key={n.id} onClick={() => go(`place/${n.id}`)} className="tile flex h-11 items-center gap-2 px-3 text-[15px] font-extrabold">
                  <span className="font-book text-lg" style={{ color: regionColor(n.region) }}>
                    {n.short}
                  </span>
                  {n.name}
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

/** 集章: three quick questions; get them all right (wrong ones come back) to earn the seal. */
export function StampQuiz({ id }: { id: string }) {
  const placesFile = useLoad(loadPlaces, 'places').data
  const place = placesFile?.places.find((p) => p.id === id)
  const questions = useMemo<QuizQuestion[]>(() => (place && placesFile ? makeQuiz(place, placesFile.places) : []), [place, placesFile])
  const [queue, setQueue] = useState<number[]>()
  const [choice, setChoice] = useState<number>()
  const [result, setResult] = useState<'right' | 'wrong'>()
  const [coins, setCoins] = useState<number>()
  if (!place || !questions.length) return <Loading />
  const q0 = queue ?? questions.map((_, i) => i)
  const color = regionColor(place.region)

  if (coins !== undefined) return <StampDone id={id} name={place.name} short={place.short} coins={coins} />

  const qi = q0[0]
  const q = questions[qi]
  function check() {
    if (choice === undefined) return
    setResult(choice === q.answer ? 'right' : 'wrong')
  }
  async function next() {
    const rest = q0.slice(1)
    const newQueue = result === 'right' ? rest : [...rest, qi]
    setResult(undefined)
    setChoice(undefined)
    if (newQueue.length === 0) setCoins(await earnStamp(id))
    else setQueue(newQueue)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <PageHeader close fallback={`place/${id}`} title={<ProgressBar value={(questions.length - q0.length) / questions.length} color={color} />} />
      <div className="flex-1 px-5 pt-4 pb-48">
        <div className="flex items-center gap-2 text-sm font-black" style={{ color }}>
          <StampIcon size={18} weight="fill" /> 集章 · {place.name}
        </div>
        <motion.div key={`${qi}-${q0.length}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="mt-2 text-[24px] font-black">{q.q}</h2>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {q.options.map((o, oi) => {
              const on = choice === oi
              const showRight = result && oi === q.answer
              const showWrong = result === 'wrong' && on
              return (
                <button
                  key={o}
                  disabled={!!result}
                  onClick={() => setChoice(oi)}
                  className={`tile flex h-20 items-center justify-center px-3 font-black transition-colors ${o.length === 1 ? 'font-book text-[36px]' : 'text-[20px]'}`}
                  style={{
                    borderColor: showRight ? 'var(--color-lv)' : showWrong ? 'var(--color-zhu)' : on ? color : undefined,
                    background: showRight ? 'var(--color-lv-soft)' : showWrong ? 'var(--color-zhu-soft)' : on ? `color-mix(in oklab, ${color} 10%, var(--surface))` : undefined,
                  }}
                >
                  {o}
                </button>
              )
            })}
          </div>
        </motion.div>
      </div>
      {!result && (
        <div className="safe-bottom fixed inset-x-0 bottom-0 border-t-2 border-line bg-bg">
          <div className="mx-auto max-w-xl px-5 py-4">
            <Button tone="lv" className="w-full" disabled={choice === undefined} onClick={check}>
              检查
            </Button>
          </div>
        </div>
      )}
      <FeedbackBanner state={result} answer={q.options[q.answer]} onContinue={next} extra={<div className="mt-1 text-[16px] font-bold text-mute">{q.why}</div>} />
    </div>
  )
}

function StampDone({ id, name, short, coins }: { id: string; name: string; short: string; coins: number }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
      <motion.div initial={{ scale: 2.4, opacity: 0, rotate: 12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}>
        <Seal char={short} earned size={140} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <h1 className="mt-8 text-[28px] font-black">盖章！</h1>
        <p className="mt-1 text-[17px] font-bold text-mute">{name}的章收进集章册了。</p>
        {coins > 0 && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[17px] font-black text-huang-dark">
            <CheckCircleIcon size={22} weight="fill" /> +{coins} 铜钱
          </p>
        )}
      </motion.div>
      <div className="mt-10 w-full space-y-3">
        <Button tone="lv" className="w-full" onClick={() => go('map')}>
          回到地图
        </Button>
        <Button tone="plain" className="w-full" onClick={() => back(`place/${id}`)}>
          回到{name}
        </Button>
      </div>
    </div>
  )
}
