import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRightIcon, CardsIcon, ChatCircleDotsIcon, CheckCircleIcon, FireIcon, SpeakerHighIcon, XIcon } from '@phosphor-icons/react'
import type { Rating } from 'ts-fsrs'
import { db, type EggNote, type SavedWord } from '../lib/db.ts'
import { dueWords, grade, GRADES, previewCard } from '../lib/srs.ts'
import { dueEggs, eggForCard, eggLabel, eggRoute, gradeEgg, isHometown } from '../lib/eggs.ts'
import { tokenizeText } from '../lib/dict.ts'
import { loadCities, loadDialect, loadPlaces, useLoad } from '../lib/content.ts'
import type { Para } from '../lib/types.ts'
import { go, usePageState } from '../lib/router.ts'
import { speak } from '../lib/speech.ts'
import { useStats } from '../lib/stats.ts'
import { Button, Loading, ProgressBar } from '../components/ui.tsx'
import { TapText, ZhText } from '../components/ZhText.tsx'

const EDGE: Record<string, string> = { zhu: 'zhu', huang: 'huang', lv: 'lv', dai: 'dai' }

/** A word or a 聊天彩蛋, due for review. */
type Item = { kind: 'word'; id: string; due: number; word: SavedWord } | { kind: 'egg'; id: string; due: number; egg: EggNote }

const itemCard = (it: Item) => (it.kind === 'word' ? it.word.card : it.egg.card!)

const toItem = {
  word: (w: SavedWord): Item => ({ kind: 'word', id: `w${w.id}`, due: w.due, word: w }),
  egg: (e: EggNote): Item => ({ kind: 'egg', id: `e${e.key}`, due: e.due!, egg: e }),
}

/** The cards of a session, by their ids, as they are now (gone ones dropped). */
async function itemsById(ids: string[]): Promise<Item[]> {
  const items = await Promise.all(
    ids.map(async (id) => {
      if (id.startsWith('w')) {
        const w = await db.words.get(Number(id.slice(1)))
        return w && toItem.word(w)
      }
      const e = await db.eggs.get(id.slice(1))
      return e?.card ? toItem.egg(e) : undefined
    }),
  )
  return items.filter((it): it is Item => !!it)
}

export function Review() {
  const [queue, setQueue] = useState<Item[]>()
  // the session is kept with the page by card ids (the rows are read again: their cards hold Dates),
  // so following 去…看看 and coming back carries on where you were
  const [ids, setIds] = usePageState<string[] | undefined>('ids', undefined)
  const [total, setTotal] = usePageState('total', 0)
  const [shown, setShown] = usePageState('shown', false)
  const [intervals, setIntervals] = useState<string[]>([])
  const [reviewed, setReviewed] = usePageState('reviewed', 0)
  const [right, setRight] = usePageState('right', 0)
  const stats = useStats()

  useEffect(() => {
    if (ids) {
      itemsById(ids).then(setQueue)
      return
    }
    Promise.all([dueWords(50), dueEggs(50)]).then(([words, eggs]) => {
      const items: Item[] = [...words.map(toItem.word), ...eggs.map(toItem.egg)].sort((a, b) => a.due - b.due)
      setQueue(items)
      setTotal(items.length)
    })
    // once, when opened: a session kept from before carries on instead
  }, [])
  useEffect(() => {
    if (queue) setIds(queue.map((it) => it.id))
  }, [queue, setIds])

  const item = queue?.[0]
  useEffect(() => {
    if (item) previewCard(itemCard(item)).then(setIntervals)
  }, [item])

  if (!queue) return <Loading />

  if (!item)
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5">
        <div className="safe-top flex flex-1 flex-col items-center justify-center text-center">
          <motion.div initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
            <CardsIcon size={88} weight="fill" className="text-lv" />
          </motion.div>
          <h1 className="mt-4 text-[26px] font-black">{total ? '复习完了！' : '现在没有要复习的卡'}</h1>
          {total > 0 && (
            <div className="mt-6 grid w-full grid-cols-3 gap-3 text-center">
              <Tile label="复习" value={`${reviewed}`} Icon={CardsIcon} color="var(--color-dai)" />
              <Tile label="记得" value={`${Math.round((right / Math.max(1, reviewed)) * 100)}%`} Icon={CheckCircleIcon} color="var(--color-lv)" />
              <Tile label="连续" value={`${stats.streak}天`} Icon={FireIcon} color="var(--color-zhu)" />
            </div>
          )}
          {!total && <p className="mt-2 font-bold text-mute">去读一集故事，点生词加入生词本；或者在地方页上把聊天彩蛋加入复习。</p>}
        </div>
        <div className="safe-bottom py-5">
          <Button tone="lv" className="w-full" onClick={() => go('', true)}>
            完成
          </Button>
        </div>
      </div>
    )

  async function rate(rating: Rating) {
    let it = item!
    if (it.kind === 'word') await grade(it.word, rating)
    else it = { ...it, egg: await gradeEgg(it.egg, rating) }
    setReviewed((n) => n + 1)
    if (rating !== 1) setRight((n) => n + 1)
    setShown(false)
    // 忘了 → see it again at the end of this session
    setQueue((q) => (rating === 1 ? [...q!.slice(1), it] : q!.slice(1)))
  }

  function reveal() {
    setShown(true)
    if (item!.kind === 'word') speak(item!.word.word, 0.8)
  }

  const done = total - queue.length

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <div className="safe-top flex h-14 items-center gap-3 px-3">
        <button aria-label="关闭" onClick={() => go('', true)} className="grid size-10 place-items-center rounded-xl text-mute">
          <XIcon size={24} weight="bold" />
        </button>
        <ProgressBar value={done / Math.max(1, total)} className="flex-1" />
        <span className="text-sm font-extrabold text-mute">{queue.length}</span>
      </div>

      <div className="flex-1 px-5 pt-6 pb-48">
        {item.kind === 'word' ? (
          <WordFace key={`${item.id}-${queue.length}`} card={item.word} shown={shown} />
        ) : (
          <EggFace key={`${item.id}-${queue.length}`} row={item.egg} shown={shown} />
        )}
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t-2 border-line bg-bg">
        <div className="mx-auto max-w-xl px-4 py-4">
          {!shown ? (
            <Button tone="dai" className="w-full" onClick={reveal}>
              显示答案
            </Button>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {GRADES.map((g, i) => (
                <Button key={g.rating} tone={EDGE[g.color] as 'zhu'} size="md" className="!h-16 flex-col !gap-0 !px-1" onClick={() => rate(g.rating)}>
                  <span className="text-[15px]">{g.label}</span>
                  <span className="text-[11px] font-bold opacity-85">{intervals[i] ?? ''}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function WordFace({ card, shown }: { card: SavedWord; shown: boolean }) {
  const sentence = card.sentence
  const hit = sentence.findIndex((t) => t.t === card.word)
  return (
    <>
      <div className="text-[15px] font-extrabold text-mute">这个词怎么读？什么意思？</div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mt-4 rounded-2xl bg-paper p-5 font-book text-[22px] leading-[1.9] text-paper-text">
          {shown ? (
            <ZhText id={`review-${card.id}`} paras={[{ kind: 'p', sentences: [{ tokens: sentence }] }]} source={card.source} />
          ) : (
            sentence.map((t, i) =>
              i === hit ? (
                <mark key={i} className="rounded bg-hl px-1 text-inherit">
                  {t.t}
                </mark>
              ) : (
                <span key={i}>{t.t}</span>
              ),
            )
          )}
        </div>
        <div className="mt-2 truncate px-1 text-xs font-bold text-mute">{card.source.title}</div>

        {shown && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
            <div className="flex items-end gap-3">
              <span className="font-book text-[44px] leading-none">{card.word}</span>
              <span className="pb-1 text-xl font-extrabold text-zhu">{card.p}</span>
              <button aria-label="朗读" onClick={() => speak(card.word, 0.8)} className="mb-0.5 grid size-9 place-items-center rounded-xl bg-sunken text-dai">
                <SpeakerHighIcon size={20} weight="fill" />
              </button>
            </div>
            <p className="mt-2 text-[16px] leading-relaxed">{card.d}</p>
            {card.note && (
              <p className="mt-3 rounded-xl bg-huang/20 p-3 text-[15px] font-semibold">
                <span className="font-black text-huang-dark">笔记 · </span>
                {card.note}
              </p>
            )}
          </motion.div>
        )}
      </motion.div>
    </>
  )
}

/** A 聊天彩蛋 card: its question first, then the egg and the user's notes. */
function EggFace({ row, shown }: { row: EggNote; shown: boolean }) {
  const places = useLoad(loadPlaces, 'places').data
  const cities = useLoad(loadCities, 'cities').data
  const dialect = useLoad(loadDialect, 'dialect').data
  const egg = eggForCard(row, places, cities, dialect)
  const [paras, setParas] = useState<Para[]>()
  useEffect(() => {
    if (egg.sentences || !shown) return
    let live = true
    tokenizeText(egg.text).then((p) => live && setParas(p), () => {})
    return () => {
      live = false
    }
  }, [egg.sentences, egg.text, shown])
  const text = egg.sentences ? [{ kind: 'p' as const, sentences: egg.sentences }] : paras
  const glossary = row.page.startsWith('place/') ? places?.glossary : isHometown(row.page) ? dialect?.glossary : cities?.glossary
  const source = { kind: 'place' as const, route: eggRoute(row.page), title: `${row.title} · ${eggLabel(row.page)}` }
  return (
    <>
      <div className="flex items-center gap-1.5 text-[15px] font-extrabold text-lv">
        <ChatCircleDotsIcon size={18} weight="fill" /> {eggLabel(row.page)} · {row.title}
      </div>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="mt-3 text-[24px] leading-snug font-black">
          <TapText inline id={`review-egg-q-${row.key}`} text={egg.q} glossary={glossary} source={source} className="!leading-snug" />
        </h2>
        {!shown && <p className="mt-3 text-[15px] font-bold text-mute">先在心里说一说，再看答案。</p>}
        {shown && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
            <div className="rounded-2xl bg-paper p-5 text-[20px] leading-[1.8] text-paper-text">
              {text ? <ZhText id={`review-egg-${row.key}`} paras={text} glossary={glossary} source={source} /> : <p className="zh">{egg.text}</p>}
            </div>
            {egg.note && (
              <p className="mt-3 rounded-xl bg-huang/20 p-3 text-[15px] font-semibold whitespace-pre-wrap">
                <span className="font-black text-huang-dark">笔记 · </span>
                {egg.note}
              </p>
            )}
            <button onClick={() => go(eggRoute(row.page))} className="mt-3 flex items-center gap-1 px-1 text-sm font-extrabold text-lv">
              去{row.title}看看 <ArrowRightIcon size={14} weight="bold" />
            </button>
          </motion.div>
        )}
      </motion.div>
    </>
  )
}

function Tile({ label, value, Icon, color }: { label: string; value: string; Icon: typeof CardsIcon; color: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border-2" style={{ borderColor: color }}>
      <div className="py-1 text-xs font-black text-white" style={{ background: color }}>
        {label}
      </div>
      <div className="flex items-center justify-center gap-1.5 py-3 text-xl font-black" style={{ color }}>
        <Icon size={22} weight="fill" /> {value}
      </div>
    </div>
  )
}
