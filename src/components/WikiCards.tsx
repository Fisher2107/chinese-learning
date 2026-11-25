import { ArrowRightIcon, CheckCircleIcon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import { go } from '../lib/router.ts'
import type { Sentence, WikiSummary } from '../lib/types.ts'
import { plain } from '../lib/wiki.ts'
import { Photo, usePhoto } from './Photo.tsx'
import { Section } from './ui.tsx'

/**
 * A row of photo cards you swipe through, like the "top sights" of a maps app. Each card opens its
 * 百科 page. Pages already opened get a tick, so you can see what's left. `tag` replaces the kind
 * next to the name (这里的历史 shows the era); sensitive topics carry a 敏感 badge.
 */
export function PhotoRow({
  title,
  sub,
  pages,
  seen,
  action,
  tag,
}: {
  title: ReactNode
  sub?: string
  pages: WikiSummary[]
  seen: Set<string>
  action?: ReactNode
  tag?: (p: WikiSummary) => string | undefined
}) {
  if (!pages.length) return null
  return (
    <Section title={title} action={action}>
      {sub && <p className="-mt-1 mb-3 px-1 text-sm font-bold text-mute">{sub}</p>}
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {pages.map((p) => (
          <SightCard key={p.id} page={p} seen={seen.has(p.id)} tag={tag?.(p)} />
        ))}
      </div>
    </Section>
  )
}

/** One 百科 page as a photo card: in a row (fixed width) or, `wide`, filling a grid cell. */
export function SightCard({ page, seen, tag, wide }: { page: WikiSummary; seen: boolean; tag?: string; wide?: boolean }) {
  const photo = usePhoto(`wiki/${page.id}`)
  return (
    <button onClick={() => go(`wiki/${page.id}`)} className={`tile overflow-hidden text-left ${wide ? 'w-full' : 'w-44 shrink-0 snap-start'}`}>
      <div className="relative">
        {photo ? <Photo k={`wiki/${page.id}`} ratio="4 / 3" credit={false} /> : <NoPhoto name={page.name} ratio="4 / 3" />}
        {seen && (
          <span className="absolute top-1.5 right-1.5 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[11px] font-black text-white">
            <CheckCircleIcon size={13} weight="fill" /> 看过
          </span>
        )}
        {page.sensitive && <SensitiveBadge className="absolute top-1.5 left-1.5" />}
      </div>
      <div className="p-2.5">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-[17px] font-black">{page.name}</span>
          <span className="shrink-0 text-[12px] font-extrabold text-mute">{tag ?? page.kind}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug font-bold text-mute">{plain(page.lede)}</p>
      </div>
    </button>
  )
}

/** Round portraits for people, with what they're known for underneath. */
export function PeopleRow({ title, pages, seen }: { title: ReactNode; pages: WikiSummary[]; seen: Set<string> }) {
  if (!pages.length) return null
  return (
    <Section title={title}>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
        {pages.map((p) => (
          <button key={p.id} onClick={() => go(`wiki/${p.id}`)} className="flex w-28 shrink-0 snap-start flex-col items-center text-center">
            <div className={`relative size-24 overflow-hidden rounded-full border-[3px] ${seen.has(p.id) ? 'border-lv' : 'border-line'}`}>
              <Portrait id={p.id} name={p.name} />
            </div>
            <div className="mt-1.5 text-[16px] font-black">{p.name}</div>
            <div className="line-clamp-2 text-[12px] leading-tight font-bold text-mute">{p.dates || plain(p.lede).slice(0, 14)}</div>
          </button>
        ))}
      </div>
    </Section>
  )
}

function Portrait({ id, name }: { id: string; name: string }) {
  const photo = usePhoto(`wiki/${id}`)
  if (photo) return <Photo k={`wiki/${id}`} ratio="1 / 1" credit={false} className="h-full w-full" />
  return <div className="grid h-full w-full place-items-center bg-sunken font-book text-[34px] text-dai">{name[0]}</div>
}

/** A topic that is 敏感 in China: its page says why. */
export function SensitiveBadge({ className = '' }: { className?: string }) {
  return <span className={`rounded-full bg-huang px-1.5 py-0.5 text-[11px] leading-none font-black text-[#3a3000] ${className}`}>敏感</span>
}

/** Where there's no photo yet: the name, big, on paper. */
export function NoPhoto({ name, ratio }: { name: string; ratio: string }) {
  return (
    <div className="grid place-items-center bg-paper font-book text-[30px] text-paper-text/70" style={{ aspectRatio: ratio }}>
      {name}
    </div>
  )
}

/**
 * 下一站: the question that pulls you to the next page. This is what makes reading one page lead to
 * another and another.
 */
export function NextCard({ route, title, hook }: { route: string; title: string; hook: Sentence[] }) {
  const id = route.split('/')[1]
  const key = route.startsWith('wiki/') ? `wiki/${id}` : route.startsWith('place/') ? `place/${id}` : `city/${id}`
  const photo = usePhoto(key)
  return (
    <button onClick={() => go(route)} className="tile flex w-full items-stretch overflow-hidden text-left">
      {photo ? <Photo k={key} ratio="1 / 1" credit={false} className="w-24 shrink-0" /> : <div className="grid w-24 shrink-0 place-items-center bg-paper font-book text-[26px] text-paper-text/70">{title[0]}</div>}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3">
        <p className="font-book text-[17px] leading-snug">{plain(hook)}</p>
        <span className="flex items-center gap-1 text-[13px] font-black text-[var(--link)]">
          {title} <ArrowRightIcon size={14} weight="bold" />
        </span>
      </div>
    </button>
  )
}
