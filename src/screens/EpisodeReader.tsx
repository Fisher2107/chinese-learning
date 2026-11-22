import { Photo } from '../components/Photo.tsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from '../lib/live.ts'
import { motion } from 'motion/react'
import {
  ArrowRightIcon,
  BookOpenTextIcon,
  CardsIcon,
  CoinsIcon,
  ConfettiIcon,
  FireIcon,
  LockIcon,
  PauseIcon,
  SpeakerHighIcon,
  TextAaIcon,
  XIcon,
} from '@phosphor-icons/react'
import { db, seriesProgress, type WordSource } from '../lib/db.ts'
import { loadSeries, useLoad } from '../lib/content.ts'
import { back, go } from '../lib/router.ts'
import { FONT_PX, saveSetting, useSettings, type FontSize } from '../lib/settings.ts'
import { speak, stopSpeaking, canSpeak } from '../lib/speech.ts'
import { finishEpisode, unlockEpisode } from '../lib/progress.ts'
import { addCoins, useStats } from '../lib/stats.ts'
import type { Episode, Excerpt, GateQuestion, SeriesFile } from '../lib/types.ts'
import { Button, Loading, ProgressBar } from '../components/ui.tsx'
import { FeedbackBanner } from '../components/chrome.tsx'
import { ZhText } from '../components/ZhText.tsx'
import { OldTips } from '../components/OldTips.tsx'
import { sentenceText } from '../components/word-context.ts'

type Phase = 'read' | 'gate' | 'done'

export function EpisodeReader({ id, n }: { id: string; n: number }) {
  const { data: series } = useLoad(() => loadSeries(id), `series:${id}`)
  const progress = useLiveQuery(() => seriesProgress(id), [id])
  const [phase, setPhase] = useState<Phase>('read')
  const [coins, setCoins] = useState(0)

  useEffect(() => () => stopSpeaking(), [])
  if (!series || !progress) return <Loading />
  const ep = series.full.find((e) => e.n === n)
  if (!ep) return <div className="p-8 text-center font-bold text-mute">没有这一集。</div>
  if (n > progress.unlocked)
    return (
      <div className="mx-auto grid min-h-dvh max-w-md place-items-center p-8 text-center">
        <div>
          <LockIcon size={56} weight="fill" className="mx-auto text-mute" />
          <div className="mt-3 text-xl font-black">第{n}集还没解锁</div>
          <p className="mt-1 font-bold text-mute">先读完第{n - 1}集，回答几个小问题就能解锁。</p>
          <Button className="mt-6" onClick={() => go(`series/${id}/${progress.unlocked}`, true)}>
            去第{progress.unlocked}集
          </Button>
        </div>
      </div>
    )

  const total = series.episodes.length
  const route = `series/${id}/${n}`
  const source: WordSource = { kind: 'episode', route, title: `${series.title} · 第${n}集` }

  async function complete(gateCoins: number) {
    const earned = await finishEpisode(id, n, ep!.chars)
    if (n < total) await unlockEpisode(id, n + 1)
    if (gateCoins) await addCoins(gateCoins)
    setCoins(earned + gateCoins)
    setPhase('done')
    window.scrollTo(0, 0)
  }

  if (phase === 'gate')
    return (
      <RecallGate
        questions={ep.gate}
        color={series.color}
        glossary={series.glossary}
        source={source}
        nextTitle={`第${n + 1}集 · ${series.episodes[n]?.title ?? ''}`}
        onClose={() => setPhase('read')}
        onPass={(firstTry) => complete(firstTry * 3)}
      />
    )
  if (phase === 'done') return <EpisodeComplete series={series} ep={ep} coins={coins} route={route} />

  return (
    <Reader
      series={series}
      ep={ep}
      source={source}
      nextOpen={progress.unlocked > n}
      onUnlock={() => {
        stopSpeaking()
        if (ep.gate.length && n < total) {
          setPhase('gate')
          window.scrollTo(0, 0)
        } else complete(0)
      }}
    />
  )
}

/* ───────────────────────── Reader ───────────────────────── */

interface Line {
  block: number
  sid: string
  text: string
}

function Reader({
  series,
  ep,
  source,
  nextOpen,
  onUnlock,
}: {
  series: SeriesFile
  ep: Episode
  source: WordSource
  nextOpen: boolean
  onUnlock: () => void
}) {
  const settings = useSettings()
  const [scroll, setScroll] = useState(0)
  const [speaking, setSpeaking] = useState<Line>()
  const playing = useRef(false)
  const total = series.episodes.length
  const isLast = ep.n === total
  const next = series.episodes.find((e) => e.n === ep.n + 1)

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setScroll(max > 0 ? window.scrollY / max : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const lines = useMemo(() => {
    const out: Line[] = []
    ep.blocks.forEach((b, bi) => {
      const paras = b.kind === 'excerpt' ? b.paras : [b]
      paras.forEach((p, pi) => p.sentences.forEach((s, si) => out.push({ block: bi, sid: `${pi}.${si}`, text: sentenceText(s.tokens) })))
    })
    return out
  }, [ep])

  async function toggleSpeak() {
    if (playing.current) {
      playing.current = false
      stopSpeaking()
      setSpeaking(undefined)
      return
    }
    playing.current = true
    // start from the first sentence on screen
    const els = [...document.querySelectorAll<HTMLElement>('[data-block]')]
    const firstVisible = els.find((el) => el.getBoundingClientRect().bottom > 80)
    let i = Math.max(0, lines.findIndex((l) => String(l.block) === firstVisible?.dataset.block))
    for (; i < lines.length && playing.current; i++) {
      setSpeaking(lines[i])
      requestAnimationFrame(() => document.querySelector('.s.speaking')?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
      await speak(lines[i].text)
    }
    playing.current = false
    setSpeaking(undefined)
  }

  const sizes: FontSize[] = ['s', 'm', 'l']

  return (
    <div className="min-h-dvh bg-paper text-paper-text">
      <div className="safe-top sticky top-0 z-20 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3 px-3">
          <button aria-label="关闭" onClick={() => back(`series/${series.id}`)} className="grid size-10 place-items-center rounded-xl text-mute">
            <XIcon size={24} weight="bold" />
          </button>
          <ProgressBar value={scroll} color={series.color} className="flex-1" />
          <span className="shrink-0 text-sm font-extrabold text-mute">
            第{ep.n}集 · {ep.beat}
          </span>
        </div>
      </div>

      <article className="mx-auto max-w-xl px-5 pt-4 pb-40" style={{ fontSize: FONT_PX[settings.fontSize] }}>
        <div className="font-ui text-sm font-extrabold" style={{ color: series.color }}>
          {series.title}
        </div>
        <h1 className="mt-1 font-book text-[1.7em] leading-tight font-bold">{ep.title}</h1>
        <div className="mt-1 mb-6 font-ui text-sm font-bold text-mute">
          约{ep.chars}字 · {Math.max(1, Math.round(ep.chars / 260))}分钟
        </div>
        <Photo k={[`series/${series.id}/${String(ep.n).padStart(2, '0')}`, `series/${series.id}`]} className="-mx-5 mb-6 sm:mx-0 sm:rounded-2xl" />

        {ep.blocks.map((b, bi) => (
          <div key={bi} data-block={bi} className="mb-[0.9em]">
            {b.kind === 'excerpt' ? (
              <ExcerptCard ex={b} glossary={series.glossary} source={source} id={`ep${ep.n}-b${bi}`} speaking={speaking?.block === bi ? speaking.sid : undefined} />
            ) : (
              <ZhText
                id={`ep${ep.n}-b${bi}`}
                paras={[b]}
                glossary={series.glossary}
                source={source}
                speaking={speaking?.block === bi ? speaking.sid : undefined}
              />
            )}
          </div>
        ))}

        <div className="mt-10 border-t-2 border-dashed border-line pt-8 font-ui">
          {isLast ? (
            <Button tone="lv" className="w-full" onClick={onUnlock}>
              看完了！
            </Button>
          ) : nextOpen ? (
            <div className="space-y-3">
              <Button tone="lv" className="w-full" onClick={() => go(`series/${series.id}/${ep.n + 1}`, true)}>
                下一集：{next?.title} <ArrowRightIcon size={20} weight="bold" />
              </Button>
              {ep.gate.length > 0 && (
                <button className="w-full text-center text-sm font-extrabold text-mute" onClick={onUnlock}>
                  再回忆一次
                </button>
              )}
            </div>
          ) : (
            <div className="tile p-5 text-center">
              <LockIcon size={36} weight="fill" className="mx-auto" style={{ color: series.color }} />
              <div className="mt-2 text-lg font-black">
                第{ep.n + 1}集 · {next?.title}
              </div>
              <div className="mb-4 text-[15px] font-bold text-mute">先回忆一下这一集，{ep.gate.length}个小问题，30秒解锁。</div>
              <Button className="w-full" onClick={onUnlock}>
                解锁下一集
              </Button>
            </div>
          )}
        </div>
      </article>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-paper">
        <div className="mx-auto grid h-16 max-w-xl auto-cols-fr grid-flow-col font-ui text-[13px] font-extrabold text-mute">
          {canSpeak && (
            <button onClick={toggleSpeak} className="flex flex-col items-center justify-center gap-0.5" style={{ color: speaking ? series.color : undefined }}>
              {speaking ? <PauseIcon size={24} weight="fill" /> : <SpeakerHighIcon size={24} weight="fill" />}
              {speaking ? '暂停' : '朗读'}
            </button>
          )}
          <button
            onClick={() => saveSetting('fontSize', sizes[(sizes.indexOf(settings.fontSize) + 1) % 3])}
            className="flex flex-col items-center justify-center gap-0.5"
          >
            <TextAaIcon size={24} weight="bold" />
            字号 · {{ s: '小', m: '中', l: '大' }[settings.fontSize]}
          </button>
        </div>
      </nav>
    </div>
  )
}

export function ExcerptCard({
  ex,
  glossary,
  source,
  id,
  speaking,
}: {
  ex: Excerpt
  glossary: Record<string, string>
  source: WordSource
  id: string
  speaking?: string
}) {
  const [tips, setTips] = useState(false)
  return (
    <figure className="my-7 rounded-2xl border-2 border-line bg-surface/70 p-4">
      <figcaption className="mb-2 flex items-center gap-2 font-ui text-[13px] font-black text-mute">
        <BookOpenTextIcon size={18} weight="fill" className="text-dai" />
        原文片段 · {ex.author}《{ex.title}》{ex.year}
      </figcaption>
      <ZhText id={id} paras={ex.paras} glossary={glossary} source={{ ...source, title: `${ex.author}《${ex.title}》` }} speaking={speaking} className="text-[0.95em]" />
      <div className="mt-3 flex items-center justify-between font-ui text-sm font-extrabold">
        {ex.year < 1900 ? (
          <button className="text-mute" onClick={() => setTips(!tips)}>
            {tips ? '收起小贴士' : '读不懂？古白话小贴士'}
          </button>
        ) : (
          <span />
        )}
        <button className="flex items-center gap-1 text-dai" onClick={() => go(`text/${ex.textId}/${ex.sitting + 1}`)}>
          阅读全文 <ArrowRightIcon size={16} weight="bold" />
        </button>
      </div>
      {tips && <OldTips />}
    </figure>
  )
}

/* ───────────────────────── Recall gate ───────────────────────── */

function RecallGate({
  questions,
  color,
  glossary,
  source,
  nextTitle,
  onClose,
  onPass,
}: {
  questions: GateQuestion[]
  color: string
  glossary: Record<string, string>
  source: WordSource
  nextTitle: string
  onClose: () => void
  onPass: (firstTry: number) => void
}) {
  const [queue, setQueue] = useState(() => questions.map((_, i) => i))
  const [missed, setMissed] = useState<Set<number>>(new Set())
  const [choice, setChoice] = useState<number>()
  const [result, setResult] = useState<'right' | 'wrong'>()
  const qi = queue[0]
  const q = questions[qi]
  const solved = questions.length - queue.length

  function check() {
    if (choice === undefined) return
    const right = choice === q.answer
    setResult(right ? 'right' : 'wrong')
    if (!right) setMissed((m) => new Set(m).add(qi))
  }

  function next() {
    const rest = queue.slice(1)
    const newQueue = result === 'right' ? rest : [...rest, qi]
    setResult(undefined)
    setChoice(undefined)
    if (newQueue.length === 0) onPass(questions.length - missed.size)
    else setQueue(newQueue)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <div className="safe-top flex h-14 items-center gap-3 px-3">
        <button aria-label="关闭" onClick={onClose} className="grid size-10 place-items-center rounded-xl text-mute">
          <XIcon size={24} weight="bold" />
        </button>
        <ProgressBar value={solved / questions.length} color={color} className="flex-1" />
      </div>
      <div className="flex-1 px-5 pt-4 pb-48">
        <div className="flex items-center gap-2 text-sm font-black" style={{ color }}>
          <LockIcon size={18} weight="fill" /> 解锁 {nextTitle}
        </div>
        <h2 className="mt-1 text-[15px] font-extrabold text-mute">先回忆一下</h2>
        <motion.div key={`${qi}-${queue.length}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
          <ZhText ui id={`gate-q${qi}`} paras={[{ kind: 'p', sentences: [q.q] }]} glossary={glossary} source={source} className="mt-3 text-[22px] font-bold" />
          <div className="mt-6 space-y-3">
            {q.options.map((o, oi) => {
              const on = choice === oi
              const showRight = result && oi === q.answer
              const showWrong = result === 'wrong' && on
              return (
                <button
                  key={oi}
                  disabled={!!result}
                  onClick={() => setChoice(oi)}
                  className="tile flex w-full items-center gap-3 px-4 py-4 text-left text-[18px] font-bold transition-colors"
                  style={{
                    borderColor: showRight ? 'var(--color-lv)' : showWrong ? 'var(--color-zhu)' : on ? color : undefined,
                    background: showRight ? 'var(--color-lv-soft)' : showWrong ? 'var(--color-zhu-soft)' : on ? `color-mix(in oklab, ${color} 10%, var(--surface))` : undefined,
                  }}
                >
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-lg border-2 text-sm font-black text-mute"
                    style={{ borderColor: on ? color : 'var(--line)', color: on ? color : undefined }}
                  >
                    {oi + 1}
                  </span>
                  {sentenceText(o.tokens)}
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
      <FeedbackBanner state={result} answer={sentenceText(q.options[q.answer].tokens)} onContinue={next} />
    </div>
  )
}

/* ───────────────────────── Episode complete ───────────────────────── */

function EpisodeComplete({ series, ep, coins, route }: { series: SeriesFile; ep: Episode; coins: number; route: string }) {
  const stats = useStats()
  const words = useLiveQuery(() => db.words.filter((w) => w.source.route === route).count(), [route], 0)
  const next = series.episodes.find((e) => e.n === ep.n + 1)
  const tiles = [
    { label: '生词', value: `+${words}`, Icon: CardsIcon, color: 'var(--color-dai)' },
    { label: '铜钱', value: `+${coins}`, Icon: CoinsIcon, color: 'var(--color-huang-dark)' },
    { label: '连续', value: `${stats.streak}天`, Icon: FireIcon, color: 'var(--color-zhu)' },
  ]
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-5">
      <div className="safe-top flex flex-1 flex-col items-center justify-center text-center">
        <motion.div
          initial={{ scale: 0.3, rotate: -20, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 14 }}
          className="grid size-32 place-items-center rounded-full"
          style={{ background: `color-mix(in oklab, ${series.color} 16%, transparent)`, color: series.color }}
        >
          <ConfettiIcon size={72} weight="fill" />
        </motion.div>
        <h1 className="mt-6 text-[28px] font-black" style={{ color: series.color }}>
          第{ep.n}集 看完了！
        </h1>
        <div className="mt-1 font-book text-xl">{ep.title}</div>
        <div className="mt-8 grid w-full grid-cols-3 gap-3">
          {tiles.map((t, i) => (
            <motion.div
              key={t.label}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.12 }}
              className="overflow-hidden rounded-2xl border-2"
              style={{ borderColor: t.color }}
            >
              <div className="py-1 text-xs font-black text-white" style={{ background: t.color }}>
                {t.label}
              </div>
              <div className="flex items-center justify-center gap-1.5 py-3 text-xl font-black" style={{ color: t.color }}>
                <t.Icon size={22} weight="fill" /> {t.value}
              </div>
            </motion.div>
          ))}
        </div>
        {next && (
          <div className="mt-8 text-[15px] font-bold text-mute">
            下一集：第{next.n}集 · {next.title} · {next.beat}
          </div>
        )}
      </div>
      <div className="safe-bottom py-5">
        <Button tone="lv" className="w-full" onClick={() => go(next ? `series/${series.id}/${next.n}` : `series/${series.id}/after`, true)}>
          {next ? '继续看' : '看读后'}
        </Button>
        <button className="mt-3 w-full text-center text-sm font-extrabold text-mute" onClick={() => go(`series/${series.id}`, true)}>
          回到目录
        </button>
      </div>
    </div>
  )
}

