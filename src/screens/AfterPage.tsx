import { useEffect } from 'react'
import { ArrowSquareOutIcon, StampIcon } from '@phosphor-icons/react'
import { loadSeries, useLoad } from '../lib/content.ts'
import { finishSeries } from '../lib/progress.ts'
import { Loading, PageHeader } from '../components/ui.tsx'
import { ZhText } from '../components/ZhText.tsx'

/** 读后: key words, 聊天工具包 and 聊天彩蛋, plus sources. */
export function AfterPage({ id }: { id: string }) {
  const { data: series } = useLoad(() => loadSeries(id), `series:${id}`)
  useEffect(() => {
    finishSeries(id)
  }, [id])
  if (!series) return <Loading />

  return (
    <div className="min-h-dvh bg-paper text-paper-text">
      <PageHeader title={`${series.title} · 读后`} fallback={`series/${id}`} />
      <div className="mx-auto max-w-xl px-5 pb-16">
        <div className="mt-2 flex items-center gap-4 rounded-2xl p-4 text-white" style={{ background: series.color }}>
          <StampIcon size={48} weight="fill" className="shrink-0" />
          <div>
            <div className="text-lg font-black">集章成功！</div>
            <div className="text-[15px] font-bold opacity-90">下面这些，留着跟中国朋友聊天用。</div>
          </div>
        </div>

        <div className="mt-6 text-[19px]">
          <ZhText id={`after-${id}`} paras={series.after.flatMap((b) => (b.kind === 'excerpt' ? b.paras : [b]))} glossary={series.glossary} source={{ kind: 'episode', route: `series/${id}/after`, title: `${series.title} · 读后` }} />
        </div>

        <h3 className="mt-10 mb-2 text-sm font-black tracking-wide text-mute">资料来源</h3>
        <ul className="space-y-2 text-[14px]">
          {series.sources.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="flex items-start gap-1.5 font-bold text-dai underline-offset-2 hover:underline">
                <ArrowSquareOutIcon size={16} weight="bold" className="mt-0.5 shrink-0" />
                {s.title}
              </a>
            </li>
          ))}
        </ul>
        {series.inspiration.length > 0 && (
          <>
            <h3 className="mt-6 mb-2 text-sm font-black tracking-wide text-mute">灵感来源</h3>
            <ul className="space-y-2 text-[14px]">
              {series.inspiration.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer" className="flex items-start gap-1.5 font-bold text-dai break-all">
                    <ArrowSquareOutIcon size={16} weight="bold" className="mt-0.5 shrink-0" />
                    {u.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs font-bold text-mute">这个系列受到上面的视频启发，内容是我们自己写的。</p>
          </>
        )}
      </div>
    </div>
  )
}
