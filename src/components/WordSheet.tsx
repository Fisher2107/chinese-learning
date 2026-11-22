import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Drawer } from 'vaul'
import { useLiveQuery } from '../lib/live.ts'
import {
  ArrowLeftIcon,
  BookOpenTextIcon,
  ChatCircleDotsIcon,
  CheckIcon,
  LightbulbIcon,
  PaperPlaneRightIcon,
  SpeakerHighIcon,
  StarIcon,
  TranslateIcon,
} from '@phosphor-icons/react'
import { db } from '../lib/db.ts'
import type { Para } from '../lib/types.ts'
import { lookupGloss, tokenizeText } from '../lib/dict.ts'
import { saveWord, unsaveWord } from '../lib/srs.ts'
import { speak } from '../lib/speech.ts'
import { askAboutWord, describeError, explainSentence, NoKeyError, translateSentence, type ChatMsg } from '../lib/ai.ts'
import { go } from '../lib/router.ts'
import { Button, Pill } from './ui.tsx'
import { ZhText } from './ZhText.tsx'
import { sentenceText, WordSheetContext, type WordTarget } from './word-context.ts'

type View = { kind: 'word'; target: WordTarget } | { kind: 'chat'; target: WordTarget }

export function WordSheetProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<View[]>([])
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  openRef.current = open

  const show = useCallback((target: WordTarget) => {
    setStack((s) => (openRef.current ? [...s, { kind: 'word', target }] : [{ kind: 'word', target }]))
    setOpen(true)
  }, [])
  const push = (v: View) => setStack((s) => [...s, v])
  const pop = () => setStack((s) => s.slice(0, -1))
  const close = () => setOpen(false)

  // the peek bubble: shown while a word is pressed, gone shortly after
  const [peeked, setPeeked] = useState<{ target: WordTarget; rect: DOMRect }>()
  const peekTimer = useRef(0)
  const peek = useCallback((target: WordTarget, rect: DOMRect) => {
    clearTimeout(peekTimer.current)
    setPeeked({ target, rect })
  }, [])
  const unpeek = useCallback((afterMs = 0) => {
    clearTimeout(peekTimer.current)
    if (afterMs <= 0) setPeeked(undefined)
    else peekTimer.current = window.setTimeout(() => setPeeked(undefined), afterMs)
  }, [])
  useEffect(() => {
    // scrolling moves the word away from its bubble
    const hide = () => unpeek()
    window.addEventListener('scroll', hide, { passive: true, capture: true })
    return () => window.removeEventListener('scroll', hide, { capture: true })
  }, [unpeek])

  const top = stack.at(-1)
  const active = open && top ? top.target.key : peeked?.target.key
  const api = useMemo(() => ({ open: show, active, peek, unpeek }), [show, active, peek, unpeek])

  return (
    <WordSheetContext.Provider value={api}>
      {children}
      {peeked && !open && (
        <PeekBubble
          key={peeked.target.key}
          target={peeked.target}
          rect={peeked.rect}
          onOpen={() => {
            unpeek()
            show(peeked.target)
          }}
        />
      )}
      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/35" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[90dvh] max-w-xl flex-col rounded-t-[28px] bg-surface shadow-2xl outline-none">
            <div className="mx-auto mt-3 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-line" />
            <Drawer.Title className="sr-only">词卡</Drawer.Title>
            <Drawer.Description className="sr-only">这个词的拼音、意思和例句</Drawer.Description>
            {top?.kind === 'word' && (
              <WordView
                key={stack.length}
                target={top.target}
                canBack={stack.length > 1}
                onBack={pop}
                onChat={() => push({ kind: 'chat', target: top.target })}
              />
            )}
            {top?.kind === 'chat' && <ChatView key={stack.length} target={top.target} onBack={pop} onClose={close} />}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </WordSheetContext.Provider>
  )
}

/**
 * The little card above a pressed word: pinyin and meaning, nothing to dismiss. It goes away by
 * itself; tapping it opens the full word card (save, ask AI).
 */
function PeekBubble({ target, rect, onOpen }: { target: WordTarget; rect: DOMRect; onOpen: () => void }) {
  const { token } = target
  const [gloss, setGloss] = useState(target.gloss)
  const ref = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number }>()
  useEffect(() => {
    if (!target.gloss && token.p) lookupGloss(token.t, token.p).then(setGloss, () => setGloss(''))
  }, [target, token])
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    const left = Math.min(Math.max(rect.left + rect.width / 2 - w / 2, 8), window.innerWidth - w - 8)
    const above = rect.top - h - 10
    setPos({ left, top: above > 8 ? above : rect.bottom + 10 })
  }, [rect, gloss])
  const short = gloss?.split(/;\s*/).slice(0, 3).join('; ')
  return (
    <button
      ref={ref}
      onClick={onOpen}
      aria-label={`${token.t} ${token.p ?? ''}，打开词卡`}
      className="peek fixed z-[60] max-w-[min(20rem,calc(100vw-16px))] rounded-2xl bg-dai-dark px-3.5 py-2.5 text-left text-white shadow-[0_6px_24px_rgba(0,0,0,0.25)]"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}
    >
      <div className="flex items-baseline gap-2">
        <span className="font-book text-[22px] leading-none">{token.t}</span>
        <span className="text-[17px] font-extrabold text-huang">{token.p}</span>
        {token.l ? <span className="text-[11px] font-black opacity-70">HSK{token.l === 7 ? '7+' : token.l}</span> : null}
      </div>
      <div className="mt-1 text-[14px] leading-snug font-bold opacity-95">{short ?? '…'}</div>
      {token.k && (
        <div className="mt-1.5 flex items-center gap-1 text-[12px] font-black text-huang">
          <BookOpenTextIcon size={14} weight="fill" /> 轻点这个词，打开百科页
        </div>
      )}
    </button>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-2 -ml-1 flex items-center gap-1 text-sm font-extrabold text-mute">
      <ArrowLeftIcon size={16} weight="bold" /> 返回
    </button>
  )
}

function Chip({ onClick, children, on }: { onClick: () => void; children: ReactNode; on?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-xl border-2 px-3 text-sm font-extrabold ${
        on ? 'border-dai bg-dai text-white' : 'border-line bg-surface text-text'
      }`}
    >
      {children}
    </button>
  )
}

type Extra = { kind: 'explain' | 'translate'; loading: boolean; text?: string; paras?: Para[]; error?: string; noKey?: boolean }

function WordView({ target, canBack, onBack, onChat }: { target: WordTarget; canBack: boolean; onBack: () => void; onChat: () => void }) {
  const { token, sentence, source } = target
  const [gloss, setGloss] = useState(target.gloss)
  const [extra, setExtra] = useState<Extra>()
  const saved = useLiveQuery(() => db.words.where('word').equals(token.t).first(), [token.t])
  const text = sentenceText(sentence)

  useEffect(() => {
    if (!target.gloss && token.p) lookupGloss(token.t, token.p).then(setGloss, () => setGloss('（查不到）'))
  }, [target, token])

  async function toggleSave() {
    if (saved) return unsaveWord(token.t)
    await saveWord({ word: token.t, p: token.p ?? '', d: gloss ?? '', sentence, source })
  }

  async function runExtra(kind: Extra['kind']) {
    if (extra?.kind === kind && !extra.error) return setExtra(undefined)
    setExtra({ kind, loading: true })
    try {
      if (kind === 'translate') setExtra({ kind, loading: false, text: await translateSentence(text) })
      else {
        const answer = await explainSentence(text)
        setExtra({ kind, loading: false, text: answer, paras: await tokenizeText(answer).catch(() => undefined) })
      }
    } catch (e) {
      setExtra({ kind, loading: false, error: describeError(e), noKey: e instanceof NoKeyError })
    }
  }

  return (
    <div className="overflow-y-auto px-5 pt-3 pb-8 safe-bottom">
      {canBack && <BackLink onClick={onBack} />}
      <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
        <div className="font-book text-[46px] leading-none">{token.t}</div>
        <div className="pb-1 text-xl font-extrabold text-zhu">{token.p}</div>
        <button aria-label="朗读" onClick={() => speak(token.t, 0.8)} className="mb-0.5 grid size-9 place-items-center rounded-xl bg-sunken text-dai">
          <SpeakerHighIcon size={20} weight="fill" />
        </button>
        {token.l ? <Pill color={token.l > 5 ? 'var(--color-zhu)' : 'var(--color-lv)'}>HSK {token.l === 7 ? '7–9' : token.l}</Pill> : null}
      </div>
      <p className="mt-3 min-h-6 text-[15px] leading-relaxed text-text">{gloss ?? '…'}</p>

      <div className="mt-4 rounded-2xl bg-sunken p-4">
        <div className="mb-1 truncate text-xs font-extrabold text-mute">本句 · {source.title}</div>
        <div className="font-book text-[19px] leading-relaxed">
          {sentence.map((t, i) =>
            t === token ? (
              <mark key={i} className="rounded bg-hl px-0.5 text-inherit">
                {t.t}
              </mark>
            ) : (
              <span key={i}>{t.t}</span>
            ),
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip onClick={() => speak(text)}>
            <SpeakerHighIcon size={16} weight="fill" /> 朗读
          </Chip>
          <Chip on={extra?.kind === 'explain'} onClick={() => runExtra('explain')}>
            <LightbulbIcon size={16} weight="fill" /> 解释
          </Chip>
          <Chip on={extra?.kind === 'translate'} onClick={() => runExtra('translate')}>
            <TranslateIcon size={16} weight="bold" /> 翻译
          </Chip>
        </div>
        {extra && (
          <div className="mt-3 rounded-xl bg-surface p-3 text-[15px] leading-relaxed">
            {extra.loading && <span className="text-mute">想一想…</span>}
            {extra.error && (
              <div className="text-zhu">
                {extra.error}
                {extra.noKey && (
                  <button className="ml-2 font-extrabold underline" onClick={() => go('me')}>
                    去设置
                  </button>
                )}
              </div>
            )}
            {!extra.loading && !extra.error && extra.paras && (
              <ZhText ui id={`explain-${target.key}`} paras={extra.paras} source={{ ...source, kind: 'ai', title: `AI 解释 · ${source.title}` }} />
            )}
            {!extra.loading && !extra.error && !extra.paras && extra.text}
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button tone={saved ? 'plain' : 'zhu'} onClick={toggleSave}>
          {saved ? <CheckIcon size={20} weight="bold" /> : <StarIcon size={20} weight="fill" />}
          {saved ? '已加入' : '加入生词本'}
        </Button>
        <Button tone="dai" onClick={onChat}>
          <ChatCircleDotsIcon size={20} weight="fill" /> 问AI
        </Button>
      </div>
    </div>
  )
}

const QUICK = ['这里是什么意思？', '怎么用？给我几个例句', '有没有相关的成语或者俗语？', '和意思差不多的词有什么区别？']

type Msg = ChatMsg & { paras?: Para[] }

function ChatView({ target, onBack, onClose }: { target: WordTarget; onBack: () => void; onClose: () => void }) {
  const { token, sentence, source } = target
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ text: string; noKey: boolean }>()
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [msgs, busy])

  async function send(q: string) {
    q = q.trim()
    if (!q || busy) return
    const history: Msg[] = [...msgs, { role: 'user', content: q }]
    setMsgs(history)
    setInput('')
    setError(undefined)
    setBusy(true)
    try {
      const answer = await askAboutWord(token.t, token.p ?? '', sentenceText(sentence), history.map(({ role, content }) => ({ role, content })))
      const paras = await tokenizeText(answer).catch(() => undefined)
      setMsgs((h) => [...h, { role: 'assistant', content: answer, paras }])
    } catch (e) {
      setError({ text: describeError(e), noKey: e instanceof NoKeyError })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[60dvh] flex-col overflow-hidden">
      <div className="px-5 pt-3">
        <BackLink onClick={onBack} />
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold">问AI</span>
          <span className="font-book text-2xl">{token.t}</span>
          <span className="font-bold text-mute">{token.p}</span>
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {QUICK.map((q) => (
              <button key={q} onClick={() => send(q)} className="tile px-3.5 py-2.5 text-left text-[15px] font-bold">
                {q}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-dai px-4 py-2.5 text-[15px] font-semibold text-white">
              {m.content}
            </div>
          ) : (
            <div key={i} className="w-fit max-w-[92%] rounded-2xl rounded-bl-md bg-sunken px-4 py-3 text-[16px]">
              {m.paras ? (
                <ZhText ui id={`chat-${target.key}-${i}`} paras={m.paras} source={{ ...source, kind: 'ai', title: `问AI · ${token.t}` }} />
              ) : (
                <div className="whitespace-pre-wrap">{m.content}</div>
              )}
            </div>
          ),
        )}
        {busy && <div className="w-fit rounded-2xl bg-sunken px-4 py-3 text-mute">想一想…</div>}
        {error && (
          <div className="rounded-2xl bg-zhu-soft px-4 py-3 text-[15px] font-bold text-zhu-ink">
            {error.text}
            {error.noKey && (
              <button
                className="ml-2 underline"
                onClick={() => {
                  onClose()
                  go('me')
                }}
              >
                去设置
              </button>
            )}
          </div>
        )}
        <div ref={end} />
      </div>
      <form
        className="flex gap-2 border-t-2 border-line px-4 pt-3 pb-4 safe-bottom"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="用中文或英文问…"
          className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-line bg-sunken px-4 text-[16px] outline-none focus:border-dai"
        />
        <Button tone="dai" size="md" className="!h-12 w-12 !px-0" aria-label="发送" disabled={!input.trim() || busy}>
          <PaperPlaneRightIcon size={20} weight="fill" />
        </Button>
      </form>
    </div>
  )
}
