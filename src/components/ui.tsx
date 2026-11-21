import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowLeftIcon, XIcon } from '@phosphor-icons/react'
import { back } from '../lib/router.ts'

type Tone = 'zhu' | 'lv' | 'dai' | 'huang' | 'plain'

const TONES: Record<Tone, { cls: string; edge: string }> = {
  zhu: { cls: 'bg-zhu text-white', edge: 'var(--color-zhu-dark)' },
  lv: { cls: 'bg-lv text-white', edge: 'var(--color-lv-dark)' },
  dai: { cls: 'bg-dai text-white', edge: 'var(--color-dai-dark)' },
  huang: { cls: 'bg-huang text-[#3a3000]', edge: 'var(--color-huang-dark)' },
  plain: { cls: 'bg-surface text-text border-2 border-line', edge: 'var(--line)' },
}

export function Button({
  tone = 'zhu',
  size = 'lg',
  className = '',
  disabled,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; size?: 'lg' | 'md' | 'sm' }) {
  const t = disabled ? { cls: 'bg-sunken text-mute', edge: 'var(--line)' } : TONES[tone]
  const sz = size === 'lg' ? 'h-13 px-6 text-[17px]' : size === 'md' ? 'h-11 px-5 text-[15px]' : 'h-9 px-3.5 text-sm'
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{ ['--edge' as string]: t.edge }}
      className={`chunky inline-flex items-center justify-center gap-2 rounded-2xl font-extrabold tracking-wide select-none ${sz} ${t.cls} ${className}`}
    >
      {children}
    </button>
  )
}

export function ProgressBar({ value, color = 'var(--color-lv)', className = '' }: { value: number; color?: string; className?: string }) {
  return (
    <div className={`h-4 overflow-hidden rounded-full bg-sunken ${className}`}>
      <div
        className="relative h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color }}
      >
        <div className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/30" />
      </div>
    </div>
  )
}

/** Top bar for inner pages: back arrow (or close) and a title. */
export function PageHeader({
  title,
  right,
  close,
  fallback = '',
  onBack,
}: {
  title?: ReactNode
  right?: ReactNode
  close?: boolean
  fallback?: string
  onBack?: () => void
}) {
  const Icon = close ? XIcon : ArrowLeftIcon
  return (
    <header className="safe-top sticky top-0 z-20 bg-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-xl items-center gap-2 px-3">
        <button
          aria-label={close ? '关闭' : '返回'}
          onClick={onBack ?? (() => back(fallback))}
          className="grid size-10 place-items-center rounded-xl text-mute active:bg-sunken"
        >
          <Icon size={24} weight="bold" />
        </button>
        <div className="min-w-0 flex-1 truncate text-[17px] font-extrabold">{title}</div>
        {right}
      </div>
    </header>
  )
}

export function Section({ title, action, children }: { title: ReactNode; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-7">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="text-[19px] font-extrabold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function Loading({ label = '加载中…' }: { label?: string }) {
  return (
    <div className="grid min-h-[50dvh] place-items-center text-mute">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-4 border-line border-t-lv" />
        <span className="text-sm font-bold">{label}</span>
      </div>
    </div>
  )
}

export function Pill({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex h-6 items-center rounded-full px-2.5 text-xs font-extrabold"
      style={{ background: color ? `color-mix(in oklab, ${color} 16%, transparent)` : 'var(--sunken)', color: color ?? 'var(--mute)' }}
    >
      {children}
    </span>
  )
}
