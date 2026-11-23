import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRightIcon,
  ArrowSquareOutIcon,
  CardsIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  NotePencilIcon,
  PaperPlaneRightIcon,
  PencilSimpleIcon,
  PlusIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { db, type WordSource } from '../lib/db.ts'
import { useLiveQuery } from '../lib/live.ts'
import { tokenizeText } from '../lib/dict.ts'
import { askAboutEgg, cachedEggExpansion, describeError, expandEgg, NoKeyError, type ChatMsg } from '../lib/ai.ts'
import {
  addEggCard,
  addEggCards,
  addMyEgg,
  deleteEgg,
  editEgg,
  eggLabel,
  eggRoute,
  isHometown,
  mergeEggs,
  removeEggCard,
  resetEgg,
  saveEggFind,
  saveEggNote,
  searchLinks,
  type EggView,
} from '../lib/eggs.ts'
import { CITIES } from '../lib/cities.ts'
import { go } from '../lib/router.ts'
import type { Egg, Para, Place } from '../lib/types.ts'
import { Button } from './ui.tsx'
import { ZhText } from './ZhText.tsx'

/** One page's 聊天彩蛋: the page itself first, then related pages (its province, its cities…). */
export interface EggGroup {
  /** place/<id>, city/<id>, or hometown/<id> (a province's 家乡话) */
  page: string
  title: string
  eggs: Egg[]
  glossary: Record<string, string>
}

/** Place name → its page, to link the places an egg mentions. */
export type PlaceLinks = Map<string, string>

export function placeLinks(places: Place[]): PlaceLinks {
  const m: PlaceLinks = new Map()
  for (const c of CITIES) if (c.kind !== 'muni' && [...c.name].length >= 2) m.set(c.name, `city/${c.id}`)
  for (const p of places) m.set(p.name, `place/${p.id}`)
  return m
}

/** The user's egg notes, live. Small table, read whole (see db.ts on iPhone cursors). */
export function useEggRows() {
  return useLiveQuery(() => db.eggs.toArray(), [], [])
}

/** How many eggs a page shows: the content's plus the user's own. */
export function useEggCount(page: string, content: number) {
  const rows = useEggRows()
  return content + rows.filter((r) => r.page === page && r.mine).length
}

/**
 * 聊天彩蛋 for a page, with tabs for the related pages' eggs. Each egg has a question (its
 * flashcard), can be edited, looked into (AI, search, notes), and the user can add their own.
 */
export function EggSection({ groups, links }: { groups: EggGroup[]; links: PlaceLinks }) {
  const rows = useEggRows()
  const here = groups[0]
  const views = useMemo(() => groups.map((g) => ({ g, eggs: mergeEggs(g.page, g.title, g.eggs, rows) })), [groups, rows])
  const shown = views.filter((v, i) => i === 0 || v.eggs.length > 0)
  const [sel, setSel] = useState(here.page)
  const cur = shown.find((v) => v.g.page === sel) ?? shown[0]
  const other = cur.g.page !== here.page

  return (
    <div>
      <p className="mb-3 px-1 text-[13px] leading-snug font-bold text-mute">
        彩蛋就是藏起来的小惊喜。聊天时说出一个，对方会觉得：你连这个都知道！每个都有一个问题，可以加入复习。
      </p>
      {shown.length > 1 && (
        <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4">
          {shown.map(({ g, eggs }) => {
            const on = g.page === cur.g.page
            return (
              <button
                key={g.page}
                onClick={() => setSel(g.page)}
                className={`flex h-9 shrink-0 items-center gap-1 rounded-xl border-2 px-3 text-sm font-extrabold ${on ? 'border-text bg-text text-bg' : 'border-line bg-surface'}`}
              >
                {g.title}
                <span className="font-bold opacity-60">{eggs.length}</span>
              </button>
            )
          })}
        </div>
      )}
      {other && (
        <button onClick={() => go(eggRoute(cur.g.page))} className="mb-3 flex w-full items-center gap-2 rounded-2xl bg-sunken px-4 py-2.5 text-left text-[15px] font-extrabold">
          <span className="min-w-0 flex-1">{cur.g.title}的聊天彩蛋</span>
          <span className="flex items-center gap-1 text-sm text-lv">
            去{cur.g.title} <ArrowRightIcon size={14} weight="bold" />
          </span>
        </button>
      )}
      <EggList key={cur.g.page} group={cur.g} eggs={cur.eggs} links={links} here={here.page} />
    </div>
  )
}

/**
 * One page's eggs (a page's 聊天彩蛋, or a province's 家乡话) with buttons to write your own and to
 * put them all into review. `eggs` are the group's eggs merged with the user's (mergeEggs).
 */
export function EggList({ group, eggs, links, here }: { group: EggGroup; eggs: EggView[]; links?: PlaceLinks; here?: string }) {
  const [adding, setAdding] = useState(false)
  const notCards = eggs.filter((e) => !e.card)
  const hometown = isHometown(group.page)
  return (
    <>
      {eggs.length === 0 && !adding && (
        <p className="tile p-4 text-[15px] font-bold text-mute">
          {hometown
            ? `还没有${group.title}的家乡话。听${group.title}朋友说过哪句？写下来吧。`
            : `${group.title}还没有聊天彩蛋。你知道什么好玩的事吗？写一个吧。`}
        </p>
      )}
      <div className="space-y-3">
        {eggs.map((e) => (
          <EggCard key={e.key} egg={e} glossary={group.glossary} links={links} here={here} />
        ))}
      </div>
      {adding ? (
        <AddEgg page={group.page} title={group.title} onDone={() => setAdding(false)} />
      ) : (
        <div className="mt-3 flex gap-2">
          <Button tone="plain" size="md" className="min-w-0 flex-1 !px-2" onClick={() => setAdding(true)}>
            <PlusIcon size={18} weight="bold" /> {hometown ? '写一句我听到的' : '写一个我的彩蛋'}
          </Button>
          {notCards.length > 1 && (
            <Button tone="plain" size="md" className="min-w-0 flex-1 !px-2" onClick={() => addEggCards(notCards)}>
              <CardsIcon size={18} weight="fill" className="text-lv" /> 全部加入复习
            </Button>
          )}
        </div>
      )}
    </>
  )
}

/** Tokenized text for an egg: the content's, or the user's version tokenized here. */
function useEggParas(egg: EggView): Para[] | undefined {
  const [tok, setTok] = useState<{ text: string; paras: Para[] }>()
  useEffect(() => {
    if (egg.sentences) return
    let live = true
    tokenizeText(egg.text).then(
      (paras) => live && setTok({ text: egg.text, paras }),
      () => {},
    )
    return () => {
      live = false
    }
  }, [egg.text, egg.sentences])
  if (egg.sentences) return [{ kind: 'p', sentences: egg.sentences }]
  return tok?.text === egg.text ? tok.paras : undefined
}

type Mode = 'dig' | 'edit' | undefined

/** One egg: question, the egg, the places it mentions, and what you can do with it. */
export function EggCard({ egg, glossary, links, here }: { egg: EggView; glossary?: Record<string, string>; links?: PlaceLinks; here?: string }) {
  const [mode, setMode] = useState<Mode>()
  const paras = useEggParas(egg)
  const source: WordSource = { kind: 'place', route: eggRoute(egg.page), title: `${egg.title} · ${eggLabel(egg.page)}` }
  const related = useMemo(() => {
    if (!links || !paras) return []
    const seen = new Map<string, string>()
    for (const p of paras)
      for (const s of p.sentences)
        for (const t of s.tokens) {
          // a [[link]] in the content (百科 pages too), or a place named in the text
          const route = t.k ?? links.get(t.t)
          if (route && route !== eggRoute(egg.page) && route !== here && !seen.has(route)) seen.set(route, t.t)
        }
    return [...seen].map(([route, name]) => ({ route, name }))
  }, [paras, links, egg.page, here])
  const toggle = (m: Mode) => setMode((cur) => (cur === m ? undefined : m))

  return (
    <div className="tile overflow-hidden">
      <div className="px-4 pt-3.5 pb-3">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 shrink-0 rounded-md bg-dai px-1.5 text-xs leading-5 font-black text-white">问</span>
          <span className="min-w-0 flex-1 text-[15px] leading-snug font-extrabold">{egg.q || '还没有问题：点“改”写一个'}</span>
          {egg.mine && <span className="shrink-0 rounded-md bg-huang/30 px-1.5 text-xs leading-5 font-extrabold text-huang-dark">我的</span>}
          {egg.edited && <span className="shrink-0 rounded-md bg-sunken px-1.5 text-xs leading-5 font-extrabold text-mute">改过</span>}
        </div>
        <div className="mt-2 text-[18px] leading-relaxed">
          {paras ? <ZhText id={`egg-${egg.key}`} paras={paras} glossary={glossary} source={source} /> : <p className="zh">{egg.text}</p>}
        </div>
        {egg.note && mode !== 'dig' && (
          <button onClick={() => setMode('dig')} className="mt-2 line-clamp-2 w-full rounded-xl bg-huang/15 px-3 py-2 text-left text-[14px] font-semibold">
            <span className="font-black text-huang-dark">笔记 · </span>
            {egg.note}
          </button>
        )}
        {related.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold text-mute">提到</span>
            {related.map((r) => (
              <button key={r.route} onClick={() => go(r.route)} className="flex h-7 items-center gap-0.5 rounded-full bg-sunken px-2.5 text-[13px] font-extrabold">
                {r.name} <ArrowRightIcon size={12} weight="bold" className="text-mute" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 border-t-2 border-line text-[13px] font-extrabold">
        <button
          onClick={() => (egg.card ? confirm('不再复习这个彩蛋了吗？') && removeEggCard(egg) : addEggCard(egg))}
          aria-pressed={egg.card}
          className={`flex h-11 items-center justify-center gap-1 ${egg.card ? 'text-lv' : 'text-text'}`}
        >
          {egg.card ? <CheckIcon size={16} weight="bold" /> : <CardsIcon size={16} weight="fill" className="text-lv" />}
          {egg.card ? '复习中' : '加入复习'}
        </button>
        <button onClick={() => toggle('dig')} aria-expanded={mode === 'dig'} className={`flex h-11 items-center justify-center gap-1 border-x-2 border-line ${mode === 'dig' ? 'bg-sunken' : ''}`}>
          <MagnifyingGlassIcon size={16} weight="bold" /> 深入
        </button>
        <button onClick={() => toggle('edit')} aria-expanded={mode === 'edit'} className={`flex h-11 items-center justify-center gap-1 ${mode === 'edit' ? 'bg-sunken' : ''}`}>
          <PencilSimpleIcon size={16} weight="bold" /> 改
        </button>
      </div>
      {mode === 'dig' && <Dig egg={egg} source={source} />}
      {mode === 'edit' && <EggEditor egg={egg} onDone={() => setMode(undefined)} />}
    </div>
  )
}

type Msg = ChatMsg & { paras?: Para[] }

/** 深入: ask AI to expand on it, look it up, and keep notes. */
function Dig({ egg, source }: { egg: EggView; source: WordSource }) {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<{ text: string; noKey: boolean }>()
  const [input, setInput] = useState('')
  const [find, setFind] = useState(egg.find)
  const [note, setNote] = useState(egg.note ?? '')
  const [saved, setSaved] = useState(false)
  const aiSource: WordSource = { ...source, kind: 'ai', title: `AI 展开 · ${egg.title}` }
  // what the AI is told the student is reading about
  const topic = isHometown(egg.page) ? `${egg.title}的方言和地方说法` : egg.title

  // An 展开 asked before shows straight away (it's kept on the device)
  useEffect(() => {
    let live = true
    cachedEggExpansion(topic, egg.text).then(async (answer) => {
      if (!answer || !live) return
      const paras = await tokenizeText(answer).catch(() => undefined)
      if (live) setMsgs((m) => (m.length ? m : [{ role: 'assistant', content: answer, paras }]))
    })
    return () => {
      live = false
    }
  }, [topic, egg.text])

  async function run(job: () => Promise<string>, history: Msg[]) {
    setBusy(true)
    setError(undefined)
    try {
      const answer = await job()
      const paras = await tokenizeText(answer).catch(() => undefined)
      setMsgs([...history, { role: 'assistant', content: answer, paras }])
    } catch (e) {
      setMsgs(history)
      setError({ text: describeError(e), noKey: e instanceof NoKeyError })
    } finally {
      setBusy(false)
    }
  }

  function followUp(q: string) {
    q = q.trim()
    if (!q || busy) return
    setInput('')
    const history: Msg[] = [...msgs, { role: 'user', content: q }]
    setMsgs(history)
    // the 展开 itself is the first assistant turn; the model sees it as context
    run(() => askAboutEgg(topic, egg.text, history.map(({ role, content }) => ({ role, content }))), history)
  }

  function keep(text: string) {
    const next = note.trim() ? `${note.trim()}\n\n${text}` : text
    setNote(next)
    saveEggNote(egg, next)
    flash()
  }

  const timer = useRef(0)
  function flash() {
    setSaved(true)
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setSaved(false), 1600)
  }

  return (
    <div className="space-y-4 border-t-2 border-line bg-sunken/60 p-4">
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-sm font-black text-dai">
          <SparkleIcon size={16} weight="fill" /> AI 展开
        </div>
        {msgs.length === 0 && !busy && (
          <Button tone="dai" size="md" className="w-full" onClick={() => run(() => expandEgg(topic, egg.text), [])}>
            <SparkleIcon size={18} weight="fill" /> 帮我展开讲讲
          </Button>
        )}
        <div className="space-y-2">
          {msgs.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-dai px-3.5 py-2 text-[15px] font-semibold text-white">
                {m.content}
              </div>
            ) : (
              <div key={i} className="rounded-2xl rounded-bl-md bg-surface px-3.5 py-3 text-[16px]">
                {m.paras ? <ZhText ui id={`egg-ai-${egg.key}-${i}`} paras={m.paras} source={aiSource} /> : <div className="whitespace-pre-wrap">{m.content}</div>}
                <button onClick={() => keep(m.content)} className="mt-2 flex items-center gap-1 text-xs font-extrabold text-huang-dark">
                  <NotePencilIcon size={14} weight="bold" /> 存进笔记
                </button>
              </div>
            ),
          )}
          {busy && <div className="w-fit rounded-2xl bg-surface px-3.5 py-2.5 text-mute">想一想…</div>}
          {error && (
            <div className="rounded-2xl bg-zhu-soft px-3.5 py-2.5 text-[14px] font-bold text-zhu-ink">
              {error.text}
              {error.noKey && (
                <button className="ml-2 underline" onClick={() => go('me')}>
                  去设置
                </button>
              )}
            </div>
          )}
        </div>
        {msgs.length > 0 && (
          <form
            className="mt-2 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              followUp(input)
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="追问…（中文或英文）"
              className="h-11 min-w-0 flex-1 rounded-xl border-2 border-line bg-surface px-3 text-[16px] outline-none focus:border-dai"
            />
            <Button tone="dai" size="md" className="!h-11 w-11 !px-0" aria-label="发送" disabled={!input.trim() || busy}>
              <PaperPlaneRightIcon size={18} weight="fill" />
            </Button>
          </form>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-sm font-black text-dai">
          <MagnifyingGlassIcon size={16} weight="bold" /> 自己查
        </div>
        {!!egg.sources?.length && (
          <ul className="mb-3 space-y-1.5">
            {egg.sources.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer" className="flex items-start gap-1.5 rounded-xl bg-surface px-3 py-2 text-[14px] leading-snug font-bold">
                  <span className="shrink-0 text-xs leading-5 font-black text-mute">来源</span>
                  <span className="min-w-0 flex-1">{l.title}</span>
                  <ArrowSquareOutIcon size={14} weight="bold" className="mt-0.5 shrink-0 text-mute" />
                </a>
              </li>
            ))}
          </ul>
        )}
        <input
          value={find}
          onChange={(e) => setFind(e.target.value)}
          onBlur={() => find !== egg.find && saveEggFind(egg, find)}
          aria-label="查什么"
          className="mb-2 h-11 w-full rounded-xl border-2 border-line bg-surface px-3 text-[16px] font-bold outline-none focus:border-dai"
        />
        <div className="flex flex-wrap gap-1.5">
          {searchLinks(find.trim() || egg.title, egg.q).map((l) => (
            <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="flex h-8 items-center gap-1 rounded-full border-2 border-line bg-surface px-3 text-[13px] font-extrabold">
              {l.label} <ArrowSquareOutIcon size={12} weight="bold" className="text-mute" />
            </a>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-1.5 text-sm font-black text-huang-dark">
          <NotePencilIcon size={16} weight="bold" /> 我的笔记
          {saved && <span className="font-bold text-lv">已保存</span>}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (note.trim() !== (egg.note ?? '')) {
              saveEggNote(egg, note)
              flash()
            }
          }}
          rows={3}
          placeholder="查到了什么？链接、你自己的话、朋友怎么说……复习的时候会看到。"
          className="w-full rounded-xl border-2 border-line bg-surface p-3 text-[16px] leading-relaxed outline-none focus:border-huang-dark"
        />
      </div>
    </div>
  )
}

const field = 'w-full rounded-xl border-2 border-line bg-surface px-3 text-[16px] outline-none focus:border-dai'

/** Change the egg's words or its question; put a content egg back as it was; delete your own. */
function EggEditor({ egg, onDone }: { egg: EggView; onDone: () => void }) {
  const [text, setText] = useState(egg.text)
  const [q, setQ] = useState(egg.q)
  return (
    <div className="space-y-2 border-t-2 border-line bg-sunken/60 p-4">
      <label className="block text-sm font-black text-mute">
        彩蛋
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className={`${field} mt-1 py-2 leading-relaxed font-normal text-text`} />
      </label>
      <label className="block text-sm font-black text-mute">
        问题（复习时先看到这个）
        <input value={q} onChange={(e) => setQ(e.target.value)} className={`${field} mt-1 h-11 font-bold text-text`} />
      </label>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          tone="lv"
          size="md"
          disabled={!text.trim()}
          onClick={async () => {
            await editEgg(egg, text, q)
            onDone()
          }}
        >
          保存
        </Button>
        <Button tone="plain" size="md" onClick={onDone}>
          取消
        </Button>
        {egg.edited && (
          <Button
            tone="plain"
            size="md"
            onClick={async () => {
              await resetEgg(egg)
              onDone()
            }}
          >
            还原
          </Button>
        )}
        {egg.mine && (
          <Button tone="plain" size="md" className="ml-auto !text-zhu" onClick={() => confirm('删掉这个彩蛋？') && deleteEgg(egg.key)}>
            删除
          </Button>
        )}
      </div>
    </div>
  )
}

/** A 聊天彩蛋 of the user's own. */
function AddEgg({ page, title, onDone }: { page: string; title: string; onDone: () => void }) {
  const [text, setText] = useState('')
  const [q, setQ] = useState('')
  const [note, setNote] = useState('')
  const [card, setCard] = useState(true)
  const hometown = isHometown(page)
  // the first “quoted” words are usually the saying itself
  const said = text.match(/[“"「]([^”"」]{1,14})[”"」]/)?.[1]
  const defaultQ = hometown ? (said ? `${title}话“${said}”是什么意思？` : `${title}人说的这句话是什么意思？`) : `关于${title}，这个彩蛋说的是什么？`
  return (
    <div className="tile mt-3 space-y-2 p-4">
      <div className="text-[16px] font-extrabold">{hometown ? `写一句${title}话` : `写一个${title}的彩蛋`}</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        autoFocus
        placeholder={
          hometown
            ? '这句话怎么说，什么意思，什么时候说，在哪儿听到的……比如：“得劲”就是“舒服、好”。'
            : '你听说的、读到的、朋友告诉你的……用中文写。'
        }
        className={`${field} py-2 leading-relaxed`}
      />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={hometown ? `复习时的问题，不写就是：${defaultQ}` : '复习时问自己的问题，比如：为什么……？'} className={`${field} h-11`} />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="笔记或者链接（可以不写）" className={`${field} py-2`} />
      <label className="flex items-center gap-2 py-1 text-[15px] font-bold">
        <input type="checkbox" checked={card} onChange={(e) => setCard(e.target.checked)} className="size-5 accent-[var(--color-lv)]" />
        加入复习
      </label>
      <div className="flex gap-2">
        <Button
          tone="lv"
          size="md"
          className="flex-1"
          disabled={!text.trim()}
          onClick={async () => {
            await addMyEgg(page, title, text, q.trim() || defaultQ, note, card)
            onDone()
          }}
        >
          保存
        </Button>
        <Button tone="plain" size="md" onClick={onDone}>
          取消
        </Button>
      </div>
    </div>
  )
}
