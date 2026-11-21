import { useState } from 'react'
import { useLiveQuery } from '../lib/live.ts'
import { ArrowSquareOutIcon, DropIcon, MagnifyingGlassIcon, PlantIcon, SpeakerHighIcon, TrashIcon } from '@phosphor-icons/react'
import { db, type SavedWord } from '../lib/db.ts'
import { formatInterval, unsaveWord } from '../lib/srs.ts'
import { back, go } from '../lib/router.ts'
import { speak } from '../lib/speech.ts'
import { Button } from '../components/ui.tsx'
import { ZhText } from '../components/ZhText.tsx'
import { GardenGrid, StageCounts } from '../components/Garden.tsx'
import { PageHeader } from '../components/ui.tsx'

let lastView: 'garden' | 'list' = 'garden'

/** 生词花园: saved words as plants (default), or as a searchable list with notes. */
export function WordBank() {
  const words = useLiveQuery(() => db.words.orderBy('created').reverse().toArray(), [], [])
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<number>()
  const [view, setViewState] = useState(lastView)
  const setView = (v: typeof view) => setViewState((lastView = v))
  const now = Date.now()
  const due = words.filter((w) => w.due <= now).length
  const shown = q ? words.filter((w) => w.word.includes(q) || w.p.replace(/[^a-z]/gi, '').includes(q.replace(/\s/g, '')) || w.d.includes(q)) : words

  return (
    <div className="pb-8">
      <PageHeader title="生词花园" fallback="me" onBack={() => back('me')} right={<span className="pr-2 text-sm font-extrabold text-mute">{words.length} 个词</span>} />
      <div className="mx-auto max-w-xl px-4">
        {words.length > 0 && (
          <div className="grid grid-cols-2 rounded-2xl bg-sunken p-1">
            {(
              [
                ['garden', '花园'],
                ['list', '列表'],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`h-10 rounded-xl text-[15px] font-extrabold transition-colors ${view === v ? 'bg-surface text-dai shadow-[0_2px_0_var(--line)]' : 'text-mute'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {due > 0 && (
          <Button tone="dai" className="mt-4 w-full" onClick={() => go('review')}>
            <DropIcon size={22} weight="fill" /> 浇水：复习 {due} 个词
          </Button>
        )}

        {words.length === 0 ? (
          <div className="mt-16 text-center">
            <PlantIcon size={64} weight="fill" className="mx-auto text-line" />
            <p className="mx-auto mt-3 max-w-xs font-bold text-mute">读故事、刷卡片的时候点一个词，再点“加入生词本”，它就会在这里种下一颗种子。复习就是浇水，记得越久，长得越高。</p>
          </div>
        ) : view === 'garden' ? (
          <>
            <div className="tile mt-4 p-3">
              <StageCounts words={words} />
            </div>
            <p className="mt-3 px-1 text-sm font-bold text-mute">复习就是浇水：记得越久，长得越高。忘了也没关系，植物不会死。</p>
            <div className="mt-3">
              <GardenGrid words={words} />
            </div>
          </>
        ) : (
          <>
            <label className="mt-4 flex h-12 items-center gap-2 rounded-2xl border-2 border-line bg-sunken px-4 focus-within:border-dai">
              <MagnifyingGlassIcon size={20} weight="bold" className="text-mute" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜汉字、拼音或英文" className="min-w-0 flex-1 bg-transparent text-[16px] outline-none" />
            </label>
            <ul className="mt-4 space-y-3">
              {shown.map((w) => (
                <WordRow key={w.id} w={w} open={open === w.id} onToggle={() => setOpen(open === w.id ? undefined : w.id)} now={now} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}

function WordRow({ w, open, onToggle, now }: { w: SavedWord; open: boolean; onToggle: () => void; now: number }) {
  const [note, setNote] = useState(w.note ?? '')
  const [confirm, setConfirm] = useState(false)
  const isDue = w.due <= now
  return (
    <li className="tile overflow-hidden">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="font-book text-[28px] leading-none">{w.word}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-mute">{w.d}</div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${isDue ? 'bg-zhu-soft text-zhu' : 'bg-sunken text-mute'}`}>
          {isDue ? '该复习了' : `${formatInterval(w.due - now)}后`}
        </span>
      </button>
      {open && (
        <div className="border-t-2 border-line px-4 pt-3 pb-4">
          <div className="mb-2 text-[17px] font-extrabold text-zhu">{w.p}</div>
          <div className="rounded-xl bg-paper p-3 text-[18px] text-paper-text">
            <ZhText id={`bank-${w.id}`} paras={[{ kind: 'p', sentences: [{ tokens: w.sentence }] }]} source={w.source} />
          </div>
          <div className="mt-1 truncate text-xs font-bold text-mute">{w.source.title}</div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => note !== (w.note ?? '') && db.words.update(w.id!, { note: note.trim() || undefined })}
            placeholder="写个笔记：怎么记住它？在哪儿听到过？"
            rows={2}
            className="mt-3 w-full resize-none rounded-xl border-2 border-line bg-sunken p-3 text-[15px] outline-none focus:border-huang"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button tone="plain" size="sm" onClick={() => speak(w.word, 0.8)}>
              <SpeakerHighIcon size={16} weight="fill" /> 朗读
            </Button>
            {w.source.route && (
              <Button tone="plain" size="sm" onClick={() => go(w.source.route)}>
                <ArrowSquareOutIcon size={16} weight="bold" /> 看原文
              </Button>
            )}
            <div className="flex-1" />
            <Button tone={confirm ? 'zhu' : 'plain'} size="sm" onClick={() => (confirm ? unsaveWord(w.word) : setConfirm(true))}>
              <TrashIcon size={16} weight="bold" /> {confirm ? '确定删除' : '删除'}
            </Button>
          </div>
        </div>
      )}
    </li>
  )
}
