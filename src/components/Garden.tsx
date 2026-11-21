import { DropIcon, FlowerIcon, PlantIcon, PottedPlantIcon, TreeIcon, type Icon } from '@phosphor-icons/react'
import type { SavedWord } from '../lib/db.ts'
import { useWordSheet } from './word-context.ts'

function SeedIcon({ size = 32, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <ellipse cx="16" cy="20" rx="6.5" ry="8.5" transform="rotate(-25 16 20)" fill={color} />
      <path d="M13.5 15.5c1.5 1 2.5 3 2.6 5.5" stroke="#fff" strokeOpacity=".45" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Words grow as they're remembered longer (FSRS stability, in days). Nothing ever dies:
 * a word that's due just gets thirsty, and reviewing it is watering it.
 */
export const STAGES: { name: string; Icon: Icon | typeof SeedIcon; color: string }[] = [
  { name: '种子', Icon: SeedIcon, color: '#A47148' },
  { name: '发芽', Icon: PlantIcon, color: '#7BC86C' },
  { name: '小苗', Icon: PottedPlantIcon, color: '#2BAE85' },
  { name: '开花', Icon: FlowerIcon, color: '#E86A92' },
  { name: '结果', Icon: TreeIcon, color: '#1E8A68' },
]

export function stageOf(w: SavedWord): number {
  const card = w.card as { stability?: number; reps?: number }
  if (!card.reps) return 0
  const s = card.stability ?? 0
  if (s < 3) return 1
  if (s < 10) return 2
  if (s < 30) return 3
  return 4
}

export function Plant({ w, now, size = 34 }: { w: SavedWord; now: number; size?: number }) {
  const st = STAGES[stageOf(w)]
  const thirsty = w.due <= now
  return (
    <span className="relative inline-grid place-items-center" title={`${st.name}${thirsty ? ' · 该浇水了' : ''}`}>
      <st.Icon size={size} weight="fill" color={st.color} />
      {thirsty && (
        <span className="absolute -top-1 -right-2 grid size-5 place-items-center rounded-full border-2 border-surface bg-[#3D8FB8]">
          <DropIcon size={11} weight="fill" color="#fff" />
        </span>
      )}
    </span>
  )
}

/** The garden: every saved word as a plant. Tapping one opens its word card. */
export function GardenGrid({ words, limit }: { words: SavedWord[]; limit?: number }) {
  const sheet = useWordSheet()
  const now = Date.now()
  const shown = limit ? words.slice(0, limit) : words
  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
      {shown.map((w) => (
        <button
          key={w.id}
          onClick={() => sheet.open({ token: { t: w.word, p: w.p }, gloss: w.d, sentence: w.sentence, source: w.source, key: `garden:${w.id}` })}
          className="flex flex-col items-center gap-1 rounded-2xl bg-sunken px-1 pt-3 pb-2 active:scale-95"
        >
          <Plant w={w} now={now} />
          <span className="max-w-full truncate font-book text-[17px] leading-tight">{w.word}</span>
        </button>
      ))}
    </div>
  )
}

export function StageCounts({ words }: { words: SavedWord[] }) {
  const counts = STAGES.map(() => 0)
  for (const w of words) counts[stageOf(w)]++
  return (
    <div className="grid grid-cols-5 gap-1 text-center">
      {STAGES.map((s, i) => (
        <div key={s.name} className="flex flex-col items-center">
          <s.Icon size={22} weight="fill" color={s.color} />
          <span className="mt-0.5 text-[15px] font-black">{counts[i]}</span>
          <span className="text-[11px] font-extrabold text-mute">{s.name}</span>
        </div>
      ))}
    </div>
  )
}
