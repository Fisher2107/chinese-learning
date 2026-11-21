import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { CardsIcon, CheckCircleIcon, FireIcon, SpeakerHighIcon, XIcon } from '@phosphor-icons/react'
import type { Rating } from 'ts-fsrs'
import type { SavedWord } from '../lib/db.ts'
import { dueWords, grade, GRADES, previewIntervals } from '../lib/srs.ts'
import { go } from '../lib/router.ts'
import { speak } from '../lib/speech.ts'
import { useStats } from '../lib/stats.ts'
import { Button, Loading, ProgressBar } from '../components/ui.tsx'
import { ZhText } from '../components/ZhText.tsx'

const EDGE: Record<string, string> = { zhu: 'zhu', huang: 'huang', lv: 'lv', dai: 'dai' }

export function Review() {
  const [queue, setQueue] = useState<SavedWord[]>()
  const [total, setTotal] = useState(0)
  const [shown, setShown] = useState(false)
  const [intervals, setIntervals] = useState<string[]>([])
  const [reviewed, setReviewed] = useState(0)
  const [right, setRight] = useState(0)
  const stats = useStats()

  useEffect(() => {
    dueWords(50).then((w) => {
      setQueue(w)
      setTotal(w.length)
    })
  }, [])

  const card = queue?.[0]
  useEffect(() => {
    setShown(false)
    if (card) previewIntervals(card).then(setIntervals)
  }, [card])

  if (!queue) return <Loading />

  if (!card)
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5">
        <div className="safe-top flex flex-1 flex-col items-center justify-center text-center">
          <motion.div initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
            <CardsIcon size={88} weight="fill" className="text-lv" />
          </motion.div>
          <h1 className="mt-4 text-[26px] font-black">{total ? '复习完了！' : '现在没有要复习的词'}</h1>
          {total > 0 && (
            <div className="mt-6 grid w-full grid-cols-3 gap-3 text-center">
              <Tile label="复习" value={`${reviewed}`} Icon={CardsIcon} color="var(--color-dai)" />
              <Tile label="记得" value={`${Math.round((right / Math.max(1, reviewed)) * 100)}%`} Icon={CheckCircleIcon} color="var(--color-lv)" />
              <Tile label="连续" value={`${stats.streak}天`} Icon={FireIcon} color="var(--color-zhu)" />
            </div>
          )}
          {!total && <p className="mt-2 font-bold text-mute">去读一集故事，点生词加入生词本吧。</p>}
        </div>
        <div className="safe-bottom py-5">
          <Button tone="lv" className="w-full" onClick={() => go('', true)}>
            完成
          </Button>
        </div>
      </div>
    )

  async function rate(rating: Rating) {
    const c = card!
    await grade(c, rating)
    setReviewed((n) => n + 1)
    if (rating !== 1) setRight((n) => n + 1)
    // 忘了 → see it again at the end of this session
    setQueue((q) => (rating === 1 ? [...q!.slice(1), c] : q!.slice(1)))
  }

  const sentence = card.sentence
  const hit = sentence.findIndex((t) => t.t === card.word)
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
        <div className="text-[15px] font-extrabold text-mute">这个词怎么读？什么意思？</div>
        <motion.div key={`${card.id}-${queue.length}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
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
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t-2 border-line bg-bg">
        <div className="mx-auto max-w-xl px-4 py-4">
          {!shown ? (
            <Button
              tone="dai"
              className="w-full"
              onClick={() => {
                setShown(true)
                speak(card.word, 0.8)
              }}
            >
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
