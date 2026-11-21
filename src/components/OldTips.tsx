/** Common words in Ming–Qing vernacular (古白话) that trip up modern readers. */
const TIPS: [string, string][] = [
  ['道', '说'],
  ['则个', '句末语气词，像“吧”'],
  ['官人', '对男人的客气称呼'],
  ['娘子', '对女人的称呼'],
  ['奴家', '我（女人说自己）'],
  ['小人、小子', '我（男人说自己，很客气）'],
  ['甚么', '什么'],
  ['恁地', '这样、那么'],
  ['休', '不要'],
  ['将', '把；拿'],
  ['与', '给；和'],
  ['那里', '哪里'],
  ['只见', '就看见'],
  ['却', '可是；就'],
]

export function OldTips() {
  return (
    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-sunken p-3 text-[14px]">
      {TIPS.map(([a, b]) => (
        <div key={a}>
          <span className="font-book text-[16px] font-bold">{a}</span>
          <span className="text-mute"> = {b}</span>
        </div>
      ))}
    </div>
  )
}
