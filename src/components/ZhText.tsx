import { memo, type MouseEvent } from 'react'
import { useLiveQuery } from '../lib/live.ts'
import type { Para } from '../lib/types.ts'
import { db, type WordSource } from '../lib/db.ts'
import { useWordSheet } from './word-context.ts'

const HAN = /[㐀-鿿]/

export function useSavedWords(): Set<string> {
  const words = useLiveQuery(() => db.words.orderBy('word').uniqueKeys(), [], [])
  return new Set(words as string[])
}

interface Props {
  paras: Para[]
  glossary?: Record<string, string>
  source: WordSource
  /** unique prefix so highlights don't clash between texts on one screen */
  id: string
  /** sentence id ("para.sentence") being read aloud */
  speaking?: string
  /** use the interface font instead of the book font (AI replies, UI text) */
  ui?: boolean
  className?: string
}

/** Chinese text where every word can be tapped to open its word card. Pinyin only ever shows in that card. */
export const ZhText = memo(function ZhText({ paras, glossary, source, id, speaking, ui, className = '' }: Props) {
  const saved = useSavedWords()
  const sheet = useWordSheet()

  function onClick(e: MouseEvent) {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-k]')
    if (!el) return
    const [pi, si, ti] = el.dataset.k!.split('.').map(Number)
    const sentence = paras[pi].sentences[si].tokens
    const token = sentence[ti]
    sheet.open({ token, gloss: glossary?.[`${token.t}|${token.p}`], sentence, source, key: `${id}:${el.dataset.k}` })
  }

  return (
    <div className={`zh ${ui ? 'zh-ui' : ''} ${className}`} onClick={onClick}>
      {paras.map((para, pi) => {
        const content = para.sentences.map((s, si) => (
          <span key={si} className={`s ${speaking === `${pi}.${si}` ? 'speaking' : ''}`}>
            {s.tokens.map((t, ti) => {
              if (!t.p || !HAN.test(t.t)) return t.t
              const k = `${pi}.${si}.${ti}`
              const cls = `w ${sheet.active === `${id}:${k}` ? 'on' : ''} ${saved.has(t.t) ? 'saved' : ''}`
              return (
                <span key={ti} data-k={k} className={cls}>
                  {t.t}
                </span>
              )
            })}
          </span>
        ))
        if (para.kind === 'h')
          return (
            <h3 key={pi} className="mt-6 mb-2 font-ui text-[0.95em] font-extrabold tracking-wide text-zhu first:mt-0">
              {content}
            </h3>
          )
        if (para.kind === 'li')
          return (
            <div key={pi} className="relative mb-2 pl-5">
              <span className="absolute top-[0.95em] left-1 size-1.5 rounded-full bg-mute" />
              {content}
            </div>
          )
        return (
          <p key={pi} className="mb-[0.9em] last:mb-0">
            {content}
          </p>
        )
      })}
    </div>
  )
})
