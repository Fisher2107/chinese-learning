import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLiveQuery } from '../lib/live.ts'
import { BooksIcon, CardsIcon, CardsThreeIcon, CheckCircleIcon, CoinsIcon, FireIcon, HouseIcon, MapTrifoldIcon, UserIcon, XCircleIcon } from '@phosphor-icons/react'
import { db, getSetting } from '../lib/db.ts'
import { loadIndex, useLoad } from '../lib/content.ts'
import { go } from '../lib/router.ts'
import { useStats } from '../lib/stats.ts'
import { Button } from './ui.tsx'

const TABS = [
  { route: '', label: '今天', Icon: HouseIcon, color: 'var(--color-zhu)' },
  { route: 'feed', label: '刷一刷', Icon: CardsThreeIcon, color: '#8E5BB5' },
  { route: 'map', label: '地图', Icon: MapTrifoldIcon, color: '#F7A43A' },
  { route: 'shelf', label: '书架', Icon: BooksIcon, color: 'var(--color-lv)' },
  { route: 'me', label: '我的', Icon: UserIcon, color: 'var(--color-huang-dark)' },
]

/** True when there are cards the user hasn't seen that arrived after their last visit to 刷一刷. */
function useNewCards() {
  const index = useLoad(loadIndex, 'index').data
  const state = useLiveQuery(async () => ({ visited: await getSetting('feedVisited', ''), seen: new Set((await db.feed.toArray()).map((row) => row.id)) }), [])
  if (!index || !state) return false
  return (index.feed ?? []).some((c) => c.date > state.visited && !state.seen.has(c.id))
}

export function TabBar({ current }: { current: string }) {
  const fresh = useNewCards()
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t-2 border-line bg-bg">
      <div className="mx-auto grid h-16 max-w-xl" style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}>
        {TABS.map(({ route, label, Icon, color }) => {
          const on = current === route
          return (
            <button key={label} onClick={() => go(route)} className="flex flex-col items-center justify-center gap-0.5">
              <span
                className="relative grid h-9 w-12 place-items-center rounded-xl border-2 transition-colors"
                style={{ borderColor: on ? color : 'transparent', background: on ? `color-mix(in oklab, ${color} 12%, transparent)` : undefined }}
              >
                <Icon size={26} weight={on ? 'fill' : 'bold'} color={on ? color : 'var(--mute)'} />
                {route === 'feed' && fresh && !on && <span aria-label="有新卡片" className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-bg bg-zhu" />}
              </span>
              <span className="text-[11px] font-extrabold" style={{ color: on ? color : 'var(--mute)' }}>
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

/** Streak · coins · saved words, as on Duolingo's home screen. */
export function TopStats() {
  const s = useStats()
  return (
    <div className="flex items-center gap-5 text-[17px] font-black">
      <span className="flex items-center gap-1.5" title="连续学习天数" style={{ color: s.streakDoneToday ? 'var(--color-zhu)' : 'var(--mute)' }}>
        <FireIcon size={24} weight="fill" /> {s.streak}
      </span>
      <span className="flex items-center gap-1.5 text-huang-dark" title="铜钱">
        <CoinsIcon size={24} weight="fill" /> {s.coins}
      </span>
      <span className="flex items-center gap-1.5 text-dai" title="生词">
        <CardsIcon size={24} weight="fill" /> {s.words}
      </span>
    </div>
  )
}

/** Bottom banner after checking an answer: green for right, red with the answer for wrong. */
export function FeedbackBanner({
  state,
  answer,
  onContinue,
  extra,
}: {
  state?: 'right' | 'wrong'
  answer?: ReactNode
  onContinue: () => void
  extra?: ReactNode
}) {
  return (
    <AnimatePresence>
      {state && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          className={`safe-bottom fixed inset-x-0 bottom-0 z-40 ${state === 'right' ? 'bg-lv-soft' : 'bg-zhu-soft'}`}
        >
          <div className="mx-auto max-w-xl px-5 pt-5 pb-6">
            <div className={`flex items-center gap-2 text-xl font-black ${state === 'right' ? 'text-lv-ink' : 'text-zhu-ink'}`}>
              {state === 'right' ? <CheckCircleIcon size={30} weight="fill" /> : <XCircleIcon size={30} weight="fill" />}
              {state === 'right' ? '对了！' : '正确答案：'}
            </div>
            {state === 'wrong' && answer && <div className="mt-1 text-[17px] font-bold text-zhu-ink">{answer}</div>}
            {extra}
            <Button tone={state === 'right' ? 'lv' : 'zhu'} className="mt-4 w-full" onClick={onContinue} autoFocus>
              继续
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
