import { Photo } from '../components/Photo.tsx'
import { useEffect } from 'react'
import { ChatCircleDotsIcon, LightbulbIcon, MapPinIcon } from '@phosphor-icons/react'
import { db, type WordSource } from '../lib/db.ts'
import { loadCities, loadPlaces, useLoad } from '../lib/content.ts'
import { CITY_BY_ID, cityKind, citiesOf } from '../lib/cities.ts'
import { markCityRead, markCityUnread, markKey, setLearnt, useMarks, visitCity } from '../lib/learn.ts'
import { useLiveQuery } from '../lib/live.ts'
import { regionColor } from '../lib/places.ts'
import { go } from '../lib/router.ts'
import { LearntButton } from '../components/LearntButton.tsx'
import { ReadMark } from '../components/ReadMark.tsx'
import { StaticMap, provinceBox } from '../components/StaticMap.tsx'
import { Button, Loading, PageHeader, Section } from '../components/ui.tsx'
import { ZhText } from '../components/ZhText.tsx'

/** One city: what it's like, things to chat about, and where it is. */
export function CityPage({ id }: { id: string }) {
  const city = CITY_BY_ID.get(id)
  const file = useLoad(loadCities, 'cities').data
  const placesFile = useLoad(loadPlaces, 'places').data
  const marks = useMarks()
  const row = useLiveQuery(() => db.cities.get(id), [id])
  useEffect(() => {
    visitCity(id)
  }, [id])

  if (!city) return <PageHeader title="找不到这个城市" fallback="map/china" />
  if (!file || !placesFile) return <Loading />
  const content = file.cities.find((c) => c.id === id)
  const prov = placesFile.places.find((p) => p.id === city.prov)
  const color = prov ? regionColor(prov.region) : '#425066'
  const source: WordSource = { kind: 'place', route: `city/${id}`, title: `${city.name} · 地图` }
  const siblings = citiesOf(city.prov).filter((c) => c.kind !== 'muni')
  const learnt = marks.learnt.has(markKey('city', id))
  const written = !!content?.intro.length

  return (
    <div className="pb-12">
      <PageHeader title={city.full} fallback="map/china" />
      <div className="mx-auto max-w-xl px-4">
        <div className="tile overflow-hidden">
          <div className="p-5 text-white" style={{ background: color }}>
            <div className="text-sm font-extrabold opacity-90">
              {cityKind(city)}
              {prov && ` · ${prov.name}`}
            </div>
            <div className="text-[34px] leading-tight font-black">{city.name}</div>
            {(content?.nickname || city.pop > 0) && (
              <div className="mt-1 text-[15px] font-bold opacity-90">
                {content?.nickname && <span className="whitespace-nowrap">别称“{content.nickname}”</span>}
                {content?.nickname && city.pop > 0 && ' · '}
                {city.pop > 0 && <span className="whitespace-nowrap">人口约{city.pop >= 100 ? Math.round(city.pop / 10) * 10 : city.pop}万</span>}
              </div>
            )}
          </div>
          <Photo k={`city/${id}`} />
          <StaticMap box={provinceBox(city.prov)} focus={city.prov} dots={siblings} target={id} color={color} />
          <div className="flex gap-2 p-3">
            <LearntButton on={learnt} onToggle={() => setLearnt('city', id, !learnt)} />
            <Button tone="plain" size="md" className="h-12 min-w-0 flex-1 border-2 border-line !px-3" onClick={() => go(`map/city/${id}`)}>
              <MapPinIcon size={20} weight="fill" style={{ color }} /> 在大地图上看
            </Button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-paper p-4 text-[19px] text-paper-text">
          <ZhText id={`city-${id}`} paras={written ? content!.intro : [{ kind: 'p', sentences: content?.facts ?? [] }]} glossary={file.glossary} source={source} />
        </div>

        {written && content!.eggs.length > 0 && (
          <Section
            title={
              <span className="flex items-center gap-2">
                <ChatCircleDotsIcon size={24} weight="fill" className="text-lv" /> 聊天彩蛋
              </span>
            }
          >
            <p className="-mt-1 mb-3 px-1 text-sm font-bold text-mute">跟{city.name}人聊天的时候，可以聊聊这些。</p>
            <div className="space-y-3">
              {content!.eggs.map((egg, i) => (
                <div key={i} className="tile flex gap-3 p-4">
                  <LightbulbIcon size={22} weight="fill" className="mt-1.5 shrink-0 text-huang-dark" />
                  <ZhText id={`city-egg-${id}-${i}`} paras={[{ ...egg, kind: 'p' }]} glossary={file.glossary} source={source} className="min-w-0 flex-1 text-[18px]" />
                </div>
              ))}
            </div>
          </Section>
        )}

        {written && (
          <div className="mt-6">
            <ReadMark readAt={row?.read} onRead={() => markCityRead(id, content!.chars)} onUnread={() => markCityUnread(id)} />
          </div>
        )}

        {prov && (
          <Section
            title={`${prov.name}的城市`}
            action={
              <button className="text-sm font-extrabold text-lv" onClick={() => go(`place/${prov.id}`)}>
                {prov.name}
              </button>
            }
          >
            <CityChips ids={siblings.map((c) => c.id)} current={id} learnt={marks.learnt} stories={new Set(file.cities.filter((c) => c.intro.length).map((c) => c.id))} />
          </Section>
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
