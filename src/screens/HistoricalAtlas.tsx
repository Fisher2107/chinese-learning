import { useEffect, useRef } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, MagnifyingGlassPlusIcon } from '@phosphor-icons/react'
import { Loading, PageHeader, Section } from '../components/ui.tsx'
import { ZhText } from '../components/ZhText.tsx'
import { loadHistory, useLoad } from '../lib/content.ts'
import type { AtlasImage } from '../lib/history.ts'
import type { WordSource } from '../lib/db.ts'
import { go } from '../lib/router.ts'

const BASE = import.meta.env.BASE_URL

function ImageCredit({ image }: { image: AtlasImage }) {
  return <details className="mt-1 text-xs leading-relaxed text-mute">
    <summary className="cursor-pointer py-1 font-bold">图片来源与许可</summary>
    <a className="underline" target="_blank" rel="noreferrer" href={image.sourceUrl}>{image.creator} · 原图</a>
    {' · '}{image.licenseUrl
      ? <a className="underline" target="_blank" rel="noreferrer" href={image.licenseUrl}>{image.license}</a>
      : image.license} · 已缩放并转为 WebP。
  </details>
}

export function HistoricalAtlas({ periodId, eventId }: { periodId?: string; eventId?: string }) {
  const { data, error } = useLoad(loadHistory, 'history')
  const selected = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!eventId || !data) return
    const frame = requestAnimationFrame(() => selected.current?.scrollIntoView({ block: 'start' }))
    return () => cancelAnimationFrame(frame)
  }, [periodId, eventId, data])

  if (error) return <><PageHeader title="历史地图" fallback="map" /><p className="p-4">暂时无法加载历史地图。请联网后刷新。</p></>
  if (!data) return <Loading />
  const { periods, media, glossary } = data
  const index = periodId ? periods.findIndex(p => p.id === periodId) : 0
  const period = periods[index]
  if (!period) return <><PageHeader title="找不到这个时期" fallback="map/history" /><a className="m-4 underline" href="#/map/history">回到历史地图</a></>
  const map = media['map-' + period.id]
  const path = 'map/history/' + period.id
  const source: WordSource = { kind: 'history', route: path, title: '历史地图 · ' + period.title }
  const picks = periods.flatMap(p => p.events.flatMap((e, i) => e.rank ? [{ rank: e.rank, title: e.title, href: '#/map/history/' + p.id + '/' + (i + 1) }] : [])).sort((a, b) => a.rank - b.rank)

  return <div className="pb-8">
    <PageHeader title="历史地图" fallback="map" right={<a className="px-2 py-2 text-sm font-bold text-lv" href="#/map/china">今日地图</a>} />
    <div className="mx-auto max-w-xl px-4">
      <nav aria-label="选择历史时期" className="tile p-3">
        <label className="mb-1 block text-sm font-bold text-mute" htmlFor="history-period">选择时期 · {index + 1}/{periods.length}</label>
        <div className="flex items-center gap-2">
          <button aria-label="上一个时期" disabled={!index} onClick={() => go('map/history/' + periods[index - 1].id)} className="grid size-11 shrink-0 place-items-center rounded-xl bg-sunken disabled:opacity-30"><ArrowLeftIcon /></button>
          <select id="history-period" className="h-11 min-w-0 flex-1 rounded-xl bg-sunken px-2 font-bold" value={period.id} onChange={e => go('map/history/' + e.target.value)}>
            {periods.map(p => <option key={p.id} value={p.id}>{p.title} · {p.dates}</option>)}
          </select>
          <button aria-label="下一个时期" disabled={index === periods.length - 1} onClick={() => go('map/history/' + periods[index + 1].id)} className="grid size-11 shrink-0 place-items-center rounded-xl bg-sunken disabled:opacity-30"><ArrowRightIcon /></button>
        </div>
      </nav>
      <details className="mt-3 rounded-xl bg-sunken px-3">
        <summary className="cursor-pointer py-3 font-extrabold">聊天先读哪几场？</summary>
        <p className="mb-2 text-sm text-mute">按故事好记、容易聊开来选出的八场。</p>
        <ol className="mb-2 grid gap-1 pb-2 sm:grid-cols-2">{picks.map(p => <li key={p.rank}>
          <a className="block rounded-lg px-2 py-2 font-bold hover:bg-surface" href={p.href}><span className="mr-2 text-zhu-dark">#{p.rank}</span>{p.title}</a>
        </li>)}</ol>
      </details>
      <h1 className="mt-5 text-[30px] font-black">{period.title}</h1>
      <p className="mb-3 font-bold text-mute">{period.dates}</p>
      <figure className="tile overflow-hidden">
        <a className="relative block bg-white" target="_blank" rel="noreferrer" href={BASE + map.src} aria-label={'放大' + period.title + '地图'}>
          <img className="mx-auto aspect-[4/3] w-full object-contain" src={BASE + map.src} alt={map.caption} />
          <span className="absolute right-2 bottom-2 rounded-lg bg-white p-2 text-black shadow"><MagnifyingGlassPlusIcon size={18} /></span>
        </a>
        <figcaption className="p-3"><p className="font-bold">{map.caption}</p><p className="mt-1 text-sm text-mute">{period.mapCaption}</p><ImageCredit image={map} /></figcaption>
      </figure>
      <ZhText className="mt-4 rounded-2xl bg-paper p-4 text-[19px] text-paper-text" paras={period.overview} id={'history-' + period.id} glossary={glossary} source={source} />
      <Section title="主要战事">{period.events.map((event, i) => {
        const id = String(i + 1)
        const eventSource = { ...source, route: path + '/' + id, title: event.title }
        return <article ref={eventId === id ? selected : undefined} key={period.id + id} className="tile mb-4 scroll-mt-20 p-4">
          <p className="text-sm font-bold text-mute">{event.date} · {event.place}</p>
          <h3 className="mt-1 text-[22px] font-black">{event.title}</h3>
          {event.rank && <p className="mt-2 rounded-xl bg-sunken p-3 text-[16px] font-bold"><span className="mr-2 text-zhu-dark">聊天推荐 #{event.rank}</span>{event.hook}</p>}
          <ZhText className="my-3 text-[18px]" paras={event.story} id={'history-' + period.id + '-' + id} glossary={glossary} source={eventSource} />
          <ul className="space-y-3">{event.figures.map(person => {
            const image = media[person.id]
            return <li key={person.id} className="flex gap-3 border-t border-line pt-3">
              <a href={BASE + image.src} target="_blank" rel="noreferrer" className="shrink-0">
                <img className="h-28 w-20 rounded-lg bg-sunken object-contain" loading="lazy" width="80" height="112" src={BASE + image.src} alt={image.caption} />
              </a>
              <div className="min-w-0"><h4 className="font-black">{person.name}</h4><p className="text-sm">{person.role}</p>
                <p className="mt-1 text-xs text-mute">{image.caption}</p><ImageCredit image={image} /></div>
            </li>
          })}</ul>
          <details className="mt-4 border-t border-line pt-2 text-sm"><summary className="cursor-pointer py-1 font-bold">史料与延伸阅读</summary>
            <ul className="space-y-1 py-1">{event.sources.map(s => <li key={s.url}><a className="underline" href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul>
          </details>
        </article>
      })}</Section>
    </div>
  </div>
}
