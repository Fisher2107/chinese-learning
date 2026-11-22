import { useEffect, useMemo } from 'react'
import { ArrowRightIcon } from '@phosphor-icons/react'
import { PageHeader, Loading } from '../components/ui.tsx'
import { Fold, JumpBar, jumpTo } from '../components/Fold.tsx'
import { EggList, placeLinks, useEggRows } from '../components/Eggs.tsx'
import { loadDialect, loadFeed, loadPlaces, useLoad } from '../lib/content.ts'
import { mergeEggs } from '../lib/eggs.ts'
import { REGIONS } from '../lib/places.ts'
import { go } from '../lib/router.ts'
import type { DialectFile, FeedCard, Place } from '../lib/types.ts'

import { collections } from '../lib/collections.ts'

const picks = {
  stratagems: [
    ['ji-32', '城门开着，诸葛亮还坐下来弹琴。'],
    ['ji-02', '救的是赵，围的为什么是魏？'],
    ['ji-17', '开会先提个想法，也可以叫“抛砖引玉”。'],
    ['ji-08', '地图上至今还能找到陈仓。'],
    ['ji-21', '留在树上的蝉壳，让人以为蝉还在。'],
    ['ji-36', '想先告辞时，可以笑着说“三十六计，走为上计”。'],
  ],
  hometown: [
    ['lameizi-chunwan', '一次春晚上，《本草纲目》和《辣妹子》唱到了一起。'],
    ['paerduo-gundeng', '四川人说耳朵“软”，川剧里的人却要在头顶稳住一盏灯。'],
    ['jiangxi-tunjinshou', '余江有三十二对新人一起办过一场“零彩礼”婚礼。'],
  ],
  caves: [
    ['tianyang-69-hours', '两处气室，两名失联的科考队员，一场持续了六十九小时的搜救。'],
    ['shuanghe-pandas', '洞壁上留下了熊猫的抓痕，竖井里又发现了烧过的骨头。'],
    ['leye-tiankeng', '同样是天坑，有的有观景台，有的坑底却藏着需要保护的森林。'],
  ],
} as const

function title(card: FeedCard) {
  return card.title.flatMap(s => s.tokens.map(t => t.t)).join('')
}

/** `focus`: a province id, from collection/hometown/<id>, opens and scrolls to its section. */
export function ReadingCollection({ id, focus }: { id: string; focus?: string }) {
  const { data: feed } = useLoad(loadFeed, 'feed')
  const places = useLoad(loadPlaces, 'places').data?.places
  const dialect = useLoad(loadDialect, 'dialect').data
  const collection = collections.find(c => c.id === id)
  if (!collection) return <PageHeader title="找不到这个专题" fallback="shelf" />
  if (!feed) return <Loading />
  const tag = { stratagems: '三十六计', hometown: '地域表达', caves: '洞穴' }[collection.id]
  const cards = feed.cards.filter(c => c.tags.includes(tag)).sort((a, b) => a.id.localeCompare(b.id))
  const hometown = collection.id === 'hometown'
  if (hometown && (!places || !dialect)) return <Loading />
  const groups = new Map<string, FeedCard[]>()
  for (const card of cards) {
    const group = collection.id === 'stratagems' ? card.tags[1] : (places?.find(p => p.id === card.province)?.name ?? '地方故事')
    const items = groups.get(group) ?? []
    items.push(card)
    groups.set(group, items)
  }
  const sayings = dialect ? Object.values(dialect.provinces).reduce((n, e) => n + e.length, 0) : 0

  return <>
    <PageHeader
      title={collection.name}
      fallback="shelf"
      below={hometown && <JumpBar items={REGIONS.map(r => ({ id: `hometown-r-${r.name}`, label: r.name }))} />}
    />
    <div className="mx-auto max-w-xl px-4 pb-10">
      <h1 className="mt-3 text-[28px] font-black">{collection.name}</h1>
      <p className="mt-1 text-mute">
        {collection.description} · {cards.length} 张卡{hometown && ` · ${sayings} 句家乡话`}
      </p>
      <section className="tile mt-5 p-4">
        <h2 className="text-lg font-black">{collection.id === 'stratagems' ? '聊天先读哪几计？' : '最适合讲给朋友听的三张卡'}</h2>
        <p className="mt-1 text-sm text-mute">按故事好记、日常聊天好用的程度排序。</p>
        <ol className="mt-2 space-y-2">{picks[collection.id].map(([key, hook], i) => {
          const card = cards.find(c => c.id === key)
          return card && <li key={key}><a href={'#/feed/' + key} className="block rounded-xl bg-sunken px-3 py-2">
            <span className="font-black text-zhu-dark">#{i + 1}　{title(card).split('·').pop()?.trim()}</span>
            <span className="mt-0.5 block text-sm">{hook}</span>
          </a></li>
        })}</ol>
      </section>
      {hometown && places && dialect
        ? <Hometown places={places} cards={cards} dialect={dialect} focus={focus} />
        : Array.from(groups, ([group, items]) => <section key={group} className="mt-6">
          <h2 className="mb-2 text-lg font-black">{group}</h2>
          <ul className="tile divide-y divide-line">{items.map(c => <li key={c.id}>
            <a className="block p-3 font-bold" href={'#/feed/' + c.id}>{title(c)}</a>
          </li>)}</ul>
        </section>)}
    </div>
  </>
}

/**
 * 家乡话与地方梗: a section for every province, by region. Each has the province's 刷一刷 cards and
 * its 家乡话 (sayings, built like 聊天彩蛋: a question to review, 深入, editing), and the user can add
 * the ones they hear.
 */
function Hometown({ places, cards, dialect, focus }: { places: Place[]; cards: FeedCard[]; dialect: DialectFile; focus?: string }) {
  const rows = useEggRows()
  const links = useMemo(() => placeLinks(places), [places])
  const sections = useMemo(
    () =>
      places.map(p => {
        const page = `hometown/${p.id}`
        const group = { page, title: p.name, eggs: dialect.provinces[p.id] ?? [], glossary: dialect.glossary }
        return { place: p, group, eggs: mergeEggs(page, p.name, group.eggs, rows), cards: cards.filter(c => c.province === p.id) }
      }),
    [places, dialect, rows, cards],
  )

  useEffect(() => {
    const p = focus && places.find(x => x.id === focus)
    if (p) jumpTo(`hometown-${p.id}`, [`hometown-r-${p.region}`])
  }, [focus, places])

  return <>
    <p className="mt-6 px-1 text-[13px] leading-snug font-bold text-mute">
      每个省一节：那里的故事卡，和那里的人常说的话。听到一句家乡话？写进去，加入复习，下次跟那儿的朋友说一句。
    </p>
    {REGIONS.map(r => {
      const here = sections.filter(s => s.place.region === r.name)
      if (!here.length) return null
      return (
        <Fold
          key={r.name}
          id={`hometown-r-${r.name}`}
          title={r.name}
          icon={<span className="size-3 shrink-0 rounded-full" style={{ background: r.color }} />}
          count={here.reduce((n, s) => n + s.cards.length + s.eggs.length, 0) || undefined}
        >
          <div className="divide-y-2 divide-line">
            {here.map(({ place, group, eggs, cards }) => (
              <Fold
                key={place.id}
                small
                defaultOpen={false}
                id={`hometown-${place.id}`}
                title={place.name}
                count={cards.length + eggs.length || undefined}
              >
                {cards.length > 0 && (
                  <ul className="tile mb-3 divide-y divide-line">
                    {cards.map(c => (
                      <li key={c.id}>
                        <a className="flex items-center gap-2 p-3 font-bold" href={'#/feed/' + c.id}>
                          <span className="shrink-0 rounded-md bg-zhu-soft px-1.5 text-xs leading-5 font-black text-zhu-ink">故事</span>
                          <span className="min-w-0 flex-1">{title(c)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                <EggList group={group} eggs={eggs} links={links} />
                <button onClick={() => go(`place/${place.id}`)} className="mt-2 flex items-center gap-1 px-1 py-1.5 text-sm font-extrabold text-lv">
                  去{place.name}看看 <ArrowRightIcon size={14} weight="bold" />
                </button>
              </Fold>
            ))}
          </div>
        </Fold>
      )
    })}
  </>
}
