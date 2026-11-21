import { Photo } from '../components/Photo.tsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { ArrowRightIcon, CheckCircleIcon, ExamIcon, ListBulletsIcon, XCircleIcon } from '@phosphor-icons/react'
import { db, type WordSource } from '../lib/db.ts'
import { CITY_BY_ID, DETAIL, cityKind, citiesOf } from '../lib/cities.ts'
import { recordTest, type PlaceKind } from '../lib/learn.ts'
import { boxOf, MAP_BY_ID } from '../lib/places.ts'
import { go } from '../lib/router.ts'
import { NameWord } from '../components/LearntButton.tsx'
import { CHINA_BOX, StaticMap, provinceBox } from '../components/StaticMap.tsx'
import { Button, Loading, PageHeader, ProgressBar } from '../components/ui.tsx'

interface Q {
  kind: PlaceKind
  id: string
  name: string
  full: string
  py: string
  pin: string
  prov: string
}

const PLACE_NAMES = DETAIL.placeNames as Record<string, { name: string; full: string; py: string; pin: string }>

function toQ(kind: PlaceKind, id: string): Q | undefined {
  if (kind === 'province') {
    const p = PLACE_NAMES[id]
    return p && { kind, id, ...p, prov: id }
  }
  const c = CITY_BY_ID.get(id)
  return c && { kind, id, name: c.name, full: c.full, py: c.py, pin: c.pin, prov: c.prov }
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a]
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[b[i], b[j]] = [b[j], b[i]]
  }
  return b
}

const clean = (s: string) => s.toLowerCase().replace(/[\s'’·,，。.!！?？“”"]/g, '').replace(/ü/g, 'v')
const strip = (s: string) => s.replace(/(特别行政区|维吾尔自治区|壮族自治区|回族自治区|自治区|自治州|地区|省|市|盟)$/, '')

/** Right if it's the name with or without 省/市/自治区…, or its pinyin without tones. */
export function isRight(q: Q, given: string): boolean {
  const g = clean(given)
  if (!g) return false
  for (const n of [q.name, q.full]) if (clean(n) === g || strip(clean(n)) === strip(g)) return true
  const pin = q.pin.replace(/-.*$/, '')
  return g === pin || g === q.id || g === pin.replace(/(shi|sheng)$/, '')
}

/** Four names to pick from: neighbours or cities of the same province make it a real choice. */
function optionsFor(q: Q): string[] {
  let pool: string[]
  if (q.kind === 'province') {
    const near = (MAP_BY_ID.get(q.id)?.neighbours ?? []).map((n) => PLACE_NAMES[n]?.name).filter(Boolean)
    pool = [...shuffle(near), ...shuffle(Object.values(PLACE_NAMES).map((p) => p.name))]
  } else {
    pool = [...shuffle(citiesOf(q.prov).map((c) => c.name)), ...shuffle(DETAIL.cities.filter((c) => c.rank <= 3).map((c) => c.name))]
  }
  const others = [...new Set(pool.filter((n) => n !== q.name))].slice(0, 3)
  return shuffle([q.name, ...others])
}

const SMALL = new Set(['beijing', 'tianjin', 'shanghai', 'xianggang', 'aomen'])

/** 认地图: every place marked 学会了, shown on a map with no names. Type the name (or pick it). */
export function MapTest() {
  const [round, setRound] = useState(0)
  const [only, setOnly] = useState<string[]>()
  const [qs, setQs] = useState<Q[]>()
  const [i, setI] = useState(0)
  const [answer, setAnswer] = useState('')
  const [options, setOptions] = useState<string[]>()
  const [result, setResult] = useState<{ right: boolean; given: string }>()
  const [log, setLog] = useState<{ q: Q; right: boolean }[]>([])
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      const [places, cities] = await Promise.all([db.places.toArray(), db.cities.toArray()])
      const all = [
        ...places.filter((p) => p.learnt).map((p) => toQ('province', p.id)),
        ...cities.filter((c) => c.learnt).map((c) => toQ('city', c.id)),
      ].filter((q): q is Q => !!q)
      setQs(shuffle(only ? all.filter((q) => only.includes(`${q.kind}:${q.id}`)) : all))
      setI(0)
      setLog([])
    })()
  }, [round, only])

  const q = qs?.[i]
  const view = useMemo(() => {
    if (!q) return undefined
    if (q.kind === 'city') {
      const siblings = citiesOf(q.prov).filter((c) => c.kind !== 'muni')
      return { box: provinceBox(q.prov), focus: q.prov, dots: siblings, target: q.id }
    }
    if (SMALL.has(q.id)) return { box: boxOf([q.id, ...(MAP_BY_ID.get(q.id)?.neighbours ?? [])], 10), focus: q.id }
    return { box: CHINA_BOX, focus: q.id }
  }, [q])

  if (!qs) return <Loading />
  if (!qs.length)
    return (
      <div className="mx-auto max-w-md px-6">
        <PageHeader close fallback="map" />
        <div className="pt-16 text-center">
          <ExamIcon size={64} weight="fill" className="mx-auto text-mute" />
          <h1 className="mt-3 text-[22px] font-black">还没有学会的地方</h1>
          <p className="mt-1 font-bold text-mute">在地图上点一个省或者城市，按“学会了”，它就会出现在这里。</p>
          <Button tone="lv" className="mt-6 w-full" onClick={() => go('map', true)}>
            去地图
          </Button>
        </div>
      </div>
    )

  if (!q) return <Done log={log} onAgain={(ids) => (setOnly(ids), setRound((r) => r + 1))} />

  const source: WordSource = { kind: 'place', route: q.kind === 'city' ? `city/${q.id}` : `place/${q.id}`, title: '认地图' }
  const gloss = q.kind === 'city' ? `${cityKind(CITY_BY_ID.get(q.id)!)} · ${PLACE_NAMES[q.prov]?.name ?? ''}` : PLACE_NAMES[q.id]?.full ?? ''

  async function check(given: string) {
    if (result || !q) return
    const right = isRight(q, given)
    setResult({ right, given })
    setLog((l) => [...l, { q, right }])
    await recordTest(q.kind, q.id, right)
  }
  function next() {
    setResult(undefined)
    setAnswer('')
    setOptions(undefined)
    setI((n) => n + 1)
    setTimeout(() => input.current?.focus(), 50)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <PageHeader close fallback="map" title={<ProgressBar value={i / qs.length} color="#ED5126" />} />
      <div className="flex-1 px-4 pb-56">
        <div className="flex items-center justify-between text-sm font-black text-zhu">
          <span className="flex items-center gap-1.5">
            <ExamIcon size={18} weight="fill" /> 认地图
          </span>
          <span className="text-mute">
            {i + 1}/{qs.length}
          </span>
        </div>
        <motion.div key={`${q.kind}-${q.id}-${i}`} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
          <div className="tile mt-2 overflow-hidden">{view && <StaticMap {...view} />}</div>
          <h2 className="mt-4 text-[22px] font-black">{q.kind === 'city' ? '红点是哪个城市？' : '涂红的是哪儿？'}</h2>

          {options ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {options.map((o) => {
                const right = result && o === q.name
                const wrong = result && !result.right && o === result.given
                return (
                  <button
                    key={o}
                    disabled={!!result}
                    onClick={() => check(o)}
                    className="tile flex h-16 items-center justify-center gap-2 text-[20px] font-black"
                    style={{ borderColor: right ? 'var(--color-lv)' : wrong ? 'var(--color-zhu)' : undefined, background: right ? 'var(--color-lv-soft)' : wrong ? 'var(--color-zhu-soft)' : undefined }}
                  >
                    {o}
                  </button>
                )
              })}
            </div>
          ) : (
            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault()
                check(answer)
              }}
            >
              <input
                ref={input}
                autoFocus
                value={answer}
                disabled={!!result}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="写名字（汉字或者拼音）"
                className="h-14 w-full rounded-2xl border-2 border-line bg-surface px-4 text-[20px] font-bold outline-none focus:border-dai"
              />
              {!result && (
                <div className="mt-3 flex items-center gap-3">
                  <Button tone="lv" className="flex-1" disabled={!answer.trim()}>
                    确定
                  </Button>
                  <Button tone="plain" type="button" className="border-2 border-line" onClick={() => check('')}>
                    不知道
                  </Button>
                </div>
              )}
              {!result && (
                <button type="button" onClick={() => setOptions(optionsFor(q))} className="mt-4 flex w-full items-center justify-center gap-1.5 text-[15px] font-extrabold text-mute">
                  <ListBulletsIcon size={18} weight="bold" /> 想不起来？给我四个选项
                </button>
              )}
            </form>
          )}
        </motion.div>
      </div>

      {result && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`safe-bottom fixed inset-x-0 bottom-0 z-20 border-t-2 ${result.right ? 'border-lv bg-lv-soft' : 'border-zhu bg-zhu-soft'}`}
        >
          <div className="mx-auto max-w-xl px-4 pt-4 pb-4">
            <div className={`flex items-center gap-2 text-[20px] font-black ${result.right ? 'text-lv-ink' : 'text-zhu-ink'}`}>
              {result.right ? <CheckCircleIcon size={28} weight="fill" /> : <XCircleIcon size={28} weight="fill" />}
              {result.right ? '对了！' : '是'}
              <NameWord name={q.name} py={q.py} gloss={gloss} source={source} className="text-[24px]" />
              {/* the photo ties the name to a picture: what you see when you think of the place */}
              <Photo k={q.kind === 'city' ? `city/${q.id}` : `place/${q.id}`} ratio="4 / 3" credit={false} className="ml-auto w-20 shrink-0 rounded-xl" />
            </div>
            {!result.right && result.given && <div className="mt-1 text-[15px] font-bold text-mute">你写的是“{result.given}”</div>}
            <div className="mt-3 flex gap-3">
              <Button tone={result.right ? 'lv' : 'zhu'} className="flex-1" onClick={next}>
                继续 <ArrowRightIcon size={20} weight="bold" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

function Done({ log, onAgain }: { log: { q: Q; right: boolean }[]; onAgain: (ids: string[]) => void }) {
  const right = log.filter((l) => l.right).length
  const missed = log.filter((l) => !l.right)
  return (
    <div className="mx-auto max-w-md px-6 pb-12">
      <PageHeader close fallback="map" />
      <div className="pt-6 text-center">
        <motion.div initial={{ scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}>
          <ExamIcon size={80} weight="fill" className="mx-auto text-zhu" />
        </motion.div>
        <h1 className="mt-3 text-[26px] font-black">
          {right}/{log.length} 答对了
        </h1>
        <p className="mt-1 font-bold text-mute">{missed.length ? '错的再看一看，下次就记住了。' : '全对！你对中国地图很熟了。'}</p>
      </div>
      {missed.length > 0 && (
        <div className="tile mt-6 divide-y-2 divide-line">
          {missed.map(({ q }) => (
            <button key={`${q.kind}-${q.id}`} onClick={() => go(q.kind === 'city' ? `city/${q.id}` : `place/${q.id}`)} className="flex w-full items-center gap-3 p-3 text-left">
              <XCircleIcon size={22} weight="fill" className="shrink-0 text-zhu" />
              <span className="text-[18px] font-black">{q.name}</span>
              <span className="truncate text-sm font-bold text-mute">{q.kind === 'city' ? PLACE_NAMES[q.prov]?.name : q.full}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-6 space-y-3">
        {missed.length > 0 && (
          <Button tone="zhu" className="w-full" onClick={() => onAgain(missed.map(({ q }) => `${q.kind}:${q.id}`))}>
            再考一遍错的
          </Button>
        )}
        <Button tone="plain" className="w-full border-2 border-line" onClick={() => go('map', true)}>
          回地图
        </Button>
      </div>
    </div>
  )
}
