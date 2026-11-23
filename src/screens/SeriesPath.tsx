import { Photo } from '../components/Photo.tsx'
import { useEffect, useState } from 'react'
import { useLiveQuery } from '../lib/live.ts'
import { motion } from 'motion/react'
import { ArrowLeftIcon, BookOpenTextIcon, CheckIcon, LockIcon, StampIcon, StarIcon } from '@phosphor-icons/react'
import { patchRow, progressKey, db, seriesProgress } from '../lib/db.ts'
import { loadSeries, useLoad } from '../lib/content.ts'
import { back, go } from '../lib/router.ts'
import { Loading } from '../components/ui.tsx'
import { ZhText } from '../components/ZhText.tsx'

const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56]

export function SeriesPath({ id }: { id: string }) {
  const { data: series, error } = useLoad(() => loadSeries(id), `series:${id}`)
  const progress = useLiveQuery(() => seriesProgress(id), [id])
  const [toast, setToast] = useState<string>()
  // Seen the latest episode list: clears the 更新 badge on 今天
  const count = series?.episodes.length
  useEffect(() => {
    if (!count) return
    db.series.get(progressKey(id)).then((p) => {
      if (p && p.known !== count) patchRow(db.series, progressKey(id), { known: count })
    })
  }, [id, count])
  if (error) return <div className="p-8 text-center font-bold text-mute">找不到这个系列。</div>
  if (!series || !progress) return <Loading />

  const total = series.episodes.length
  const current = Math.min(progress.unlocked, total)
  const allDone = progress.done.length >= total

  function tap(n: number) {
    if (n <= progress!.unlocked) go(`series/${id}/${n}`)
    else {
      setToast(`先读完第${n - 1}集，回忆一下，就能解锁第${n}集`)
      setTimeout(() => setToast(undefined), 2400)
    }
  }

  const nodes = [
    ...series.episodes.map((e) => ({ key: `e${e.n}`, n: e.n, title: e.title, beat: e.beat })),
    { key: 'after', n: total + 1, title: '读后', beat: '聊天工具包' },
  ]

  return (
    <div className="mx-auto max-w-xl">
      <div className="safe-top relative px-4 pb-6 text-white" style={{ background: series.color }}>
        <button aria-label="返回" onClick={() => back('shelf')} className="grid size-11 place-items-center rounded-xl active:bg-black/10">
          <ArrowLeftIcon size={24} weight="bold" />
        </button>
        <div className="mt-1 px-1">
          <div className="text-sm font-extrabold opacity-90">
            {series.kind} · {series.place}
          </div>
          <h1 className="text-[30px] leading-tight font-black">{series.title}</h1>
          <div className="text-[17px] font-bold opacity-95">{series.subtitle}</div>
          <Photo k={`series/${series.id}`} className="mt-3 rounded-2xl" />
          <ZhText
            ui
            id={`desc-${id}`}
            className="mt-3 text-[16px] !leading-relaxed [&_rt]:!text-white/75"
            paras={series.description}
            glossary={series.glossary}
            source={{ kind: 'episode', route: `series/${id}`, title: series.title }}
          />
          <div className="mt-3 text-sm font-extrabold opacity-90">
            {progress.done.length}/{total} 集 · 约{Math.round(series.full.reduce((a, e) => a + e.chars, 0) / 100) * 100}字
          </div>
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-7 py-10">
        {nodes.map((node, i) => {
          const isAfter = node.key === 'after'
          const done = isAfter ? !!progress.finished : progress.done.includes(node.n)
          const open = isAfter ? allDone : node.n <= progress.unlocked
          const here = !isAfter && node.n === current && !done
          const color = open ? series.color : 'var(--line)'
          return (
            <div key={node.key} className="flex flex-col items-center" style={{ transform: `translateX(${OFFSETS[i % OFFSETS.length]}px)` }}>
              {here && (
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                  className="relative mb-2 rounded-xl border-2 border-line bg-surface px-3 py-1.5 text-sm font-black"
                  style={{ color: series.color }}
                >
                  {progress.done.length === 0 ? '从这里开始' : '继续'}
                  <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-r-2 border-b-2 border-line bg-surface" />
                </motion.div>
              )}
              <button
                aria-label={node.title}
                onClick={() => (isAfter ? (allDone ? go(`series/${id}/after`) : tap(total + 1)) : tap(node.n))}
                className={`chunky relative grid size-[76px] place-items-center rounded-full ${here ? 'ring-8' : ''}`}
                style={{
                  background: color,
                  ['--edge' as string]: open ? `color-mix(in oklab, ${series.color} 70%, black)` : 'color-mix(in oklab, var(--line) 70%, black)',
                  ['--tw-ring-color' as string]: `color-mix(in oklab, ${series.color} 22%, transparent)`,
                }}
              >
                {isAfter ? (
                  <BookOpenTextIcon size={34} weight="fill" color={open ? 'white' : 'var(--mute)'} />
                ) : done ? (
                  <CheckIcon size={36} weight="bold" color="white" />
                ) : open ? (
                  <StarIcon size={34} weight="fill" color="white" />
                ) : (
                  <LockIcon size={30} weight="fill" color="var(--mute)" />
                )}
              </button>
              <div className="mt-2 text-center">
                <div className={`text-[15px] font-black ${open ? '' : 'text-mute'}`}>{isAfter ? node.title : `${node.n}. ${node.title}`}</div>
                <div className="text-xs font-bold text-mute">{node.beat}</div>
              </div>
            </div>
          )
        })}
        <div className="flex flex-col items-center pt-2">
          <div
            className="grid size-20 place-items-center rounded-2xl border-4 border-dashed"
            style={{ borderColor: progress.finished ? series.color : 'var(--line)', color: progress.finished ? series.color : 'var(--mute)' }}
          >
            <StampIcon size={40} weight="fill" />
          </div>
          <div className="mt-2 text-sm font-extrabold text-mute">{progress.finished ? '集章成功' : '看完全部，集一个章'}</div>
        </div>
      </div>

      {toast && (
        <div className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-2xl bg-dai px-4 py-3 text-center text-[15px] font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
