import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from '../lib/live.ts'
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, TrashIcon } from '@phosphor-icons/react'
import { db } from '../lib/db.ts'
import { loadText, useLoad } from '../lib/content.ts'
import { go } from '../lib/router.ts'
import { FONT_PX, useSettings } from '../lib/settings.ts'
import { saveTextPlace } from '../lib/progress.ts'
import type { Para } from '../lib/types.ts'
import { Button, Loading, PageHeader, ProgressBar } from '../components/ui.tsx'
import { ZhText } from '../components/ZhText.tsx'
import { OldTips } from '../components/OldTips.tsx'
import { sentenceText } from '../components/word-context.ts'

const countHan = (paras: Para[]) =>
  paras.reduce((a, p) => a + p.sentences.reduce((b, s) => b + (sentenceText(s.tokens).match(/[㐀-鿿]/g)?.length ?? 0), 0), 0)

interface Props {
  /** progress key, e.g. "bai-niangzi" or "import:3" */
  progressId: string
  route: string
  title: string
  byline: string
  parts: Para[][]
  glossary?: Record<string, string>
  sitting: number
  old?: boolean
  license?: string
  sourceUrl?: string
  onDelete?: () => void
}

/** A long text read in sittings, with progress saved. Used for full texts and imports. */
function SittingReader({ progressId, route, title, byline, parts, glossary, sitting, old, license, sourceUrl, onDelete }: Props) {
  const settings = useSettings()
  const [tips, setTips] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const i = Math.min(Math.max(0, sitting), parts.length - 1)
  const paras = parts[i]
  const chars = useMemo(() => countHan(paras), [paras])

  useEffect(() => {
    saveTextPlace(progressId, i)
    window.scrollTo(0, 0)
  }, [progressId, i])

  async function finish() {
    await saveTextPlace(progressId, Math.min(i + 1, parts.length - 1), i, chars)
    if (i + 1 < parts.length) go(`${route}/${i + 2}`, true)
    else go('shelf')
  }

  return (
    <div className="min-h-dvh bg-paper text-paper-text">
      <PageHeader
        title={title}
        fallback="shelf"
        right={
          onDelete && (
            <button
              aria-label="删除"
              onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
              className={`flex h-10 items-center gap-1 rounded-xl px-2 text-sm font-extrabold ${confirmDelete ? 'bg-zhu text-white' : 'text-mute'}`}
            >
              <TrashIcon size={20} weight="bold" /> {confirmDelete && '确定删除？'}
            </button>
          )
        }
      />
      <article className="mx-auto max-w-xl px-5 pb-24" style={{ fontSize: FONT_PX[settings.fontSize] }}>
        <div className="font-ui text-sm font-bold text-mute">{byline}</div>
        {parts.length > 1 && (
          <div className="mt-3 flex items-center gap-3 font-ui">
            <ProgressBar value={(i + 1) / parts.length} className="h-3 flex-1" />
            <span className="text-xs font-extrabold text-mute">
              第{i + 1}/{parts.length}部分 · {chars}字
            </span>
          </div>
        )}
        {old && (
          <div className="mt-3 font-ui">
            <button className="text-sm font-extrabold text-dai" onClick={() => setTips(!tips)}>
              {tips ? '收起古白话小贴士' : '这是古白话，看看小贴士'}
            </button>
            {tips && <OldTips />}
          </div>
        )}
        <div className="mt-6">
          <ZhText id={`${progressId}-${i}`} paras={paras} glossary={glossary} source={{ kind: progressId.startsWith('import:') ? 'import' : 'text', route: `${route}/${i + 1}`, title }} />
        </div>

        <div className="mt-10 flex items-center gap-3 font-ui">
          {i > 0 && (
            <Button tone="plain" size="md" onClick={() => go(`${route}/${i}`, true)} aria-label="上一部分">
              <ArrowLeftIcon size={20} weight="bold" />
            </Button>
          )}
          <Button tone="lv" className="flex-1" onClick={finish}>
            {i + 1 < parts.length ? (
              <>
                读完了，下一部分 <ArrowRightIcon size={20} weight="bold" />
              </>
            ) : (
              <>
                <CheckCircleIcon size={22} weight="fill" /> 全部读完了
              </>
            )}
          </Button>
        </div>
        {(license || sourceUrl) && (
          <p className="mt-8 font-ui text-xs font-bold text-mute">
            {license === 'public-domain' ? '公有领域作品，' : ''}
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline">
                来源
              </a>
            )}
          </p>
        )}
      </article>
    </div>
  )
}

export function TextReader({ id, sitting }: { id: string; sitting: number }) {
  const { data: text, error } = useLoad(() => loadText(id), `text:${id}`)
  if (error) return <div className="p-8 text-center font-bold text-mute">找不到这篇文章。</div>
  if (!text) return <Loading />
  return (
    <SittingReader
      progressId={id}
      route={`text/${id}`}
      title={text.title}
      byline={`${text.author} · ${text.year} · ${text.from}`}
      parts={text.parts}
      glossary={text.glossary}
      sitting={sitting}
      old={text.year < 1900}
      license={text.license}
      sourceUrl={text.source}
    />
  )
}

const SITTING = 1800

/** Splits an import into sittings of about 1,800 characters, at paragraph breaks. */
function splitParts(paras: Para[]): Para[][] {
  const parts: Para[][] = [[]]
  let n = 0
  for (const p of paras) {
    const c = countHan([p])
    if (n > 0 && n + c > SITTING) {
      parts.push([])
      n = 0
    }
    parts.at(-1)!.push(p)
    n += c
  }
  return parts
}

export function ImportReader({ id, sitting }: { id: number; sitting: number }) {
  const doc = useLiveQuery(() => db.imports.get(id), [id])
  const parts = useMemo(() => (doc ? splitParts(doc.paras) : []), [doc])
  if (doc === undefined) return <Loading />
  if (!doc) return <div className="p-8 text-center font-bold text-mute">这篇导入已经删除了。</div>
  return (
    <SittingReader
      progressId={`import:${id}`}
      route={`import/${id}`}
      title={doc.title}
      byline={`我的导入 · ${doc.chars.toLocaleString()}字 · 只保存在这台设备上`}
      parts={parts}
      sitting={sitting}
      onDelete={async () => {
        await db.imports.delete(id)
        await db.texts.delete(`import:${id}`)
        go('shelf', true)
      }}
    />
  )
}
