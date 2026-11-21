import { PageHeader, Loading } from '../components/ui.tsx'
import { loadFeed, loadPlaces, useLoad } from '../lib/content.ts'
import type { FeedCard } from '../lib/types.ts'

import { collections } from '../lib/collections.ts'

const picks = [
  ['ji-32', '城门开着，诸葛亮还坐下来弹琴。'],
  ['ji-02', '救的是赵，围的为什么是魏？'],
  ['ji-17', '开会先提个想法，也可以叫“抛砖引玉”。'],
  ['ji-08', '地图上至今还能找到陈仓。'],
  ['ji-21', '留在树上的蝉壳，让人以为蝉还在。'],
  ['ji-36', '想先告辞时，可以笑着说“三十六计，走为上计”。'],
] as const

function title(card: FeedCard) {
  return card.title.flatMap(s => s.tokens.map(t => t.t)).join('')
}

export function ReadingCollection({ id }: { id: string }) {
  const { data: feed } = useLoad(loadFeed, 'feed')
  const places = useLoad(loadPlaces, 'places').data?.places
  const collection = collections.find(c => c.id === id)
  if (!collection) return <PageHeader title="找不到这个专题" fallback="shelf" />
  if (!feed) return <Loading />
  const tag = { stratagems: '三十六计', hometown: '地域表达', caves: '洞穴' }[collection.id]
  const cards = feed.cards.filter(c => c.tags.includes(tag)).sort((a, b) => a.id.localeCompare(b.id))
  const groups = new Map<string, FeedCard[]>()
  for (const card of cards) {
    const group = collection.id === 'stratagems' ? card.tags[1] : (places?.find(p => p.id === card.province)?.name ?? '地方故事')
    const items = groups.get(group) ?? []
    items.push(card)
    groups.set(group, items)
  }

  return <>
    <PageHeader title={collection.name} fallback="shelf" />
    <div className="mx-auto max-w-xl px-4 pb-10">
      <h1 className="mt-3 text-[28px] font-black">{collection.name}</h1>
      <p className="mt-1 text-mute">{collection.description} · {cards.length} 张卡</p>
      {collection.id === 'stratagems' && <section className="tile mt-5 p-4">
        <h2 className="text-lg font-black">聊天先读哪几计？</h2>
        <p className="mt-1 text-sm text-mute">按故事好记、日常聊天好用的程度选了六计。</p>
        <ol className="mt-2 space-y-2">{picks.map(([key, hook], i) => {
          const card = cards.find(c => c.id === key)
          return card && <li key={key}><a href={'#/feed/' + key} className="block rounded-xl bg-sunken px-3 py-2">
            <span className="font-black text-zhu-dark">#{i + 1}　{title(card).split('·').pop()?.trim()}</span>
            <span className="mt-0.5 block text-sm">{hook}</span>
          </a></li>
        })}</ol>
      </section>}
      {Array.from(groups, ([group, items]) => <section key={group} className="mt-6">
        <h2 className="mb-2 text-lg font-black">{group}</h2>
        <ul className="tile divide-y divide-line">{items.map(c => <li key={c.id}>
          <a className="block p-3 font-bold" href={'#/feed/' + c.id}>{title(c)}</a>
        </li>)}</ul>
      </section>)}
    </div>
  </>
}
