import { Photo } from '../components/Photo.tsx'
import { useCallback, useEffect, useMemo } from 'react'
import { BooksIcon, ChatCircleDotsIcon, MapPinIcon } from '@phosphor-icons/react'
import { db, type WordSource } from '../lib/db.ts'
import { loadCities, loadFeed, loadPlaces, loadWikiIndex, useLoad } from '../lib/content.ts'
import { FOOD_KINDS, pagesAbout, SIGHT_KINDS, STORY_KINDS, useWikiProgress } from '../lib/wiki.ts'
import { PeopleRow, PhotoRow } from '../components/WikiCards.tsx'
import { CITY_BY_ID, cityKind, citiesOf } from '../lib/cities.ts'
import { markCityRead, markCityUnread, markKey, setLearnt, useMarks, visitCity } from '../lib/learn.ts'
import { useLiveQuery } from '../lib/live.ts'
import { regionColor } from '../lib/places.ts'
import { go } from '../lib/router.ts'
import { LearntButton } from '../components/LearntButton.tsx'
import { ReadMark } from '../components/ReadMark.tsx'
import { Button, Loading, PageHeader } from '../components/ui.tsx'
import { Fold, JumpBar } from '../components/Fold.tsx'
import { EggSection, placeLinks, useEggCount, type EggGroup } from '../components/Eggs.tsx'
import { MapKey, ProvinceMap } from '../components/ProvinceMap.tsx'
import { ZhText } from '../components/ZhText.tsx'

/** One city: what it's like, things to chat about, and where it is. */
export function CityPage({ id }: { id: string }) {
  const city = CITY_BY_ID.get(id)
  const file = useLoad(loadCities, 'cities').data
  const placesFile = useLoad(loadPlaces, 'places').data
  const feed = useLoad(loadFeed, 'feed').data
  const stories = feed?.cards.filter((c) => c.city === id) ?? []
  const marks = useMarks()
  const wikiIndex = useLoad(loadWikiIndex, 'wiki-index').data
  const { seen } = useWikiProgress()
  const row = useLiveQuery(() => db.cities.get(id), [id])
  const content = file?.cities.find((c) => c.id === id)
  const eggCount = useEggCount(`city/${id}`, content?.eggs.length ?? 0)
  useEffect(() => {
    visitCity(id)
  }, [id])
  const isLearnt = useCallback((c: string) => marks.learnt.has(markKey('city', c)), [marks.learnt])
  const links = useMemo(() => (placesFile ? placeLinks(placesFile.places) : undefined), [placesFile])
  const names = useMemo(() => new Map((placesFile?.places ?? []).map((p) => [p.id, p.name])), [placesFile])
  const written = useMemo(() => new Set((file?.cities ?? []).filter((c) => c.intro.length).map((c) => c.id)), [file])
  const prov = placesFile?.places.find((p) => p.id === city?.prov)
  const siblings = useMemo(() => (city ? citiesOf(city.prov).filter((c) => c.kind !== 'muni') : []), [city])
  const pages = useMemo(() => pagesAbout(wikiIndex, { city: id }), [wikiIndex, id])
  const pins = useMemo(() => pages.filter((p) => SIGHT_KINDS.has(p.kind) && p.xy).map((p) => ({ id: p.id, x: p.xy![0], y: p.xy![1], name: p.name })), [pages])
  const groups = useMemo<EggGroup[]>(() => {
    if (!city || !file || !placesFile) return []
    const byId = new Map(file.cities.map((c) => [c.id, c]))
    return [
      { page: `city/${id}`, title: city.name, eggs: byId.get(id)?.eggs ?? [], glossary: file.glossary },
      ...(prov ? [{ page: `place/${prov.id}`, title: prov.name, eggs: prov.eggs, glossary: placesFile.glossary }] : []),
      ...siblings.filter((c) => c.id !== id).map((c) => ({ page: `city/${c.id}`, title: c.name, eggs: byId.get(c.id)?.eggs ?? [], glossary: file.glossary })),
    ]
  }, [city, file, placesFile, prov, siblings, id])

  if (!city) return <PageHeader title="找不到这个城市" fallback="map/china" />
  if (!file || !placesFile) return <Loading />
  const color = prov ? regionColor(prov.region) : '#425066'
  const source: WordSource = { kind: 'place', route: `city/${id}`, title: `${city.name} · 地图` }
  const learnt = marks.learnt.has(markKey('city', id))
  const hasPage = !!content?.intro.length
  const sights = pages.filter((p) => SIGHT_KINDS.has(p.kind))
  const people = pages.filter((p) => p.kind === '人物')
  const tales = pages.filter((p) => STORY_KINDS.has(p.kind) || FOOD_KINDS.has(p.kind))

  return (
    <div className="pb-12">
      <PageHeader
        title={city.full}
        fallback="map/china"
        below={
          <JumpBar
            items={[
              { id: 'city-intro', label: '简介' },
              { id: 'city-eggs', label: '聊天彩蛋', count: eggCount, hot: true },
              { id: 'city-map', label: '地图' },
              ...(pages.length ? [{ id: 'city-wiki', label: '百科', count: pages.length }] : []),
              ...(stories.length || prov ? [{ id: 'city-related', label: '相关', count: stories.length || undefined }] : []),
            ]}
          />
        }
      />
      <div className="mx-auto max-w-xl px-4">
        <div className="tile overflow-hidden">
          <div className="px-4 py-3 text-white" style={{ background: color }}>
            <div className="flex items-baseline gap-2">
              <span className="text-[30px] leading-tight font-black">{city.name}</span>
              <span className="text-sm font-extrabold opacity-90">
                {cityKind(city)}
                {prov && ` · ${prov.name}`}
              </span>
            </div>
            {(content?.nickname || city.pop > 0) && (
              <div className="text-[14px] font-bold opacity-90">
                {content?.nickname && <span className="whitespace-nowrap">别称“{content.nickname}”</span>}
                {content?.nickname && city.pop > 0 && ' · '}
                {city.pop > 0 && <span className="whitespace-nowrap">人口约{city.pop >= 100 ? Math.round(city.pop / 10) * 10 : city.pop}万</span>}
              </div>
            )}
          </div>
          <Photo k={`city/${id}`} />
        </div>

        <Fold id="city-intro" title="简介">
          <div className="rounded-2xl bg-paper p-4 text-[19px] text-paper-text">
            <ZhText id={`city-${id}`} paras={hasPage ? content!.intro : [{ kind: 'p', sentences: content?.facts ?? [] }]} glossary={file.glossary} source={source} />
          </div>
        </Fold>

        <Fold id="city-eggs" title="聊天彩蛋" count={eggCount} icon={<ChatCircleDotsIcon size={22} weight="fill" className="shrink-0 text-lv" />}>
          {links && <EggSection key={id} groups={groups} links={links} />}
        </Fold>

        {hasPage && (
          <div className="mt-5">
            <ReadMark readAt={row?.read} onRead={() => markCityRead(id, content!.chars)} onUnread={() => markCityUnread(id)} />
          </div>
        )}

        <Fold id="city-map" title={prov ? `地图 · ${prov.name}` : '地图'}>
          <div className="tile overflow-hidden">
            <ProvinceMap prov={city.prov} current={id} names={names} learnt={isLearnt} stories={written} color={color} sights={pins} />
          </div>
          <MapKey sights={pins.length > 0} />
          <div className="mt-3 flex gap-2">
            <LearntButton on={learnt} onToggle={() => setLearnt('city', id, !learnt)} />
            <Button tone="plain" size="md" className="h-12 min-w-0 flex-1 border-2 border-line !px-3" onClick={() => go(`map/city/${id}`)}>
              <MapPinIcon size={20} weight="fill" style={{ color }} /> 在大地图上看
            </Button>
          </div>
        </Fold>

        {pages.length > 0 && (
          <Fold id="city-wiki" title={`${city.name}百科`} count={pages.length} icon={<BooksIcon size={22} weight="fill" className="shrink-0" style={{ color }} />}>
            <PhotoRow title={`去${city.name}，必看`} pages={sights} seen={seen} />
            <PeopleRow title={`${city.name}的人物`} pages={people} seen={seen} />
            <PhotoRow title="故事 · 传说 · 美食" pages={tales} seen={seen} />
          </Fold>
        )}

        {(stories.length > 0 || prov) && (
          <Fold id="city-related" title="相关" count={stories.length || undefined} defaultOpen={false}>
            {stories.length > 0 && (
              <ul className="tile mb-4 divide-y-2 divide-line">
                {stories.map((c) => (
                  <li key={c.id}>
                    <button onClick={() => go(`feed/${c.id}`)} className="block w-full px-4 py-3 text-left font-bold">
                      {c.title.flatMap((s) => s.tokens.map((t) => t.t)).join('')}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {prov && (
              <>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <span className="text-sm font-extrabold text-mute">{prov.name}的城市</span>
                  <button className="text-sm font-extrabold text-lv" onClick={() => go(`place/${prov.id}`)}>
                    去{prov.name} →
                  </button>
                </div>
                <CityChips ids={siblings.map((c) => c.id)} current={id} learnt={marks.learnt} stories={written} />
              </>
            )}
          </Fold>
        )}
      </div>
    </div>
  )
}

/** Cities as tappable chips: ★ capital, bold if it has a page, ✓ if learnt. */
export function CityChips({ ids, current, learnt, stories }: { ids: string[]; current?: string; learnt: Set<string>; stories: Set<string> }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ids.map((cid) => {
        const c = CITY_BY_ID.get(cid)!
        const on = learnt.has(markKey('city', cid))
        return (
          <button
            key={cid}
            disabled={cid === current}
            onClick={() => go(`city/${cid}`)}
            className={`tile flex h-10 items-center gap-1 px-3 text-[15px] disabled:border-text ${stories.has(cid) ? 'font-black' : 'font-bold text-mute'}`}
          >
            {c.kind === 'capital' && <span className="text-zhu">★</span>}
            {c.name}
            {on && <span className="text-lv">✓</span>}
          </button>
        )
      })}
    </div>
  )
}
