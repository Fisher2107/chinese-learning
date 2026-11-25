import { Photo } from '../components/Photo.tsx'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRightIcon, BooksIcon, CaretRightIcon, ChatCircleDotsIcon, CheckCircleIcon, DiceFiveIcon, InfoIcon, MapPinIcon, PathIcon, PlayIcon, SealCheckIcon, StampIcon } from '@phosphor-icons/react'
import { useLiveQuery } from '../lib/live.ts'
import { progressKey, db, type WordSource } from '../lib/db.ts'
import { loadCities, loadFeed, loadHistory, loadIndex, loadPhotos, loadPlaces, loadRegions, loadWikiIndex, useLoad } from '../lib/content.ts'
import { CITIES, citiesOf } from '../lib/cities.ts'
import { FOOD_KINDS, pagesAbout, randomPage, SIGHT_KINDS, STORY_KINDS, useWikiProgress } from '../lib/wiki.ts'
import { PeopleRow, PhotoRow } from '../components/WikiCards.tsx'
import type { Para } from '../lib/types.ts'
import { markKey, setLearnt, useMarks } from '../lib/learn.ts'
import { earnStamp, makeQuiz, MAP_BY_ID, markPlaceRead, markPlaceUnread, regionColor, visitPlace, type QuizQuestion } from '../lib/places.ts'
import { back, go, usePageState } from '../lib/router.ts'
import { LocatorMap } from '../components/ChinaMap.tsx'
import { ReadMark } from '../components/ReadMark.tsx'
import { LearntButton } from '../components/LearntButton.tsx'
import { CityChips } from './CityPage.tsx'
import { Seal } from '../components/Seal.tsx'
import { FeedbackBanner } from '../components/chrome.tsx'
import { Button, Loading, PageHeader, Pill, ProgressBar } from '../components/ui.tsx'
import { Fold, JumpBar, Sub } from '../components/Fold.tsx'
import { EggSection, placeLinks, useEggCount, type EggGroup } from '../components/Eggs.tsx'
import { MapKey, ProvinceMap } from '../components/ProvinceMap.tsx'
import { PlaceRegion } from '../components/Regions.tsx'
import { TapText, ZhText } from '../components/ZhText.tsx'

export function PlacePage({ id }: { id: string }) {
  const placesFile = useLoad(loadPlaces, 'places').data
  const feed = useLoad(loadFeed, 'feed').data
  const index = useLoad(loadIndex, 'index').data
  const progress = useLiveQuery(() => db.places.get(progressKey(id)), [id])
  const citiesFile = useLoad(loadCities, 'cities').data
  const regionsFile = useLoad(loadRegions, 'regions').data
  const wikiIndex = useLoad(loadWikiIndex, 'wiki-index').data
  const history = useLoad(loadHistory, 'history').data
  const wikiProgress = useWikiProgress()
  const marks = useMarks()
  const place = placesFile?.places.find((p) => p.id === id)
  const eggCount = useEggCount(`place/${id}`, place?.eggs.length ?? 0)
  useEffect(() => {
    visitPlace(id)
  }, [id])
  const isLearnt = useCallback((c: string) => marks.learnt.has(markKey('city', c)), [marks.learnt])
  const links = useMemo(() => (placesFile ? placeLinks(placesFile.places) : undefined), [placesFile])
  const names = useMemo(() => new Map((placesFile?.places ?? []).map((p) => [p.id, p.name])), [placesFile])
  const written = useMemo(() => new Set((citiesFile?.cities ?? []).filter((c) => c.intro.length).map((c) => c.id)), [citiesFile])
  const cities = useMemo(() => citiesOf(id).filter((c) => c.kind !== 'muni'), [id])
  const pages = useMemo(() => pagesAbout(wikiIndex, { province: id }), [wikiIndex, id])
  const sights = useMemo(() => pages.filter((p) => SIGHT_KINDS.has(p.kind)), [pages])
  const pins = useMemo(() => sights.filter((p) => p.xy).map((p) => ({ id: p.id, x: p.xy![0], y: p.xy![1], name: p.name })), [sights])
  const rivers = useMemo(() => [...new Set(pages.filter((p) => p.river).map((p) => p.river))], [pages])
  // 顺着…去…: pages that belong to this province and another, as a way across (most-linked first)
  const onward = useMemo(() => {
    // a page shared by two provinces is a better bridge than a river through nine; one link per page
    const out: { page: (typeof pages)[number]; to: string }[] = []
    const used = new Set<string>()
    const bridges = pages.filter((p) => p.provinces.length > 1).sort((a, b) => a.provinces.length - b.provinces.length || b.links - a.links)
    for (const p of bridges) {
      const to = p.provinces.find((x) => x !== id && !used.has(x))
      if (!to || out.length >= 3) continue
      used.add(to)
      out.push({ page: p, to })
    }
    return out
  }, [pages, id])
  const groups = useMemo<EggGroup[]>(() => {
    if (!place || !placesFile) return []
    const content = new Map((citiesFile?.cities ?? []).map((c) => [c.id, c]))
    return [
      { page: `place/${id}`, title: place.name, eggs: place.eggs, glossary: placesFile.glossary },
      ...cities.map((c) => ({ page: `city/${c.id}`, title: c.name, eggs: content.get(c.id)?.eggs ?? [], glossary: citiesFile?.glossary ?? {} })),
    ]
  }, [place, placesFile, citiesFile, cities, id])
  if (!placesFile) return <Loading />
  if (!place) return <PageHeader title="找不到这个地方" fallback="map/china" />

  const color = regionColor(place.region)
  const source: WordSource = { kind: 'place', route: `place/${id}`, title: `${place.name} · 地图` }
  const byId = new Map(placesFile.places.map((p) => [p.id, p]))
  const neighbours = (MAP_BY_ID.get(id)?.neighbours ?? []).map((n) => byId.get(n)!).filter(Boolean)
  const series = (index?.series ?? []).filter((s) => s.provinces?.includes(id))
  const cards = (feed?.cards ?? []).filter((c) => c.province === id)
  const stamped = !!progress?.stamp
  const learnt = marks.learnt.has(markKey('province', id))
  // 这里的历史: the province's history stories in the order of the 长卷 (湖南: 屈原 … 毛泽东); sights and
  // food that belong to an era stay in their own rows
  const eraOrder = new Map((history?.eras ?? []).map((e, i) => [e.id, i]))
  const eraName = new Map((history?.eras ?? []).map((e) => [e.id, e.name]))
  const told = pages
    .filter((p) => p.era.length && !SIGHT_KINDS.has(p.kind) && !FOOD_KINDS.has(p.kind))
    .sort((a, b) => (eraOrder.get(a.era[0]) ?? 99) - (eraOrder.get(b.era[0]) ?? 99))
  const people = pages.filter((p) => p.kind === '人物' && !told.includes(p))
  const stories = pages.filter((p) => STORY_KINDS.has(p.kind) && !told.includes(p))
  const food = pages.filter((p) => FOOD_KINDS.has(p.kind))
  const { lede, sections } = splitSections(place.intro)
  const seenHere = pages.filter((p) => wikiProgress.seen.has(p.id)).length
  const related = series.length + cards.length

  return (
    <div className="pb-12">
      <PageHeader
        title={place.full}
        fallback="map/china"
        below={
          <JumpBar
            items={[
              { id: 'place-intro', label: '简介' },
              { id: 'place-eggs', label: '聊天彩蛋', count: eggCount, hot: true },
              { id: 'place-map', label: '地图', count: cities.length || undefined },
              ...(sections.length ? [{ id: 'place-more', label: '读更多', count: sections.length }] : []),
              ...(pages.length ? [{ id: 'place-wiki', label: '百科', count: pages.length }] : []),
              ...(related || neighbours.length ? [{ id: 'place-related', label: '相关', count: related || undefined }] : []),
            ]}
          />
        }
      />
      <div className="mx-auto max-w-xl px-4">
        <div className="tile relative overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: color }}>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-[30px] leading-tight font-black">{place.name}</span>
                <span className="text-sm font-extrabold opacity-90">
                  {place.region} · {place.type}
                </span>
              </div>
              <div className="text-[14px] font-bold opacity-90">
                <span className="whitespace-nowrap">简称“{place.short}”{place.alias && `或“${place.alias}”`}</span>
                {place.capital && <span className="whitespace-nowrap"> · 省会{place.capital}</span>}
              </div>
            </div>
            <LocatorMap id={id} color="#fff" rest="rgba(255,255,255,0.28)" edge="transparent" className="w-20 shrink-0" />
          </div>
          <Photo k={`place/${id}`} />
          <div className="flex items-center gap-3 px-3 py-2.5">
            <Seal char={place.short} earned={stamped} size={40} />
            {stamped ? (
              <div className="flex-1 text-sm font-bold text-mute">
                <span className="mr-2 inline-flex items-center gap-1 font-black text-zhu">
                  <SealCheckIcon size={18} weight="fill" /> 已盖章
                </span>
                {new Date(progress!.stamp!).toLocaleDateString('zh-CN')}
              </div>
            ) : (
              <Button tone="zhu" size="md" className="flex-1" onClick={() => go(`place/${id}/stamp`)}>
                <StampIcon size={18} weight="fill" /> 考一考，盖个章
              </Button>
            )}
          </div>
        </div>

        <Fold id="place-intro" title="简介">
          <div className="rounded-2xl bg-paper p-4 text-[19px] text-paper-text">
            <ZhText id={`place-${id}`} paras={lede} glossary={placesFile.glossary} source={source} />
          </div>
          {place.note.length > 0 && (
            <div className="mt-3 flex gap-3 rounded-2xl border-2 border-dashed border-line p-3.5">
              <InfoIcon size={20} weight="fill" className="mt-1 shrink-0 text-dai" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-dai">聊天小贴士</div>
                <ZhText id={`note-${id}`} paras={[{ kind: 'p', sentences: place.note }]} glossary={placesFile.glossary} source={source} className="text-[17px]" />
              </div>
            </div>
          )}
        </Fold>

        <Fold id="place-eggs" title="聊天彩蛋" count={eggCount} icon={<ChatCircleDotsIcon size={22} weight="fill" className="shrink-0 text-lv" />}>
          {links && <EggSection key={id} groups={groups} links={links} />}
        </Fold>

        <Fold id="place-map" title={cities.length ? `地图 · ${cities.length}个城市` : '地图'}>
          <div className="tile overflow-hidden">
            <ProvinceMap prov={id} names={names} learnt={isLearnt} stories={written} color={color} sights={pins} rivers={rivers} />
          </div>
          {(cities.length > 0 || pins.length > 0) && <MapKey sights={pins.length > 0} />}
          <div className="mt-3 flex gap-2">
            <LearntButton on={learnt} onToggle={() => setLearnt('province', id, !learnt)} />
            <Button tone="plain" size="md" className="h-12 min-w-0 flex-1 border-2 border-line !px-2" onClick={() => go(`map/place/${id}`)}>
              <MapPinIcon size={20} weight="fill" style={{ color }} /> 在大地图上看
            </Button>
          </div>
          {regionsFile && <PlaceRegion place={place} file={regionsFile} places={placesFile.places} feed={feed?.cards} />}
          {cities.length > 0 && (
            <details className="group mt-3">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 px-1 text-sm font-extrabold text-mute">
                <CaretRightIcon size={14} weight="bold" className="transition-transform group-open:rotate-90" /> 城市列表
              </summary>
              <div className="mt-2">
                <CityChips ids={cities.map((c) => c.id)} learnt={marks.learnt} stories={written} />
              </div>
            </details>
          )}
        </Fold>

        {sections.length > 0 && (
          <Fold id="place-more" title={`读更多 · ${place.name}的故事`} count={sections.length}>
            <div className="space-y-2">
              {sections.map((sec, i) => (
                <Sub key={i} title={sec.title}>
                  <div className="rounded-2xl bg-paper p-4 text-[19px] text-paper-text">
                    <ZhText id={`place-${id}-s${i}`} paras={sec.paras} glossary={placesFile.glossary} source={source} />
                  </div>
                </Sub>
              ))}
            </div>
          </Fold>
        )}

        <div className="mt-5">
          <ReadMark readAt={progress?.read} onRead={() => markPlaceRead(id, place.chars ?? 0)} onUnread={() => markPlaceUnread(id)} />
        </div>

        {onward.length > 0 && (
          <div className="mt-4 space-y-2">
            {onward.map(({ page, to }) => (
              <div key={to} className="tile flex items-center gap-2 p-2 pl-3.5">
                <PathIcon size={20} weight="fill" className="shrink-0 text-zhu" />
                <button onClick={() => go(`wiki/${page.id}`)} className="min-w-0 flex-1 truncate py-1.5 text-left text-[16px] font-black">
                  顺着<span className="text-[var(--link)]">{page.name}</span>去{names.get(to) ?? to}
                </button>
                <button onClick={() => go(`place/${to}`)} className="flex h-10 shrink-0 items-center gap-1 rounded-xl bg-sunken px-3 text-[14px] font-extrabold">
                  {names.get(to) ?? to} <ArrowRightIcon size={14} weight="bold" />
                </button>
              </div>
            ))}
          </div>
        )}

        {pages.length > 0 && (
          <Fold id="place-wiki" title={`${place.name}百科`} count={pages.length} icon={<BooksIcon size={22} weight="fill" className="shrink-0" style={{ color }} />}>
            {wikiIndex && (
              <div className="tile flex items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-black">
                    看过 {seenHere}/{pages.length}
                  </div>
                  <ProgressBar value={seenHere / pages.length} color={color} className="mt-1.5" />
                </div>
                <button
                  onClick={() => {
                    const p = randomPage(wikiIndex, wikiProgress.seen, id)
                    if (p) go(`wiki/${p.id}`)
                  }}
                  className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-sunken px-3 text-[14px] font-extrabold"
                >
                  <DiceFiveIcon size={20} weight="fill" className="text-zhu" /> 随便看
                </button>
              </div>
            )}
            <PhotoRow title={`去${place.name}，必看`} sub="点开一张，读它的故事。" pages={sights} seen={wikiProgress.seen} />
            {history && <PhotoRow title="这里的历史" sub="按朝代排：从最早的说起。" pages={told} seen={wikiProgress.seen} tag={(p) => eraName.get(p.era[0])} action={<button onClick={() => go('history')} className="text-sm font-extrabold text-[var(--link)]">历史长卷</button>} />}
            <PeopleRow title={`${place.name}的人物`} pages={people} seen={wikiProgress.seen} />
            <PhotoRow title="故事 · 传说 · 历史" pages={stories} seen={wikiProgress.seen} />
            <PhotoRow title="吃什么、带什么回家" pages={food} seen={wikiProgress.seen} />
          </Fold>
        )}

        {(related > 0 || neighbours.length > 0) && (
          <Fold id="place-related" title={`跟${place.name}有关`} count={related || undefined} defaultOpen={false}>
            <div className="space-y-2">
              {series.map((s) => (
                <button key={s.id} onClick={() => go(`series/${s.id}`)} className="tile flex w-full overflow-hidden text-left">
                  <div className="w-2 shrink-0" style={{ background: s.color }} />
                  <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3">
                    <PlayIcon size={20} weight="fill" style={{ color: s.color }} className="shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[16px] font-black">{s.title}</div>
                      <div className="truncate text-sm font-bold text-mute">
                        {s.kind} · {s.episodes.length}集
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              {cards.map((c) => (
                <button key={c.id} onClick={() => go(`feed/${c.id}`)} className="tile flex w-full items-center gap-3 px-3.5 py-3 text-left">
                  <Pill color={color}>刷一刷</Pill>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-extrabold">{c.title.map((s) => s.tokens.map((t) => t.t).join('')).join('')}</span>
                </button>
              ))}
            </div>
            {neighbours.length > 0 && (
              <>
                <div className="mt-4 mb-2 px-1 text-sm font-extrabold text-mute">邻居</div>
                <div className="flex flex-wrap gap-2">
                  {neighbours.map((n) => (
                    <button key={n.id} onClick={() => go(`place/${n.id}`)} className="tile flex h-10 items-center gap-2 px-3 text-[15px] font-extrabold">
                      <span className="font-book text-lg" style={{ color: regionColor(n.region) }}>
                        {n.short}
                      </span>
                      {n.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </Fold>
        )}
      </div>
    </div>
  )
}

/** 集章: about six questions on the place itself; get them all right (wrong ones come back) to earn the seal. */
export function StampQuiz({ id }: { id: string }) {
  const placesFile = useLoad(loadPlaces, 'places').data
  const place = placesFile?.places.find((p) => p.id === id)
  // made once, when the places have loaded: answering mustn't reshuffle the questions. All of it is
  // kept with the page, so following 读一读 (or any link) and coming back carries on where you were.
  const [questions, setQuestions] = usePageState<QuizQuestion[] | undefined>('questions', undefined)
  useEffect(() => {
    if (place && placesFile && !questions) setQuestions(makeQuiz(place, placesFile.places, CITIES))
  }, [place, placesFile, questions, setQuestions])
  const [queue, setQueue] = usePageState<number[] | undefined>('queue', undefined)
  const [choice, setChoice] = usePageState<number | undefined>('choice', undefined)
  const [result, setResult] = usePageState<'right' | 'wrong' | undefined>('result', undefined)
  const [coins, setCoins] = usePageState<number | undefined>('coins', undefined)
  const glossary = placesFile?.glossary
  if (!place || !questions?.length) return <Loading />
  const q0 = queue ?? questions.map((_, i) => i)
  const color = regionColor(place.region)

  if (coins !== undefined) return <StampDone id={id} name={place.name} short={place.short} coins={coins} />

  const qi = q0[0]
  const q = questions[qi]
  const wide = q.options.some((o) => [...o].length > 6)
  const source: WordSource = { kind: 'place', route: `place/${id}`, title: `集章 · ${place.name}` }
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
      <div className="flex-1 px-5 pt-4 pb-56">
        <div className="flex items-center gap-2 text-sm font-black" style={{ color }}>
          <StampIcon size={18} weight="fill" /> 集章 · {place.name}
        </div>
        <motion.div key={`${qi}-${q0.length}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
          <h2 className="mt-3 text-[24px] font-black">
            <TapText inline id={`stamp-q-${qi}`} text={q.q} glossary={glossary} source={source} className="!leading-snug" />
          </h2>
          <div className={`mt-5 grid gap-3 ${wide ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {q.options.map((o, oi) => {
              const on = choice === oi
              const showRight = result && oi === q.answer
              const showWrong = result === 'wrong' && on
              const single = o.length === 1
              return (
                // not `disabled` once answered: the options stay pressable for their pinyin
                <button
                  key={o}
                  aria-disabled={!!result}
                  onClick={() => !result && setChoice(oi)}
                  className={`tile flex items-center px-4 font-black transition-colors ${wide ? 'min-h-14 py-3 text-left text-[18px]' : `h-20 justify-center ${single ? 'font-book text-[36px]' : 'text-[20px]'}`}`}
                  style={{
                    borderColor: showRight ? 'var(--color-lv)' : showWrong ? 'var(--color-zhu)' : on ? color : undefined,
                    background: showRight ? 'var(--color-lv-soft)' : showWrong ? 'var(--color-zhu-soft)' : on ? `color-mix(in oklab, ${color} 10%, var(--surface))` : undefined,
                  }}
                >
                  <TapText inline ui={!single} id={`stamp-o-${qi}-${oi}`} text={o} glossary={glossary} source={source} />
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
      <FeedbackBanner
        state={result}
        answer={<TapText inline id={`stamp-a-${qi}`} text={q.options[q.answer]} glossary={glossary} source={source} />}
        onContinue={next}
        extra={
          <>
            <TapText id={`stamp-why-${qi}`} text={q.why} glossary={glossary} source={source} className="mt-1 text-[16px] font-bold text-mute" />
            {q.more && (
              <button onClick={() => go(q.more!.route)} className="mt-2 flex items-center gap-1 text-[15px] font-black text-[var(--link)]">
                读一读：{q.more.title} <ArrowRightIcon size={15} weight="bold" />
              </button>
            )}
          </>
        }
      />
    </div>
  )
}

/** A province intro split at its ## headings: the opening, then titled sections. */
function splitSections(intro: Para[]): { lede: Para[]; sections: { title: string; paras: Para[] }[] } {
  const lede: Para[] = []
  const sections: { title: string; paras: Para[] }[] = []
  for (const p of intro) {
    if (p.kind === 'h') sections.push({ title: p.sentences.map((s) => s.tokens.map((t) => t.t).join('')).join(''), paras: [] })
    else if (sections.length) sections.at(-1)!.paras.push(p)
    else lede.push(p)
  }
  return { lede, sections }
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
        <Button tone="lv" className="w-full" onClick={() => go('map/china')}>
          回到地图
        </Button>
        <Button tone="plain" className="w-full" onClick={() => back(`place/${id}`)}>
          回到{name}
        </Button>
      </div>
    </div>
  )
}
