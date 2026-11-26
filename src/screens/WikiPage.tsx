import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRightIcon,
  BooksIcon,
  CaretRightIcon,
  CheckCircleIcon,
  DiceFiveIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  PathIcon,
  QuestionIcon,
  QuotesIcon,
  RabbitIcon,
  WarningIcon,
  XCircleIcon,
} from '@phosphor-icons/react'
import { loadEra, loadHistory, loadPlaces, loadWiki, loadWikiIndex, useLoad } from '../lib/content.ts'
import type { HistoryIndex } from '../lib/history.ts'
import { useLiveQuery } from '../lib/live.ts'
import { progressKey, db, type WordSource } from '../lib/db.ts'
import { go } from '../lib/router.ts'
import { regionColor } from '../lib/places.ts'
import { CITY_BY_ID } from '../lib/cities.ts'
import type { Block, Para, WikiPage as Page, WikiQuiz } from '../lib/types.ts'
import { countRun, markWikiRead, markWikiUnread, plain, pushTrail, randomPage, useWikiProgress, visitWiki, type Crumb, type Run } from '../lib/wiki.ts'
import { Photo, usePhoto } from '../components/Photo.tsx'
import { InlinePicture } from '../components/Picture.tsx'
import { ReadMark } from '../components/ReadMark.tsx'
import { StaticMap, provinceBox, riverBox, type Pin } from '../components/StaticMap.tsx'
import { NextCard } from '../components/WikiCards.tsx'
import { Fold } from '../components/Fold.tsx'
import { SourceList } from '../components/Sources.tsx'
import { Loading, PageHeader, Pill, Section } from '../components/ui.tsx'
import { TapText, ZhText } from '../components/ZhText.tsx'
import { ExcerptCard } from './EpisodeReader.tsx'

/** One 百科 page: a place, a person, a river… with links onward at every turn. */
/** how long the trail was on the page before, to tell a followed link from going back */
const trailLength = { current: 0 }

export function WikiPage({ id }: { id: string }) {
  const { data: page, error } = useLoad(() => loadWiki(id), `wiki/${id}`)
  const places = useLoad(loadPlaces, 'places').data
  const history = useLoad(loadHistory, 'history').data
  const progress = useLiveQuery(() => db.wiki.get(progressKey(id)), [id])
  const [trail, setTrail] = useState<Crumb[]>([])
  const [run, setRun] = useState<Run>()
  useEffect(() => {
    visitWiki(id)
  }, [id])
  useEffect(() => {
    if (!page) return
    const t = pushTrail(id, page.name)
    setTrail(t)
    // followed from the page before it: the trail grew by this page
    setRun(countRun(id, t.length > 1 && t.length > trailLength.current ? 'followed' : t.length > 1 ? 'back' : 'fresh'))
    trailLength.current = t.length
  }, [page, id])

  if (error) return <PageHeader title="这一页还没有写" fallback="wiki" />
  if (!page) return <Loading />

  const source: WordSource = { kind: 'place', route: `wiki/${id}`, title: `${page.name} · 百科` }
  const province = places?.places.find((p) => p.id === page.provinces[0])
  const color = province ? regionColor(province.region) : 'var(--color-dai)'

  return (
    <div className="pb-12">
      <PageHeader title={page.name} fallback="wiki" right={<button aria-label="百科" onClick={() => go('wiki')} className="grid size-11 place-items-center text-mute"><BooksIcon size={22} weight="bold" /></button>} />
      <div className="mx-auto max-w-xl px-4">
        {trail.length > 1 && <Trail trail={trail} />}
        {run && run.now >= 2 && <RunBadge run={run} />}

        <div className="tile overflow-hidden">
          <HeroPhoto id={id} />
          <div className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Pill color={color}>{page.kind}</Pill>
              {page.dates && <span className="text-sm font-extrabold text-mute">{page.dates}</span>}
              {page.en && <span className="text-sm font-bold text-mute">{page.en}</span>}
            </div>
            <ZhText
              id={`wiki-name-${id}`}
              paras={[{ kind: 'p', sentences: [{ tokens: [{ t: page.name, p: page.py }] }] }]}
              glossary={{ [`${page.name}|${page.py}`]: page.en }}
              source={source}
              className="mt-1 !text-left text-[36px] leading-tight font-black"
            />
            {page.era.length > 0 && history && <EraChips eras={page.era} history={history} />}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {page.provinces.map((p) => (
                <Chip key={p} onClick={() => go(`place/${p}`)}>
                  {places?.places.find((x) => x.id === p)?.name ?? p}
                </Chip>
              ))}
              {/* 北京, 上海…: a city with the same name as a province chip would show twice */}
              {page.cities.filter((c) => !page.provinces.some((p) => (places?.places.find((x) => x.id === p)?.name ?? p) === CITY_BY_ID.get(c)?.name)).map((c) => (
                <Chip key={c} onClick={() => go(`city/${c}`)}>
                  {CITY_BY_ID.get(c)?.name ?? c}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <SensitiveBox page={page} source={source} />

        <div className="mt-4 rounded-2xl bg-paper p-4 text-[20px] text-paper-text">
          <ZhText id={`wiki-lede-${id}`} paras={[{ kind: 'p', sentences: page.lede }]} glossary={page.glossary} source={source} />
        </div>

        {page.facts.length > 0 && (
          <dl className="tile mt-4 divide-y-2 divide-line">
            {page.facts.map((f, i) => (
              <div key={i} className="flex gap-3 px-4 py-2.5">
                <dt className="w-16 shrink-0 pt-0.5 text-sm font-black text-mute">{f.k}</dt>
                <dd className="min-w-0 flex-1">
                  <ZhText ui id={`wiki-fact-${id}-${i}`} paras={[{ kind: 'p', sentences: f.v }]} glossary={page.glossary} source={source} className="text-[16px]" />
                </dd>
              </div>
            ))}
          </dl>
        )}

        {page.era.length > 0 && !page.river ? <EraWhereMap page={page} /> : <WhereMap page={page} color={color} />}

        <div className="mt-5 rounded-2xl bg-paper p-4 text-[19px] text-paper-text">
          <Blocks blocks={page.body} id={id} glossary={page.glossary} source={source} />
        </div>

        {page.original.length > 0 && (
          <Fold id="wiki-original" title="读原文" icon={<QuotesIcon size={20} weight="fill" className="shrink-0 text-zhu" />}>
            <div className="rounded-2xl bg-paper p-4 text-[19px] text-paper-text">
              <Blocks blocks={page.original} id={`${id}-original`} glossary={page.glossary} source={source} />
            </div>
          </Fold>
        )}

        {page.quiz.length > 0 && <QuickQuiz q={page.quiz[0]} glossary={page.glossary} source={source} />}

        {page.next.length > 0 && (
          <Section
            title={
              <span className="flex items-center gap-2">
                <PathIcon size={24} weight="fill" className="text-zhu" /> 下一站
              </span>
            }
          >
            <div className="space-y-3">
              {page.next.map((n) => (
                <NextCard key={n.route} {...n} />
              ))}
            </div>
          </Section>
        )}

        <div className="mt-6">
          <ReadMark readAt={progress?.read} onRead={() => markWikiRead(id, page.chars)} onUnread={() => markWikiUnread(id)} />
        </div>

        {page.backlinks.length > 0 && (
          <Section
            title={
              <span className="flex items-center gap-2">
                <LinkIcon size={22} weight="bold" className="text-dai" /> 这些地方也提到了{page.name}
              </span>
            }
          >
            <div className="flex flex-wrap gap-2">
              {page.backlinks.map((b) => (
                <button key={b.route} onClick={() => go(b.route)} className="tile flex h-11 items-center gap-1 px-3 text-[15px] font-extrabold">
                  {b.title} <CaretRightIcon size={14} weight="bold" className="text-mute" />
                </button>
              ))}
            </div>
          </Section>
        )}

        {page.sources.length > 0 && (
          <Fold id="wiki-sources" title="来源" count={page.sources.length} defaultOpen={false}>
            <SourceList sources={page.sources} className="px-1" />
          </Fold>
        )}
      </div>
    </div>
  )
}

/** The 历史长卷 eras a story belongs to, each opening its era. */
function EraChips({ eras, history }: { eras: string[]; history: HistoryIndex }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {eras.map((e) => {
        const era = history.eras.find((x) => x.id === e)
        if (!era) return null
        return (
          <button
            key={e}
            onClick={() => go(`history/${e}`)}
            className="flex h-8 items-center gap-1.5 rounded-full border-2 px-3 text-[14px] font-extrabold"
            style={{ borderColor: `color-mix(in oklab, ${era.color} 55%, transparent)`, background: `color-mix(in oklab, ${era.color} 12%, transparent)` }}
          >
            <span className="size-2.5 rounded-full" style={{ background: era.color }} />
            {era.name}
          </button>
        )
      })}
    </div>
  )
}

const WHY_LABEL: Record<string, string> = { 官方: '官方怎么说', 争议: '争议在哪儿', 在中国: '在中国', 聊天: '聊天时' }

/** 为什么敏感: on a sensitive topic, the official verdict and the other views side by side. */
function SensitiveBox({ page, source }: { page: Page; source: WordSource }) {
  if (!page.sensitive || !page.why.length) return null
  return (
    <div className="mt-4 rounded-2xl border-2 border-huang/70 bg-huang/10 p-4">
      <div className="flex items-center gap-1.5 text-[16px] font-black text-huang-dark">
        <WarningIcon size={20} weight="fill" /> 为什么敏感
      </div>
      <div className="mt-2 space-y-3">
        {page.why.map((w) => (
          <div key={w.k}>
            <div className="text-[13px] font-black text-mute">{WHY_LABEL[w.k] ?? w.k}</div>
            <ZhText ui id={`why-${page.id}-${w.k}`} paras={[{ kind: 'p', sentences: w.v }]} glossary={page.glossary} source={source} className="text-[16px]" />
          </div>
        ))}
      </div>
    </div>
  )
}

/** A story's map: its era on the app's own map, with this story pulsing. Several eras: chips to switch. */
function EraWhereMap({ page }: { page: Page }) {
  const history = useLoad(loadHistory, 'history').data
  const [pick, setPick] = useState(page.era[0])
  const era = useLoad(() => loadEra(pick), `era/${pick}`).data
  if (!era) return <div className="tile mt-4 aspect-[4/3]" />
  const pins: Pin[] = page.xy ? [{ id: page.id, x: page.xy[0], y: page.xy[1], label: page.name, main: true }] : []
  return (
    <div className="tile mt-4 overflow-hidden">
      {page.era.length > 1 && history && (
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-3 py-2.5">
          {page.era.map((e) => {
            const x = history.eras.find((y) => y.id === e)
            if (!x) return null
            return (
              <button
                key={e}
                onClick={() => setPick(e)}
                aria-pressed={e === pick}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border-2 px-3 text-[14px] font-extrabold ${e === pick ? 'border-text bg-text text-bg' : 'border-line'}`}
              >
                <span className="size-2.5 rounded-full" style={{ background: x.color }} />
                {x.name}
              </button>
            )
          })}
        </div>
      )}
      <button onClick={() => go(`map/history/${pick}`)} aria-label="在历史地图上看" className="block w-full">
        <StaticMap box={era.layer.box} layer={era.layer} pins={pins} />
      </button>
      <button onClick={() => go(`map/history/${pick}`)} className="flex w-full items-center gap-2 border-t-2 border-line px-4 py-2.5 text-[14px] font-extrabold text-mute">
        <MapTrifoldIcon size={18} weight="fill" style={{ color: era.color }} /> 在{era.name}的地图上看 <ArrowRightIcon size={14} weight="bold" className="ml-auto" />
      </button>
    </div>
  )
}

function Chip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex h-8 items-center gap-1 rounded-full bg-sunken px-3 text-[14px] font-extrabold">
      <MapTrifoldIcon size={14} weight="fill" className="text-mute" />
      {children}
    </button>
  )
}

function HeroPhoto({ id }: { id: string }) {
  const photo = usePhoto(`wiki/${id}`)
  if (!photo) return null
  return <Photo k={`wiki/${id}`} ratio="16 / 10" />
}

/** 你的路线: the pages that led here. */
/** 连着逛: how deep down the rabbit hole you are today. */
function RunBadge({ run }: { run: Run }) {
  const big = run.now >= 10 ? '停不下来了！' : run.now >= 5 ? '越逛越深了' : ''
  return (
    <div className="mb-3 flex items-center gap-2 rounded-2xl bg-lv-soft px-3 py-2 text-[14px] font-extrabold text-lv-ink">
      <RabbitIcon size={20} weight="fill" className="shrink-0" />
      <span>连着逛了 {run.now} 页{big && ` · ${big}`}</span>
      {run.best > run.now && <span className="ml-auto text-xs opacity-75">今天最多 {run.best} 页</span>}
    </div>
  )
}

function Trail({ trail }: { trail: Crumb[] }) {
  return (
    <div className="no-scrollbar -mx-4 mb-3 flex items-center gap-1 overflow-x-auto px-4 text-[14px] font-extrabold whitespace-nowrap">
      <PathIcon size={16} weight="fill" className="shrink-0 text-zhu" />
      {trail.map((c, i) => (
        <span key={c.id} className="flex items-center gap-1">
          {i > 0 && <CaretRightIcon size={12} weight="bold" className="text-mute" />}
          {i === trail.length - 1 ? (
            <span className="text-text">{c.name}</span>
          ) : (
            <button onClick={() => go(`wiki/${c.id}`)} className="text-[var(--link-seen)]">
              {c.name}
            </button>
          )}
        </span>
      ))}
    </div>
  )
}

/** Where it is: a pin, or a river drawn bold. */
function WhereMap({ page, color }: { page: Page; color: string }) {
  const box = page.river ? riverBox(page.river) : page.provinces[0] ? provinceBox(page.provinces[0]) : undefined
  if (!box || (!page.river && !page.xy)) return null
  const pins: Pin[] = page.xy ? [{ id: page.id, x: page.xy[0], y: page.xy[1], label: page.name, main: true }] : []
  return (
    <div className="tile mt-4 overflow-hidden">
      <StaticMap box={box} focus={page.river ? undefined : page.provinces[0]} color={color} rivers={page.river ? [page.river] : []} pins={pins} />
      <button onClick={() => go(page.cities[0] ? `map/city/${page.cities[0]}` : `map/place/${page.provinces[0]}`)} className="flex w-full items-center gap-2 border-t-2 border-line px-4 py-2.5 text-[14px] font-extrabold text-mute">
        <MapTrifoldIcon size={18} weight="fill" style={{ color }} /> 在大地图上看 <ArrowRightIcon size={14} weight="bold" className="ml-auto" />
      </button>
    </div>
  )
}

/** Paragraphs and headings as tappable text; 原文 excerpts and pictures as their own cards. */
export function Blocks({ blocks, id, glossary, source }: { blocks: Block[]; id: string; glossary: Record<string, string>; source: WordSource }) {
  const groups = useMemo(() => {
    const out: (Para[] | Exclude<Block, Para>)[] = []
    for (const b of blocks) {
      if (b.kind === 'excerpt' || b.kind === 'img') out.push(b)
      else if (Array.isArray(out.at(-1))) (out.at(-1) as Para[]).push(b)
      else out.push([b])
    }
    return out
  }, [blocks])
  return (
    <>
      {groups.map((g, i) =>
        Array.isArray(g) ? (
          <ZhText key={i} id={`wiki-${id}-${i}`} paras={g} glossary={glossary} source={source} />
        ) : g.kind === 'img' ? (
          <InlinePicture key={i} pic={g} glossary={glossary} source={source} id={`wiki-${id}-img-${i}`} />
        ) : (
          <ExcerptCard key={i} ex={g} glossary={glossary} source={source} id={`wiki-${id}-ex-${i}`} />
        ),
      )}
    </>
  )
}

/** 考考你: one question at the end of the page, answered on the spot. */
function QuickQuiz({ q, glossary, source }: { q: WikiQuiz; glossary: Record<string, string>; source: WordSource }) {
  const [pick, setPick] = useState<number>()
  // the content lists the right answer first: show the options in a new order each visit
  const [order] = useState(() => {
    const a = q.options.map((_, i) => i)
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  })
  return (
    <div className="tile mt-5 p-4">
      <div className="flex items-center gap-2 text-sm font-black text-dai">
        <QuestionIcon size={18} weight="fill" /> 考考你
      </div>
      {q.photo && <Photo k={q.photo} ratio="16 / 9" credit={false} className="mt-2 rounded-xl" />}
      <TapText id={`wiki-quiz-q-${source.route}`} text={q.q} glossary={glossary} source={source} className="mt-2 text-[19px] font-black" />
      <div className="mt-3 grid gap-2">
        {order.map((i) => {
          const o = q.options[i]
          const right = pick !== undefined && i === q.answer
          const wrong = pick === i && i !== q.answer
          return (
            // a press answers, so the options only show their pinyin once you've answered
            <button
              key={i}
              aria-disabled={pick !== undefined}
              onClick={() => pick === undefined && setPick(i)}
              className={`flex min-h-12 items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-[16px] font-extrabold ${right ? 'border-lv bg-lv-soft' : wrong ? 'border-zhu bg-zhu-soft' : 'border-line'}`}
            >
              <span className="flex-1">{pick !== undefined ? <TapText inline id={`wiki-quiz-o-${source.route}-${i}`} text={o} glossary={glossary} source={source} /> : o}</span>
              {right && <CheckCircleIcon size={22} weight="fill" className="text-lv" />}
              {wrong && <XCircleIcon size={22} weight="fill" className="text-zhu" />}
            </button>
          )
        })}
      </div>
      {pick !== undefined && <TapText id={`wiki-quiz-why-${source.route}`} text={q.why} glossary={glossary} source={source} className="mt-3 text-[15px] font-bold text-mute" />}
    </div>
  )
}

/** 百科 home: search everything, or wander. */
export function WikiHome() {
  const index = useLoad(loadWikiIndex, 'wiki-index').data
  const places = useLoad(loadPlaces, 'places').data
  const { seen } = useWikiProgress()
  const [q, setQ] = useState('')
  if (!index) return <Loading />
  const norm = q.trim().toLowerCase().replace(/[\s'’]/g, '')
  const hits = norm
    ? index.pages.filter((p) => p.name.includes(norm) || p.py.replace(/[\s'’]/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').includes(norm) || p.en.toLowerCase().includes(norm))
    : []
  const byProvince = new Map<string, typeof index.pages>()
  for (const p of index.pages) for (const pid of p.provinces.length ? p.provinces : ['']) byProvince.set(pid, [...(byProvince.get(pid) ?? []), p])
  const wander = () => {
    const p = randomPage(index, seen)
    if (p) go(`wiki/${p.id}`)
  }
  return (
    <div className="pb-12">
      <PageHeader title="百科" fallback="map/china" />
      <div className="mx-auto max-w-xl px-4">
        <div className="tile flex h-12 items-center gap-2 px-3">
          <MagnifyingGlassIcon size={20} weight="bold" className="text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="钱塘江、suzhou、Su Shi…" className="min-w-0 flex-1 bg-transparent text-[17px] font-bold outline-none placeholder:text-mute" />
        </div>
        <button onClick={wander} className="tile mt-3 flex w-full items-center gap-3 p-4 text-left">
          <DiceFiveIcon size={30} weight="fill" className="shrink-0 text-zhu" />
          <div className="min-w-0 flex-1">
            <div className="text-[17px] font-black">随便逛逛</div>
            <div className="text-sm font-bold text-mute">
              已经看过 {index.pages.filter((p) => seen.has(p.id)).length}/{index.pages.length} 页，打开一页没看过的
            </div>
          </div>
          <ArrowRightIcon size={20} weight="bold" className="text-mute" />
        </button>
        {norm ? (
          <List pages={hits} seen={seen} />
        ) : (
          [...byProvince].map(([pid, pages]) => (
            <Section key={pid} title={places?.places.find((p) => p.id === pid)?.name ?? '全国'} action={<span className="text-sm font-extrabold text-mute">{pages.filter((p) => seen.has(p.id)).length}/{pages.length}</span>}>
              <List pages={pages} seen={seen} />
            </Section>
          ))
        )}
      </div>
    </div>
  )
}

function List({ pages, seen }: { pages: { id: string; name: string; kind: string; lede: { tokens: { t: string }[] }[] }[]; seen: Set<string> }) {
  if (!pages.length) return <p className="p-4 text-center font-bold text-mute">没找到。</p>
  return (
    <ul className="tile mt-3 divide-y-2 divide-line">
      {pages.map((p) => (
        <li key={p.id}>
          <button onClick={() => go(`wiki/${p.id}`)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className={`text-[17px] font-black ${seen.has(p.id) ? 'text-[var(--link-seen)]' : 'text-[var(--link)]'}`}>{p.name}</span>
                <span className="text-[12px] font-extrabold text-mute">{p.kind}</span>
              </div>
              <p className="truncate text-[14px] font-bold text-mute">{plain(p.lede)}</p>
            </div>
            <CaretRightIcon size={16} weight="bold" className="shrink-0 text-mute" />
          </button>
        </li>
      ))}
    </ul>
  )
}
