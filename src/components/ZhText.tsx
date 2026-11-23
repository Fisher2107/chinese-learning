import { memo, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { useLiveQuery } from '../lib/live.ts'
import type { Para } from '../lib/types.ts'
import { db, type WordSource } from '../lib/db.ts'
import { tokenizeText } from '../lib/dict.ts'
import { go } from '../lib/router.ts'
import { useWordSheet, type WordTarget } from './word-context.ts'

const HAN = /[㐀-鿿]/
/** a press shorter than this, without moving, is a tap */
const TAP_MS = 320

export function useSavedWords(): Set<string> {
  // Read whole rows, not orderBy('word').uniqueKeys(): that opens a 'nextunique' cursor, which
  // iPhone Safari (WebKit 26) refuses with "UnknownError: Unable to open cursor", and every screen
  // with Chinese text runs this.
  const words = useLiveQuery(() => db.words.toArray(), [], [])
  return useMemo(() => new Set(words.map((w) => w.word)), [words])
}

/** 百科 pages already opened, as routes (wiki/qiantangjiang), so links to them look visited. */
export function useSeenPages(): Set<string> {
  // whole rows for the same iPhone reason as above; the table is a few hundred rows at most
  const rows = useLiveQuery(() => db.wiki.toArray(), [], [])
  return useMemo(() => new Set(rows.map((r) => `wiki/${r.id}`)), [rows])
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
  /**
   * a line inside a button or a banner (a quiz option, an answer): made of spans, and its 百科
   * links read as plain words, so pressing a word never leaves the page
   */
  inline?: boolean
  className?: string
}

/**
 * Chinese text where every word can be pressed, as in Du Chinese: press a word to see its pinyin and
 * meaning, let go and it disappears (a quick tap too: nothing stays up). Double-tapping the word
 * opens the full word card. Linked words (百科) open their page on a tap.
 */
export const ZhText = memo(function ZhText({ paras, glossary, source, id, speaking, ui, inline, className = '' }: Props) {
  const saved = useSavedWords()
  const seen = useSeenPages()
  const sheet = useWordSheet()
  const root = useRef<HTMLElement>(null)
  const press = useRef<{ k: string; t0: number; x: number; y: number; moved: boolean } | null>(null)
  const lastTap = useRef({ k: '', t: 0 })
  // what a tap decided to do, done on the click that follows it, so the phone's click can't land
  // on whatever the next page puts under the finger
  const onTap = useRef<(() => void) | null>(null)

  function target(k: string): WordTarget {
    const [pi, si, ti] = k.split('.').map(Number)
    const sentence = paras[pi].sentences[si].tokens
    const token = inline && sentence[ti].k ? { ...sentence[ti], k: undefined } : sentence[ti]
    return { token, gloss: glossary?.[`${token.t}|${token.p}`], sentence, source, key: `${id}:${k}` }
  }
  const wordEl = (el: Element | null) => {
    const w = el?.closest<HTMLElement>('[data-k]')
    return w && root.current?.contains(w) ? w : undefined
  }

  function down(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const el = wordEl(e.target as Element)
    if (!el) return
    const k = el.dataset.k!
    onTap.current = null
    press.current = { k, t0: performance.now(), x: e.clientX, y: e.clientY, moved: false }
    sheet.peek(target(k), el.getBoundingClientRect())
  }

  function move(e: PointerEvent) {
    const p = press.current
    if (!p) return
    if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) p.moved = true
    // slide along the line to read the next word
    const el = wordEl(document.elementFromPoint(e.clientX, e.clientY))
    if (el && el.dataset.k !== p.k) {
      p.k = el.dataset.k!
      sheet.peek(target(p.k), el.getBoundingClientRect())
    }
  }

  function up() {
    const p = press.current
    press.current = null
    if (!p) return
    // gone as soon as the finger lifts, held or tapped
    sheet.unpeek()
    if (p.moved || performance.now() - p.t0 > TAP_MS) return
    const t = target(p.k)
    const route = t.token.k
    if (route) {
      onTap.current = () => go(route)
      return
    }
    const now = performance.now()
    if (lastTap.current.k === p.k && now - lastTap.current.t < 450) {
      lastTap.current = { k: '', t: 0 }
      onTap.current = () => sheet.open(t)
      return
    }
    lastTap.current = { k: p.k, t: now }
  }

  function cancel() {
    if (!press.current) return
    press.current = null
    sheet.unpeek()
  }

  const Root = inline ? 'span' : 'div'
  return (
    <Root
      ref={root as never}
      className={`zh ${ui ? 'zh-ui' : ''} ${className}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onClick={() => {
        const run = onTap.current
        onTap.current = null
        run?.()
      }}
      onPointerLeave={(e) => e.pointerType === 'mouse' && cancel()}
      onContextMenu={(e) => press.current && e.preventDefault()}
    >
      {paras.map((para, pi) => {
        const content = para.sentences.map((s, si) => (
          <span key={si} className={`s ${speaking === `${pi}.${si}` ? 'speaking' : ''}`}>
            {s.tokens.map((t, ti) => {
              const link = inline ? undefined : t.k
              if (!t.p || !HAN.test(t.t)) return link ? <span key={ti} className={`wl ${seen.has(link) ? 'seen' : ''}`}>{t.t}</span> : t.t
              const k = `${pi}.${si}.${ti}`
              const cls = `w ${sheet.active === `${id}:${k}` ? 'on' : ''} ${saved.has(t.t) ? 'saved' : ''} ${link ? `wl ${seen.has(link) ? 'seen' : ''}` : ''}`
              return (
                <span key={ti} data-k={k} className={cls}>
                  {t.t}
                </span>
              )
            })}
          </span>
        ))
        if (inline) return <span key={pi}>{content}</span>
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
    </Root>
  )
})

/** Tokenized plain strings, by text: a quiz shows the same few lines again and again. */
const tokenCache = new Map<string, Para[]>()

/** A plain string split into words; undefined while the dictionary loads (or if it can't). */
export function useTokens(text: string): Para[] | undefined {
  const [tok, setTok] = useState<{ text: string; paras: Para[] }>()
  useEffect(() => {
    if (!text || tokenCache.has(text)) return
    let live = true
    tokenizeText(text).then(
      (paras) => {
        tokenCache.set(text, paras)
        if (live) setTok({ text, paras })
      },
      () => {},
    )
    return () => {
      live = false
    }
  }, [text])
  return tokenCache.get(text) ?? (tok?.text === text ? tok.paras : undefined)
}

/**
 * A plain string (a quiz question, an option, an answer) as Chinese you can press for pinyin and
 * meaning, like ZhText. Plain text until the dictionary has loaded.
 */
export function TapText({ text, id, source, glossary, ui = true, inline, className = '' }: { text: string } & Omit<Props, 'paras' | 'speaking'>) {
  const paras = useTokens(text)
  if (!paras) {
    const Plain = inline ? 'span' : 'div'
    return <Plain className={`zh ${ui ? 'zh-ui' : ''} ${className}`}>{text}</Plain>
  }
  return <ZhText id={id} paras={paras} glossary={glossary} source={source} ui={ui} inline={inline} className={className} />
}
