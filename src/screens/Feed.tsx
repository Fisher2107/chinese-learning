import { Photo } from '../components/Photo.tsx'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLiveQuery } from '../lib/live.ts'
import { motion } from 'motion/react'
import { ArrowDownIcon, ArrowUpIcon, ArrowRightIcon, ArrowsClockwiseIcon, CardsIcon, CaretRightIcon, CheckCircleIcon, CheckIcon, HeartIcon, MapTrifoldIcon, PlayIcon, XCircleIcon } from '@phosphor-icons/react'
import { Rating } from 'ts-fsrs'
import { progressKey, db, setSetting, type SavedWord, type WordSource } from '../lib/db.ts'
import { loadFeed, loadIndex, loadPlaces, useLoad } from '../lib/content.ts'
import { buildQueue, markRead, markSeen, quizAnswered, toggleLike, type FeedItem } from '../lib/feed.ts'
import { explored, regionColor, type QuizQuestion } from '../lib/places.ts'
import { go } from '../lib/router.ts'
import { dueWords, grade } from '../lib/srs.ts'
import { today, useToday } from '../lib/stats.ts'
import type { FeedCard, FeedFile, Place, SeriesSummary } from '../lib/types.ts'
import { Seal } from '../components/Seal.tsx'
import { Button, Loading } from '../components/ui.tsx'
import { TapText, ZhText } from '../components/ZhText.tsx'

const NO_PLACE = '#425066'
const titleText = (c: FeedCard) => c.title.map((s) => s.tokens.map((t) => t.t).join('')).join('')

/** 刷一刷: full-screen cards you swipe up through, like short videos but to read. */
export function Feed({ start }: { start?: string }) {
  const feed = useLoad(loadFeed, 'feed').data
  const placesFile = useLoad(loadPlaces, 'places').data
  const index = useLoad(loadIndex, 'index').data
  const [items, setItems] = useState<FeedItem[]>()
  const [round, setRound] = useState(0)
  const box = useRef<HTMLDivElement>(null)

  // Build the session once (per start card / 再刷一遍), so the order doesn't shift while swiping
  useEffect(() => {
    if (!feed || !placesFile) return
    let live = true
    ;(async () => {
      const [seen, due, visited] = await Promise.all([db.feed.toArray(), dueWords(8), db.places.toArray()])
      if (!live) return
      setItems(
        buildQueue({
          cards: feed.cards,
          seen,
          due,
          places: placesFile.places,
          explored: explored(visited),
          start,
          again: round > 0,
        }),
      )
      box.current?.scrollTo({ top: 0 })
    })()
    return () => {
      live = false
    }
  }, [feed, placesFile, start, round])

  useEffect(() => {
    setSetting('feedVisited', today())
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Track which item is on screen and how long it stays there
  useEffect(() => {
    const root = box.current
    if (!root || !items) return
    let active: { id?: string; since: number } = { since: Date.now() }
    const flush = () => {
      if (active.id) markSeen(active.id, Date.now() - active.since)
      active = { since: Date.now() }
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          flush()
          const item = items[Number((e.target as HTMLElement).dataset.i)]
          active = item?.kind === 'card' ? { id: item.card.id, since: Date.now() } : { since: Date.now() }
        }
      },
      { root, threshold: 0.6 },
    )
    root.querySelectorAll('[data-i]').forEach((el) => io.observe(el))
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      flush()
      io.disconnect()
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [items])

  if (!feed || !placesFile || !items) return <Loading />
  const places = new Map(placesFile.places.map((p) => [p.id, p]))
  const series = new Map((index?.series ?? []).map((s) => [s.id, s]))
  const next = () => box.current?.scrollBy({ top: box.current.clientHeight, behavior: 'smooth' })

  return (
    <div
      ref={box}
      className="no-scrollbar fixed inset-x-0 top-0 snap-y snap-mandatory overflow-y-scroll overscroll-contain"
      style={{ bottom: 'calc(4rem + 2px + env(safe-area-inset-bottom))' }}
    >
      {items.map((item, i) => (
        <section key={`${round}-${i}`} data-i={i} className="relative h-full snap-start snap-always overflow-hidden">
          {item.kind === 'card' && <StoryCard card={item.card} feed={feed} place={places.get(item.card.province)} series={series.get(item.card.series)} first={i === 0} onNext={next} />}
          {item.kind === 'review' && <ReviewCard word={item.word} onDone={next} />}
          {item.kind === 'quiz' && <QuizCard place={item.place} q={item.q} glossary={placesFile.glossary} onDone={next} />}
          {item.kind === 'end' && <EndCard onAgain={() => setRound((r) => r + 1)} />}
        </section>
      ))}
    </div>
  )
}

function Frame({ color, children, dark = true }: { color: string; children: React.ReactNode; dark?: boolean }) {
  return (
    <div className={`h-full ${dark ? 'text-white' : 'text-[#3a3000]'}`} style={{ background: color }}>
      <div className="safe-top mx-auto flex h-full max-w-xl flex-col px-4 pb-4">{children}</div>
    </div>
  )
}

/**
 * Shrinks the text a step at a time (18px down to 15px) until the card fits the screen. If it
 * still doesn't, the panel scrolls, and the swipe passes on to the next card at its end.
 * A photo at the top doesn't count: it's fine to scroll past it, but not to shrink the text for it.
 */
function useFitText(sizes = [18, 17, 16, 15]) {
  const ref = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8)
    const fit = () => {
      for (const px of sizes) {
        el.style.fontSize = `${px}px`
        const photo = el.querySelector('figure')?.offsetHeight ?? 0
        if (el.scrollHeight - photo <= el.clientHeight + 1) break
      }
      check()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    // the photo arrives after the text: fit again when the content grows
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    document.fonts?.ready.then(fit)
    el.addEventListener('scroll', check, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', check)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return { ref, more }
}

function StoryCard({
  card,
  feed,
  place,
  series,
  first,
  onNext,
}: {
  card: FeedCard
  feed: FeedFile
  place?: Place
  series?: SeriesSummary
  first: boolean
  onNext: () => void
}) {
  const row = useLiveQuery(() => db.feed.get(progressKey(card.id)), [card.id])
  const liked = !!row?.liked
  const read = !!row?.read
  const color = place ? regionColor(place.region) : NO_PLACE
  const source: WordSource = { kind: 'feed', route: `feed/${card.id}`, title: `刷一刷 · ${titleText(card)}` }
  const { ref, more } = useFitText()
  return (
    <Frame color={color}>
      <div className="flex h-12 items-center gap-1.5 text-xs font-extrabold">
        <span className="mr-auto text-[15px] font-black opacity-90">刷一刷</span>
        {read && (
          <span className="flex items-center gap-1 rounded-full bg-white/25 px-2.5 py-1">
            <CheckIcon size={12} weight="bold" /> 读过
          </span>
        )}
        {series && (
          <button onClick={() => go(`series/${series.id}`)} className="flex h-7 items-center gap-1 rounded-full bg-white px-2.5 text-[#333]">
            <PlayIcon size={12} weight="fill" style={{ color: series.color }} /> 追剧
          </button>
        )}
        {place && (
          <button onClick={() => go(`place/${place.id}`)} className="flex h-7 items-center gap-0.5 rounded-full bg-white/20 pr-1.5 pl-2.5">
            {place.name} <CaretRightIcon size={12} weight="bold" />
          </button>
        )}
        {!series &&
          card.tags.slice(0, 1).map((t) => (
            <span key={t} className="rounded-full bg-black/15 px-2.5 py-1">
              {t}
            </span>
          ))}
      </div>
      <ZhText ui id={`feed-t-${card.id}`} paras={[{ kind: 'p', sentences: card.title }]} glossary={feed.glossary} source={source} className="mt-1 text-[25px] !leading-snug font-black" />
      <div className="relative mt-4 min-h-0 flex-1">
        <div ref={ref} className="no-scrollbar h-full overflow-y-auto rounded-[20px] bg-paper px-4 pt-4 pb-2 text-paper-text shadow-[0_4px_0_rgba(0,0,0,0.15)]">
          <div>
          <Photo k={`feed/${card.id}`} ratio="2 / 1" className="-mx-4 -mt-4 mb-3" />
          <ZhText id={`feed-${card.id}`} paras={card.body} glossary={feed.glossary} source={source} />
          <div className="mt-1 mb-2 flex flex-wrap gap-x-3 font-ui text-xs font-bold text-mute">
            来源：
            {card.inspiration?.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noreferrer" className="underline">
                {url.includes('instagram.com') ? '原视频' : '灵感来源'}{card.inspiration.length > 1 ? i + 1 : ''}
              </a>
            ))}
            {card.sources.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="underline">
                {s.title}
              </a>
            ))}
          </div>
          </div>
        </div>
        {more && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-12 items-end justify-center rounded-b-[20px] bg-gradient-to-t from-paper to-transparent pb-1.5 text-xs font-extrabold text-mute">
            <ArrowDownIcon size={14} weight="bold" /> 下面还有
          </div>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          aria-label={liked ? '取消喜欢' : '喜欢'}
          onClick={() => toggleLike(card.id)}
          className="chunky grid size-13 shrink-0 place-items-center rounded-2xl bg-white"
          style={{ ['--edge' as string]: 'rgba(0,0,0,0.25)' }}
        >
          <motion.span key={String(liked)} initial={{ scale: liked ? 1.5 : 1 }} animate={{ scale: 1 }}>
            <HeartIcon size={28} weight={liked ? 'fill' : 'bold'} color={liked ? '#ED5126' : '#7d7d78'} />
          </motion.span>
        </button>
        {read ? (
          <Button tone="plain" className="min-w-0 flex-1 !border-0" onClick={onNext}>
            <CheckCircleIcon size={22} weight="fill" className="text-lv" /> 读过了 · 下一张
          </Button>
        ) : (
          <Button
            tone="plain"
            className="min-w-0 flex-1 !border-0"
            onClick={async () => {
              await markRead(card.id, card.chars)
              setTimeout(onNext, 350)
            }}
          >
            <CheckIcon size={22} weight="bold" style={{ color }} /> 读完了
          </Button>
        )}
      </div>
      {first && (
        <div className="mt-2 flex items-center justify-center gap-1 text-xs font-extrabold opacity-80">
          <ArrowUpIcon size={14} weight="bold" /> 往上滑，看下一张
        </div>
      )}
    </Frame>
  )
}

function ReviewCard({ word, onDone }: { word: SavedWord; onDone: () => void }) {
  const [shown, setShown] = useState(false)
  const [done, setDone] = useState<Rating>()
  const hit = word.sentence.findIndex((t) => t.t === word.word)
  async function rate(r: Rating) {
    setDone(r)
    await grade(word, r)
    setTimeout(onDone, 700)
  }
  return (
    <Frame color="var(--color-dai)">
      <div className="flex h-12 items-center gap-2 text-[15px] font-black">
        <CardsIcon size={22} weight="fill" /> 复习一下
      </div>
      <div className="flex flex-1 flex-col justify-center">
        <div className="text-center font-book text-[64px] leading-none">{word.word}</div>
        <div className="mt-6 rounded-[20px] bg-paper p-4 font-book text-[19px] leading-[1.85] text-paper-text">
          {word.sentence.map((t, i) =>
            i === hit ? (
              <mark key={i} className="rounded bg-hl px-0.5 text-inherit">
                {t.t}
              </mark>
            ) : (
              <span key={i}>{t.t}</span>
            ),
          )}
        </div>
        {shown && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-center">
            <div className="text-[22px] font-black">{word.p}</div>
            <div className="mt-1 text-[16px] font-semibold opacity-90">{word.d}</div>
          </motion.div>
        )}
      </div>
      {done !== undefined ? (
        <div className="flex h-13 items-center justify-center gap-2 text-[17px] font-black">
          <CheckCircleIcon size={24} weight="fill" /> {done === Rating.Again ? '等会儿再见' : '记住了！'}
        </div>
      ) : !shown ? (
        <Button tone="huang" className="w-full" onClick={() => setShown(true)}>
          看答案
        </Button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <Button tone="zhu" onClick={() => rate(Rating.Again)}>
            忘了
          </Button>
          <Button tone="lv" onClick={() => rate(Rating.Good)}>
            记得
          </Button>
        </div>
      )}
    </Frame>
  )
}

function QuizCard({ place, q, glossary, onDone }: { place: Place; q: QuizQuestion; glossary: Record<string, string>; onDone: () => void }) {
  const [pick, setPick] = useState<number>()
  const source: WordSource = { kind: 'place', route: `place/${place.id}`, title: `考考你 · ${place.name}` }
  function answer(i: number) {
    if (pick !== undefined) return
    setPick(i)
    quizAnswered(i === q.answer)
    setTimeout(onDone, 1600)
  }
  return (
    <Frame color="#FFD111" dark={false}>
      <div className="flex h-12 items-center gap-2 text-[15px] font-black">考考你</div>
      <div className="flex flex-1 flex-col justify-center">
        <div className="flex justify-center">
          <Seal char={pick !== undefined ? place.short : '？'} earned size={96} />
        </div>
        <h2 className="mt-6 text-center text-[24px] font-black">
          <TapText inline id={`feed-quiz-q-${place.id}`} text={q.q} glossary={glossary} source={source} className="!leading-snug" />
        </h2>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {q.options.map((o, i) => {
            const right = pick !== undefined && i === q.answer
            const wrong = pick === i && i !== q.answer
            return (
              <button
                key={o}
                onClick={() => answer(i)}
                className="chunky flex h-20 items-center justify-center gap-2 rounded-2xl bg-white font-book text-[36px] text-[#2b2b2b]"
                style={{ ['--edge' as string]: '#d6a800', background: right ? '#dcf4ea' : wrong ? '#fde6df' : undefined }}
              >
                {o}
                {right && <CheckCircleIcon size={24} weight="fill" className="text-lv" />}
                {wrong && <XCircleIcon size={24} weight="fill" className="text-zhu" />}
              </button>
            )
          })}
        </div>
        {pick !== undefined && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5 text-[17px] font-bold">
            <TapText id={`feed-quiz-why-${place.id}`} text={q.why} glossary={glossary} source={source} className="text-center" />
          </motion.div>
        )}
      </div>
    </Frame>
  )
}

function EndCard({ onAgain }: { onAgain: () => void }) {
  const day = useToday()
  return (
    <Frame color="var(--bg)" dark={false}>
      <div className="flex flex-1 flex-col items-center justify-center text-center text-text">
        <motion.div initial={{ scale: 0.5, rotate: -10 }} whileInView={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          <CheckCircleIcon size={88} weight="fill" className="text-lv" />
        </motion.div>
        <h2 className="mt-4 text-[26px] font-black">今天刷完了</h2>
        <p className="mt-1 max-w-xs text-[16px] font-bold text-mute">今天读完了 {day.cards} 张卡片。没点“读完了”的卡片以后还会再来，新的卡片每天也会来。明天见！</p>
        <div className="mt-8 w-full max-w-sm space-y-3">
          <Button tone="lv" className="w-full" onClick={() => go('map/china')}>
            <MapTrifoldIcon size={20} weight="fill" /> 去地图点亮省份 <ArrowRightIcon size={18} weight="bold" />
          </Button>
          <Button tone="plain" className="w-full" onClick={onAgain}>
            <ArrowsClockwiseIcon size={20} weight="bold" /> 再刷一遍
          </Button>
        </div>
      </div>
    </Frame>
  )
}
