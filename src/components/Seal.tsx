/**
 * A 印章: a province's 简称 or an era's name carved in a red seal. Two characters stand one above
 * the other, as on a real seal. Unearned seals are a dashed outline.
 */
export function Seal({ char, size = 56, earned, tilt = -4, className = '' }: { char: string; size?: number; earned: boolean; tilt?: number; className?: string }) {
  const chars = [...char]
  const two = chars.length > 1
  return (
    <span
      aria-label={earned ? `${char}（已盖章）` : `${char}（未盖章）`}
      className={`relative inline-grid shrink-0 place-items-center font-book leading-none select-none ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * (two ? 0.4 : 0.62),
        borderRadius: size * 0.16,
        transform: earned ? `rotate(${tilt}deg)` : undefined,
        background: earned ? '#C8341A' : 'transparent',
        color: earned ? '#FFF6EE' : 'var(--line)',
        border: earned ? 'none' : `${Math.max(2, size * 0.04)}px dashed var(--line)`,
        boxShadow: earned ? `inset 0 0 0 ${Math.max(2, size * 0.05)}px #C8341A, inset 0 0 0 ${Math.max(3, size * 0.085)}px #FFF6EE55` : undefined,
      }}
    >
      {two ? (
        <span className="flex flex-col items-center" style={{ gap: size * 0.04 }}>
          {chars.slice(0, 2).map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </span>
      ) : (
        char
      )}
    </span>
  )
}
