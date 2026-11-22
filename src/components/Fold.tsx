import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { CaretDownIcon } from '@phosphor-icons/react'

/*
 * Folding sections keep long pages short. Which ones are open is remembered on this device per
 * kind of section ("place-eggs", "city-map"…), so a page opens the way the user left the last one.
 */
const KEY = 'zgt-folds'
let open: Record<string, boolean> = {}
try {
  open = JSON.parse(localStorage.getItem(KEY) ?? '{}')
} catch {
  open = {}
}
const subs = new Set<() => void>()

function setOpen(id: string, value: boolean) {
  open = { ...open, [id]: value }
  try {
    localStorage.setItem(KEY, JSON.stringify(open))
  } catch {
    // private mode: remembered until the app closes
  }
  subs.forEach((f) => f())
}

function useOpen(id: string, fallback: boolean): [boolean, (v: boolean) => void] {
  const state = useSyncExternalStore(
    (cb) => {
      subs.add(cb)
      return () => subs.delete(cb)
    },
    () => open,
  )
  return [state[id] ?? fallback, (v) => setOpen(id, v)]
}

/** A section with a header that folds it away. */
export function Fold({
  id,
  title,
  icon,
  count,
  action,
  defaultOpen = true,
  children,
}: {
  id: string
  title: ReactNode
  icon?: ReactNode
  count?: number
  /** shown on the right of the header, even when folded */
  action?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [isOpen, set] = useOpen(id, defaultOpen)
  return (
    <section id={`fold-${id}`} className="mt-5">
      <div className="flex min-h-11 items-center gap-2">
        <button onClick={() => set(!isOpen)} aria-expanded={isOpen} className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left">
          <CaretDownIcon size={16} weight="bold" className={`shrink-0 text-mute transition-transform ${isOpen ? '' : '-rotate-90'}`} />
          {icon}
          <h2 className="truncate text-[19px] font-extrabold">{title}</h2>
          {count !== undefined && <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-xs font-extrabold text-mute">{count}</span>}
        </button>
        {action}
      </div>
      {isOpen && <div className="mt-2">{children}</div>}
    </section>
  )
}

/** Opens a fold and scrolls it to just under the sticky header. */
export function jumpTo(id: string) {
  setOpen(id, true)
  requestAnimationFrame(() => {
    const el = document.getElementById(`fold-${id}`)
    if (!el) return
    const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - header - 4, behavior: 'smooth' })
  })
}

/** A row of chips under the page header that jump to the page's sections. */
export function JumpBar({ items }: { items: { id: string; label: string; count?: number; hot?: boolean }[] }) {
  return (
    <nav className="no-scrollbar mx-auto flex max-w-xl gap-1.5 overflow-x-auto px-4 pb-2" aria-label="跳到">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => jumpTo(it.id)}
          className={`flex h-8 shrink-0 items-center gap-1 rounded-full border-2 px-3 text-[13px] font-extrabold ${it.hot ? 'border-lv bg-lv-soft text-lv-ink' : 'border-line bg-surface'}`}
        >
          {it.label}
          {!!it.count && <span className="font-bold opacity-70">{it.count}</span>}
        </button>
      ))}
    </nav>
  )
}

/** A fold inside a fold: a title row that opens to show more. Starts closed; not remembered. */
export function Sub({ title, children }: { title: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={open ? '' : 'tile'}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className={`flex w-full items-center gap-2 text-left ${open ? 'py-2' : 'px-4 py-3'}`}>
        <CaretDownIcon size={14} weight="bold" className={`shrink-0 text-mute transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="min-w-0 flex-1 text-[17px] font-black">{title}</span>
      </button>
      {open && children}
    </div>
  )
}
