import { useRef, useState, type ReactNode } from 'react'
import { BookOpenTextIcon, CaretRightIcon, CardsIcon, CoinsIcon, DownloadSimpleIcon, FireIcon, KeyIcon, PlantIcon, UploadSimpleIcon } from '@phosphor-icons/react'
import { db } from '../lib/db.ts'
import { describeError, testKey } from '../lib/ai.ts'
import { saveSetting, useSettings, type FontSize } from '../lib/settings.ts'
import { useStats } from '../lib/stats.ts'
import { reviveCard } from '../lib/srs.ts'
import { Button, Section } from '../components/ui.tsx'
import { go } from '../lib/router.ts'
import { builtLabel, checkForUpdate } from '../lib/update.ts'

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="grid rounded-2xl bg-sunken p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map(([v, label]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`h-10 rounded-xl text-[15px] font-extrabold transition-colors ${value === v ? 'bg-surface text-dai shadow-[0_2px_0_var(--line)]' : 'text-mute'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function Row({ title, hint, children }: { title: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="p-4">
      <div className="text-[16px] font-extrabold">{title}</div>
      {hint && <div className="mt-0.5 mb-3 text-sm font-semibold text-mute">{hint}</div>}
      {children}
    </div>
  )
}

const TABLES = ['words', 'reviews', 'series', 'texts', 'imports', 'known', 'ai', 'places', 'feed', 'days', 'cities'] as const

export function Me() {
  const stats = useStats()
  const settings = useSettings()
  const [key, setKey] = useState<string>()
  const [keyStatus, setKeyStatus] = useState<{ ok: boolean; text: string }>()
  const [backupMsg, setBackupMsg] = useState<string>()
  const [updateMsg, setUpdateMsg] = useState<string>()

  async function update() {
    setUpdateMsg('正在检查…')
    const r = await checkForUpdate()
    if (r === 'offline') setUpdateMsg('连不上网，有网的时候再试。')
    else if (r === 'latest') setUpdateMsg('已经是最新版了。')
    else {
      setUpdateMsg('有新版本！正在下载，好了会自动重新打开。')
      // in case the phone doesn't reopen it by itself
      setTimeout(() => location.reload(), 8000)
    }
  }
  const file = useRef<HTMLInputElement>(null)
  const keyValue = key ?? settings.apiKey

  async function saveKey() {
    await saveSetting('apiKey', keyValue.trim())
    setKey(undefined)
    setKeyStatus({ ok: true, text: '已保存。' })
  }

  async function test() {
    if (key !== undefined) await saveKey()
    setKeyStatus({ ok: true, text: '正在连接…' })
    try {
      const r = await testKey()
      setKeyStatus({ ok: true, text: r.includes('连接成功') ? '连接成功！' : `连上了：${r}` })
    } catch (e) {
      setKeyStatus({ ok: false, text: describeError(e) })
    }
  }

  async function exportBackup() {
    const data: Record<string, unknown> = { app: 'zhongguotong', version: 1, exported: new Date().toISOString() }
    for (const t of TABLES) data[t] = await db.table(t).toArray()
    data.settings = (await db.settings.toArray()).filter((s) => s.key !== 'apiKey')
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `中国通-备份-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setBackupMsg('备份已导出。')
  }

  async function importBackup(f: File) {
    try {
      const data = JSON.parse(await f.text())
      if (data.app !== 'zhongguotong') throw new Error('这不是中国通的备份文件')
      await db.transaction('rw', [...TABLES.map((t) => db.table(t)), db.settings], async () => {
        for (const t of TABLES) {
          if (!Array.isArray(data[t])) continue
          const rows = t === 'words' ? data[t].map((w: { card: Record<string, unknown> }) => ({ ...w, card: reviveCard(w.card) })) : data[t]
          await db.table(t).bulkPut(rows)
        }
        if (Array.isArray(data.settings)) await db.settings.bulkPut(data.settings)
      })
      setBackupMsg(`恢复好了：${data.words?.length ?? 0} 个生词。`)
    } catch (e) {
      setBackupMsg(`恢复失败：${e instanceof Error ? e.message : e}`)
    }
  }

  const tiles = [
    { label: '连续天数', value: stats.streak, Icon: FireIcon, color: 'var(--color-zhu)' },
    { label: '铜钱', value: stats.coins, Icon: CoinsIcon, color: 'var(--color-huang-dark)' },
    { label: '生词', value: stats.words, Icon: CardsIcon, color: 'var(--color-dai)' },
    { label: '读了（字）', value: stats.chars.toLocaleString(), Icon: BookOpenTextIcon, color: 'var(--color-lv)' },
  ]

  return (
    <div className="mx-auto max-w-xl px-4 pb-10">
      <h1 className="safe-top pt-5 text-[28px] font-black">我的</h1>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="tile flex items-center gap-3 p-4">
            <t.Icon size={30} weight="fill" style={{ color: t.color }} />
            <div>
              <div className="text-xl font-black">{t.value}</div>
              <div className="text-xs font-extrabold text-mute">{t.label}</div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => go('words')} className="tile mt-3 flex w-full items-center gap-3 p-4 text-left">
        <PlantIcon size={30} weight="fill" className="shrink-0 text-lv" />
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-extrabold">生词花园</div>
          <div className="text-sm font-bold text-mute">{stats.due > 0 ? `${stats.due} 个词该浇水了` : '看看你的生词长多高了'}</div>
        </div>
        <CaretRightIcon size={20} weight="bold" className="text-mute" />
      </button>

      <Section title="设置">
        <div className="tile divide-y-2 divide-line">
          <Row title="OpenAI 密钥" hint="用来问AI、解释和翻译。密钥只保存在这台设备上，直接发给 OpenAI。">
            <div className="flex gap-2">
              <label className="flex h-12 min-w-0 flex-1 items-center gap-2 rounded-2xl border-2 border-line bg-sunken px-3 focus-within:border-dai">
                <KeyIcon size={18} weight="fill" className="shrink-0 text-mute" />
                <input
                  type="password"
                  autoComplete="off"
                  value={keyValue}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="sk-..."
                  className="min-w-0 flex-1 bg-transparent font-mono text-[15px] outline-none"
                />
              </label>
              {key !== undefined && key !== settings.apiKey && (
                <Button tone="dai" size="md" className="!h-12" onClick={saveKey}>
                  保存
                </Button>
              )}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Button tone="plain" size="sm" onClick={test} disabled={!keyValue}>
                测试连接
              </Button>
              {keyStatus && <span className={`text-sm font-bold ${keyStatus.ok ? 'text-lv' : 'text-zhu'}`}>{keyStatus.text}</span>}
            </div>
            <div className="mt-3 text-sm font-semibold text-mute">
              模型：
              <input
                value={settings.model}
                onChange={(e) => saveSetting('model', e.target.value)}
                className="w-40 rounded-lg bg-sunken px-2 py-1 font-mono text-[14px] text-text outline-none"
              />
            </div>
          </Row>
          <Row title="字号">
            <Segmented<FontSize>
              value={settings.fontSize}
              onChange={(v) => saveSetting('fontSize', v)}
              options={[
                ['s', '小'],
                ['m', '中'],
                ['l', '大'],
              ]}
            />
          </Row>
          <Row title="版本" hint={`这台设备上的版本：${builtLabel()}`}>
            <div className="flex items-center gap-3">
              <Button tone="plain" size="sm" onClick={update}>
                检查更新
              </Button>
              {updateMsg && <span className="text-sm font-bold text-mute">{updateMsg}</span>}
            </div>
          </Row>
        </div>
      </Section>

      <Section title="备份">
        <div className="tile p-4">
          <p className="text-sm font-semibold text-mute">生词、进度、笔记和导入都只存在这台设备上。换手机或者清理浏览器之前，先导出一份备份。（备份里不包括 OpenAI 密钥。）</p>
          <div className="mt-3 flex gap-2">
            <Button tone="plain" size="md" onClick={exportBackup}>
              <DownloadSimpleIcon size={18} weight="bold" /> 导出
            </Button>
            <Button tone="plain" size="md" onClick={() => file.current?.click()}>
              <UploadSimpleIcon size={18} weight="bold" /> 恢复
            </Button>
            <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
          </div>
          {backupMsg && <p className="mt-3 text-sm font-bold text-dai">{backupMsg}</p>}
        </div>
      </Section>

      <Section title="关于">
        <div className="tile space-y-2 p-4 text-sm font-semibold text-mute">
          <p>中国通：为了能和中国人好好聊天，学中国的地方、故事和诗。</p>
          <p>
            词典：
            <a className="text-dai underline" href="https://www.mdbg.net/chinese/dictionary?page=cc-cedict" target="_blank" rel="noreferrer">
              CC-CEDICT
            </a>
            （CC BY-SA 4.0）。HSK 词表：
            <a className="text-dai underline" href="https://github.com/drkameleon/complete-hsk-vocabulary" target="_blank" rel="noreferrer">
              complete-hsk-vocabulary
            </a>
            （MIT）。
          </p>
          <p>
            原文：
            <a className="text-dai underline" href="https://zh.wikisource.org" target="_blank" rel="noreferrer">
              维基文库
            </a>
            ，公有领域作品。故事和讲解是我们自己写的。
          </p>
          <p>字体：霞鹜文楷（SIL OFL）、Nunito（SIL OFL）。图标：Phosphor（MIT）。</p>
        </div>
      </Section>
    </div>
  )
}
