import { CheckCircleIcon } from '@phosphor-icons/react'
import { useWordSheet } from './word-context.ts'
import type { WordSource } from '../lib/db.ts'

/** 学会了: marks a place as known; learnt places go into the 认地图 test. */
export function LearntButton({ on, onToggle, className = '' }: { on: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={on}
      className={`chunky flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-2xl border-2 px-3.5 text-[15px] font-extrabold ${on ? 'border-lv bg-lv text-white' : 'border-line bg-surface text-text'} ${className}`}
      style={{ ['--edge' as string]: on ? 'var(--color-lv-dark)' : 'var(--line)' }}
    >
      {on ? <CheckCircleIcon size={20} weight="fill" /> : <span className="size-4 rounded-full border-2 border-mute" />}
      学会了
    </button>
  )
}

/** A place name you can tap for its reading (pinyin only shows in the word card). */
export function NameWord({ name, py, gloss, source, className = '' }: { name: string; py: string; gloss: string; source: WordSource; className?: string }) {
  const sheet = useWordSheet()
  const token = { t: name, p: py }
  return (
    <button
      onClick={() => sheet.open({ token, gloss, sentence: [token], source, key: `name:${name}` })}
      className={`underline decoration-current/30 decoration-dotted decoration-2 underline-offset-[6px] ${className}`}
    >
      {name}
    </button>
  )
}
