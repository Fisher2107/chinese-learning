import { useLiveQuery } from '../lib/live.ts'
import { BookOpenTextIcon, CaretRightIcon, ClipboardTextIcon, PlusIcon } from '@phosphor-icons/react'
import { db } from '../lib/db.ts'
import { loadIndex, useLoad } from '../lib/content.ts'
import { go } from '../lib/router.ts'
import { Loading, Pill, ProgressBar, Section } from '../components/ui.tsx'

export function Shelf() {
  const { data: index } = useLoad(loadIndex, 'index')
  const progress = useLiveQuery(() => db.series.toArray(), [], [])
  const texts = useLiveQuery(() => db.texts.toArray(), [], [])
  const imports = useLiveQuery(() => db.imports.orderBy('created').reverse().toArray(), [], [])
  if (!index) return <Loading />

  return (
    <div className="mx-auto max-w-xl px-4">
      <h1 className="safe-top pt-5 text-[28px] font-black">书架</h1>

      <Section title="系列">
        <div className="space-y-3">
          {index.series.map((s) => {
            const p = progress.find((x) => x.id === s.id)
            const done = p?.done.length ?? 0
            return (
              <button key={s.id} onClick={() => go(`series/${s.id}`)} className="tile flex w-full overflow-hidden text-left">
                <div className="w-2.5 shrink-0" style={{ background: s.color }} />
                <div className="min-w-0 flex-1 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    <Pill color={s.color}>{s.kind}</Pill>
                    <Pill>{s.place}</Pill>
                  </div>
                  <div className="mt-2 text-xl font-black">{s.title}</div>
                  <div className="text-[15px] font-bold text-mute">{s.subtitle}</div>
                  <div className="mt-3 flex items-center gap-3">
                    <ProgressBar value={done / s.episodes.length} color={s.color} className="h-3 flex-1" />
                    <span className="text-xs font-extrabold text-mute">
                      {done}/{s.episodes.length} 集
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="原文">
        <div className="tile divide-y-2 divide-line overflow-hidden">
          {index.texts.map((t) => {
            const p = texts.find((x) => x.id === t.id)
            const read = (p?.read ?? -1) + 1
            return (
              <button key={t.id} onClick={() => go(`text/${t.id}/${(p?.sitting ?? 0) + 1}`)} className="flex w-full items-center gap-3 p-4 text-left active:bg-sunken">
                <BookOpenTextIcon size={30} weight="fill" className="shrink-0 text-dai" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-book text-[19px]">{t.title}</div>
                  <div className="text-sm font-bold text-mute">
                    {t.author} · {t.year} · {t.chars.toLocaleString()}字 · {read > 0 ? `读了${read}/${t.sittings}部分` : `${t.sittings}部分`}
                  </div>
                </div>
                <CaretRightIcon size={20} weight="bold" className="text-mute" />
              </button>
            )
          })}
        </div>
      </Section>

      <Section
        title="我的导入"
        action={
          <button onClick={() => go('import/new')} className="flex items-center gap-1 text-sm font-extrabold text-lv">
            <PlusIcon size={16} weight="bold" /> 粘贴导入
          </button>
        }
      >
        {imports.length === 0 ? (
          <button onClick={() => go('import/new')} className="tile flex w-full items-center gap-3 border-dashed p-4 text-left">
            <ClipboardTextIcon size={30} weight="fill" className="shrink-0 text-lv" />
            <div className="text-[15px] font-bold text-mute">把网上看到的中文文章粘贴进来，就能像故事一样点词、存生词。只保存在这台设备上。</div>
          </button>
        ) : (
          <div className="tile divide-y-2 divide-line overflow-hidden">
            {imports.map((d) => (
              <button key={d.id} onClick={() => go(`import/${d.id}`)} className="flex w-full items-center gap-3 p-4 text-left active:bg-sunken">
                <ClipboardTextIcon size={28} weight="fill" className="shrink-0 text-lv" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[17px] font-extrabold">{d.title}</div>
                  <div className="text-sm font-bold text-mute">
                    {d.chars.toLocaleString()}字 · {new Date(d.created).toLocaleDateString('zh-CN')}
                  </div>
                </div>
                <CaretRightIcon size={20} weight="bold" className="text-mute" />
              </button>
            ))}
          </div>
        )}
      </Section>
      <div className="h-6" />
    </div>
  )
}
