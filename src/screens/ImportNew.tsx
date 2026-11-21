import { useState } from 'react'
import { ClipboardTextIcon } from '@phosphor-icons/react'
import { db } from '../lib/db.ts'
import { countHan, tokenizeText } from '../lib/dict.ts'
import { go } from '../lib/router.ts'
import { Button, PageHeader } from '../components/ui.tsx'

export function ImportNew() {
  const [title, setTitle] = useState('')
  const [raw, setRaw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const chars = countHan(raw)

  async function paste() {
    try {
      setRaw(await navigator.clipboard.readText())
    } catch {
      setError('不能直接读剪贴板，请长按输入框粘贴。')
    }
  }

  async function save() {
    setBusy(true)
    setError(undefined)
    try {
      const paras = await tokenizeText(raw)
      const firstLine = raw.trim().split('\n')[0].slice(0, 24)
      const id = await db.imports.add({ title: title.trim() || firstLine, raw, paras, chars, created: Date.now() })
      go(`import/${id}`, true)
    } catch (e) {
      setError(`导入失败：${e instanceof Error ? e.message : e}`)
      setBusy(false)
    }
  }

  return (
    <div className="min-h-dvh">
      <PageHeader title="粘贴导入" fallback="shelf" close />
      <div className="mx-auto max-w-xl px-5 pb-10">
        <p className="text-[15px] font-bold text-mute">
          把网上看到的中文文章（知乎、新闻、百科……）粘贴到这里，就能像故事一样点词、查拼音、存生词。导入的内容只保存在这台设备上，不会上传。
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题（可以不填）"
          className="mt-5 h-12 w-full rounded-2xl border-2 border-line bg-sunken px-4 text-[17px] font-bold outline-none focus:border-lv"
        />
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="在这里粘贴中文……"
          className="mt-3 h-[45dvh] w-full resize-none rounded-2xl border-2 border-line bg-sunken p-4 font-book text-[18px] leading-relaxed outline-none focus:border-lv"
        />
        <div className="mt-2 flex items-center justify-between text-sm font-bold text-mute">
          <button onClick={paste} className="flex items-center gap-1 text-lv">
            <ClipboardTextIcon size={18} weight="fill" /> 从剪贴板粘贴
          </button>
          <span>{chars.toLocaleString()}字</span>
        </div>
        {error && <p className="mt-3 font-bold text-zhu">{error}</p>}
        <Button tone="lv" className="mt-6 w-full" disabled={chars < 5 || busy} onClick={save}>
          {busy ? '正在分词，第一次会慢一点…' : '导入'}
        </Button>
      </div>
    </div>
  )
}
