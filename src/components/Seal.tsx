/** A 印章: the province's 简称 carved in a red seal. Unearned seals are a dashed outline. */
export function Seal({ char, size = 56, earned, tilt = -4, className = '' }: { char: string; size?: number; earned: boolean; tilt?: number; className?: string }) {
  return (
    <span
      aria-label={earned ? `${char}（已盖章）` : `${char}（未盖章）`}
      className={`relative inline-grid shrink-0 place-items-center font-book leading-none select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.62,
        borderRadius: size * 0.16,
        transform: earned ? `rotate(${tilt}deg)` : undefined,
        background: earned ? '#C8341A' : 'transparent',
        color: earned ? '#FFF6EE' : 'var(--line)',
        border: earned ? 'none' : `${Math.max(2, size * 0.04)}px dashed var(--line)`,
        boxShadow: earned ? `inset 0 0 0 ${Math.max(2, size * 0.05)}px #C8341A, inset 0 0 0 ${Math.max(3, size * 0.085)}px #FFF6EE55` : undefined,
      }}
    >
      {char}
    </span>
  )
}
