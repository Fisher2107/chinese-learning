import type { SourceLink } from '../lib/types.ts'

/** 来源, each tagged with whose account it is (原典 · 官方 · 学者 · 媒体 · 百科). */
export function SourceList({ sources, className = '' }: { sources: SourceLink[]; className?: string }) {
  return (
    <ul className={`space-y-2 ${className}`}>
      {sources.map((s) => (
        <li key={s.url} className="flex items-start gap-2">
          {s.kind && <span className="mt-0.5 shrink-0 rounded-md bg-sunken px-1.5 text-[12px] leading-5 font-black text-mute">{s.kind}</span>}
          <a href={s.url} target="_blank" rel="noreferrer" className="min-w-0 text-[14px] font-bold break-words text-[var(--link)] underline underline-offset-4">
            {s.title}
          </a>
        </li>
      ))}
    </ul>
  )
}
