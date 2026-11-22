// Downloads the photos listed in content/images.yml (plus a default photo for every other city)
// from Wikimedia Commons, shrinks them to 640px JPEGs in public/img/, and records who took each one
// and its licence in content/images.lock.json. Re-runs only fetch keys whose entry changed.
//
//   npm run images            fetch what's new or changed
//   npm run images -- --force fetch everything again
//   npm run images -- --only place/fujian,city/guangzhou fetch selected keys only
//
// Only CC0, public-domain, CC BY and CC BY-SA photos are kept.
import { readFile, readdir, writeFile, mkdir, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { dirname } from 'node:path'
import { parse as parseYaml } from 'yaml'

const UA = 'ZhongguotongImageFetcher/1.0 (build script for a Chinese-learning app)'
const WIDTH = 640
const QUALITY = '50'
const LOCK = 'content/images.lock.json'
const FORCE = process.argv.includes('--force')
const onlyArg = process.argv.indexOf('--only')
const ONLY = onlyArg >= 0
  ? new Set((process.argv[onlyArg + 1] ?? '').split(',').map((key) => key.trim()).filter(Boolean))
  : null
const FREE = /^(cc0|public domain|pd\b|pd-|cc[ -]by(-sa)?[ -]\d)/i
/** A city's own Wikidata photo is sometimes a map or a coat of arms: skip those. */
const NOT_A_PHOTO = /map|location|locator|flag|emblem|logo|seal|administrative|montage-map|\.svg$|地图|位置|区划/i

const manifest = parseYaml(await readFile('content/images.yml', 'utf8'))
const lock = existsSync(LOCK) ? JSON.parse(await readFile(LOCK, 'utf8')) : {}
const detail = JSON.parse(await readFile('src/data/china-detail.json', 'utf8'))
const raw = JSON.parse(await readFile('data/raw/wikidata-cities.json', 'utf8'))

// Each city's own Wikidata item, by full Chinese name (biggest wins, as in the map data)
const qidByName = new Map()
for (const b of raw.results.bindings) {
  const name = b.zh?.value
  const pop = Number(b.pop?.value ?? 0)
  const prev = qidByName.get(name)
  if (!prev || pop > prev.pop) qidByName.set(name, { qid: b.item.value.split('/').pop(), pop })
}

/** key → spec: what each photo should show */
const jobs = new Map()
for (const [key, spec] of Object.entries(manifest)) jobs.set(key, String(spec).trim())
// 百科 pages name their own photo in their frontmatter (image: 钱塘江大桥 / Q… / File:…)
if (existsSync('content/wiki'))
  for (const file of (await readdir('content/wiki')).filter((f) => f.endsWith('.md'))) {
    const m = (await readFile(`content/wiki/${file}`, 'utf8')).match(/^---\n([\s\S]*?)\n---/)
    const meta = m ? parseYaml(m[1]) : {}
    if (meta?.id && meta.image && !jobs.has(`wiki/${meta.id}`)) jobs.set(`wiki/${meta.id}`, String(meta.image).trim())
  }
for (const c of detail.cities) {
  const key = `city/${c.id}`
  if (jobs.has(key)) continue
  if (c.kind === 'muni') jobs.set(key, `=place/${c.prov}`)
  else if (qidByName.has(c.full)) jobs.set(key, `${qidByName.get(c.full).qid}?`)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
/** Wikimedia asks scripts to go slowly: one request at a time, a pause between them, and to back off on 429. */
// Image files are throttled much harder than the APIs, so they get a longer gap
const last = new Map()
async function polite(url, init = {}, maxTries = 6) {
  const host = new URL(url).host
  const gap = host === 'thumb.wikimedia.org' || host === 'upload.wikimedia.org' ? 2000 : 900
  for (let tries = 0; ; tries++) {
    const wait = (last.get(host) ?? 0) + gap - Date.now()
    if (wait > 0) await sleep(wait)
    last.set(host, Date.now())
    const r = await fetch(url, { ...init, headers: { 'User-Agent': UA, ...init.headers } })
    if (r.ok) return r
    if (tries + 1 >= maxTries || (r.status !== 429 && r.status < 500)) throw new Error(`${r.status} ${url}`)
    const after = Number(r.headers.get('retry-after')) || 10 * 2 ** tries
    console.log(`  ${r.status}, waiting ${after}s…`)
    await sleep(after * 1000)
  }
}
const api = async (host, params) =>
  (await polite(`https://${host}/w/api.php?${new URLSearchParams({ format: 'json', formatversion: '2', ...params })}`)).json()

const fileOf = (url) => decodeURIComponent(url.split('/Special:FilePath/')[1] ?? '').replace(/_/g, ' ')

/** One SPARQL query (one request, however many things it asks about). */
async function sparql(query) {
  const r = await polite('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' },
    body: new URLSearchParams({ query }).toString(),
  })
  return (await r.json()).results.bindings
}

/** The photo (P18) of some Wikidata items. */
async function photosOf(qids) {
  const out = new Map()
  for (let i = 0; i < qids.length; i += 150) {
    const rows = await sparql(`SELECT ?item ?img ?label ?desc WHERE {
      VALUES ?item { ${qids.slice(i, i + 150).map((q) => `wd:${q}`).join(' ')} }
      ?item wdt:P18 ?img .
      OPTIONAL { ?item rdfs:label ?label FILTER(LANG(?label) = "zh") }
      OPTIONAL { ?item schema:description ?desc FILTER(LANG(?desc) = "zh") }
    }`)
    for (const r of rows) {
      const id = r.item.value.split('/').pop()
      if (!out.has(id)) out.set(id, { file: fileOf(r.img.value), label: r.label?.value ?? '', desc: r.desc?.value ?? '' })
    }
  }
  return out
}

/**
 * Items whose Chinese name (or alias) is exactly one of these names, with a photo.
 * Several items can share a name (南湖, 开元寺): a "(城市)" hint picks the one in that city,
 * otherwise the best-known one (most Wikipedia articles) wins.
 */
async function byName(specs) {
  const parsed = specs.map((spec) => {
    const m = spec.match(/^(.*?)\s*\((.+)\)$/)
    return { spec, name: m ? m[1] : spec, hint: m?.[2] }
  })
  const names = [...new Set(parsed.map((p) => p.name))]
  const found = new Map()
  for (let i = 0; i < names.length; i += 60) {
    // Chinese names in any script (Taiwan places are often labelled in traditional characters), or an English name
    const langs = (n) => (/^[\x00-\x7F]+$/.test(n) ? ['en'] : ['zh', 'zh-cn', 'zh-hans', 'zh-tw', 'zh-hant', 'zh-hk'])
    const values = names.slice(i, i + 60).flatMap((n) => langs(n).map((l) => `${JSON.stringify(n)}@${l}`)).join(' ')
    const rows = await sparql(`SELECT ?name ?item ?img ?links ?desc WHERE {
      VALUES ?name { ${values} }
      ?item rdfs:label|skos:altLabel ?name ; wdt:P18 ?img ; wikibase:sitelinks ?links .
      OPTIONAL { ?item schema:description ?desc FILTER(LANG(?desc) = "zh") }
    }`)
    for (const r of rows) {
      const name = r.name.value
      const list = found.get(name) ?? []
      const qid = r.item.value.split('/').pop()
      if (!list.some((c) => c.qid === qid)) list.push({ qid, file: fileOf(r.img.value), label: name, desc: r.desc?.value ?? '', links: Number(r.links.value) })
      found.set(name, list)
    }
  }
  const out = new Map()
  for (const { spec, name, hint } of parsed) {
    const list = (found.get(name) ?? []).sort((a, b) => b.links - a.links)
    if (!list.length) continue
    let pick = list[0]
    if (hint && list.length > 1) {
      const rows = await sparql(`SELECT DISTINCT ?item WHERE {
        VALUES ?item { ${list.map((c) => `wd:${c.qid}`).join(' ')} }
        ?item wdt:P131+ ?a . ?a rdfs:label ?al . FILTER(LANG(?al) = "zh" && CONTAINS(?al, ${JSON.stringify(hint)}))
      }`)
      const inHint = new Set(rows.map((r) => r.item.value.split('/').pop()))
      pick = list.find((c) => inHint.has(c.qid) || c.desc.includes(hint)) ?? pick
    }
    out.set(spec, pick)
  }
  return out
}

/**
 * Where to download a file from, best first. Commons answers a 960px request for a file narrower
 * than that with the original itself, and originals are throttled far harder than thumbnails
 * (they 429 run after run), so ask for a standard thumbnail size first and the original last.
 */
function downloadUrls(info) {
  if (/\/\d+px-/.test(info.thumb)) return [info.thumb, info.thumb.replace(/\/\d+px-/, '/500px-')]
  const m = (info.url ?? '').split('?')[0].match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(.+)\/([^/]+)$/)
  const thumbs = m ? [500, 330, 250].filter((w) => info.width > w).map((w) => `${m[1]}/thumb/${m[2]}/${m[3]}/${w}px-${m[3]}`) : []
  return [...new Set([...thumbs, info.thumb])]
}

/** Commons details (licence, author, a 960px thumbnail) for some files. */
async function fileInfo(files) {
  const out = new Map()
  for (let i = 0; i < files.length; i += 50) {
    const chunk = files.slice(i, i + 50)
    const res = await api('commons.wikimedia.org', {
      action: 'query',
      titles: chunk.map((f) => `File:${f}`).join('|'),
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|size|mime',
      iiurlwidth: '960',
    })
    const back = new Map((res.query?.normalized ?? []).map((n) => [n.to, n.from]))
    for (const p of res.query?.pages ?? []) {
      const ii = p.imageinfo?.[0]
      if (!ii) continue
      const asked = (back.get(p.title) ?? p.title).replace(/^File:/, '')
      const meta = ii.extmetadata ?? {}
      const strip = (s = '') => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
      out.set(asked, {
        thumb: ii.thumburl ?? ii.url,
        url: ii.url,
        mime: ii.mime,
        width: ii.width,
        page: ii.descriptionurl,
        license: strip(meta.LicenseShortName?.value),
        artist: strip(meta.Artist?.value).slice(0, 80) || 'Wikimedia Commons',
      })
    }
  }
  return out
}

// hand-picked photos first, a city's own default photo last
const todo = [...jobs].filter(([key, spec]) => FORCE || lock[key]?.spec !== spec).sort(([, a], [, b]) => Number(a.endsWith('?')) - Number(b.endsWith('?')))
if (ONLY) {
  const unknown = [...ONLY].filter((key) => !jobs.has(key))
  if (!ONLY.size || unknown.length) throw new Error(`--only needs known image keys${unknown.length ? `; unknown: ${unknown.join(', ')}` : ''}`)
  todo.splice(0, todo.length, ...todo.filter(([key]) => ONLY.has(key)))
}
console.log(`${todo.length} of ${jobs.size} photos to fetch`)
const save = () => writeFile(LOCK, `${JSON.stringify(Object.fromEntries(Object.entries(lock).sort(([a], [b]) => a.localeCompare(b))), null, 1)}\n`)

// 1. Which file each key should use
const chosen = new Map()
const isQ = (s) => /^Q\d+\??$/.test(s)
const qids = [...new Set(todo.filter(([, s]) => isQ(s)).map(([, s]) => s.replace('?', '')))]
const byQid = await photosOf(qids)
const names = [...new Set(todo.map(([, s]) => s).filter((s) => !isQ(s) && s !== 'none' && !s.startsWith('=') && !s.startsWith('File:')))]
const named = await byName(names)
console.log(`  ${byQid.size}/${qids.length} items and ${named.size}/${names.length} names have a photo`)
for (const [key, spec] of todo) {
  if (spec === 'none' || spec.startsWith('=')) continue
  let pick
  if (spec.startsWith('File:')) pick = { file: spec.slice(5), label: '', desc: '' }
  else if (isQ(spec)) {
    const qid = spec.replace('?', '')
    const i = byQid.get(qid)
    if (i && !(spec.endsWith('?') && NOT_A_PHOTO.test(i.file))) pick = { qid, ...i }
  } else pick = named.get(spec)
  if (pick) chosen.set(key, pick)
  else console.log(`  no photo: ${key} (${spec}): try another name, a Q-id or a File: in images.yml`)
}

// 2. Check licences and download
const infos = await fileInfo([...new Set([...chosen.values()].map((c) => c.file))])
let got = 0
for (const [key, spec] of todo) {
  const out = `public/img/${key}.jpg`
  const c = chosen.get(key)
  const info = c && infos.get(c.file)
  if (!c || !info || !FREE.test(info.license) || /svg/.test(info.mime)) {
    if (c && info) console.log(`  skipped ${key}: ${c.file} (${info.license || 'no licence'})`)
    if (c && !info) console.log(`  no Commons info for ${key}: ${c.file}`)
    if (existsSync(out)) await unlink(out)
    // remember the choice so re-runs don't look it up again; no file means no photo
    lock[key] = { spec }
    continue
  }
  await mkdir(dirname(out), { recursive: true })
  // A big original can be refused (429) while its thumbnail is rendered: try a smaller standard size,
  // then leave it for the next run rather than waiting on it
  let r
  for (const url of downloadUrls(info)) {
    try {
      r = await polite(url, {}, 1)
      break
    } catch (e) {
      console.log(`  ${new Date().toTimeString().slice(0, 8)} refused ${key}: ${e.message.slice(0, 3)}`)
    }
  }
  if (!r) continue
  const tmp = `${out}.orig`
  await writeFile(tmp, Buffer.from(await r.arrayBuffer()))
  // never stretch: a 500px fallback of a 633px original stays 500px
  const got0 = process.platform === 'darwin'
    ? Number(execFileSync('sips', ['-g', 'pixelWidth', tmp]).toString().match(/pixelWidth: (\d+)/)?.[1])
    : Number(execFileSync('magick', ['identify', '-format', '%w', tmp]).toString())
  const width = String(Math.min(WIDTH, info.width || WIDTH, got0 || WIDTH))
  if (process.platform === 'darwin') {
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', QUALITY, '--resampleWidth', width, tmp, '--out', out], { stdio: 'ignore' })
  } else {
    execFileSync('magick', [tmp, '-resize', `${width}x`, '-quality', QUALITY, out], { stdio: 'ignore' })
  }
  await unlink(tmp)
  const dims = process.platform === 'darwin'
    ? execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', out]).toString()
    : execFileSync('magick', ['identify', '-format', '%w %h', out]).toString()
  const [w, h] = process.platform === 'darwin'
    ? [Number(dims.match(/pixelWidth: (\d+)/)[1]), Number(dims.match(/pixelHeight: (\d+)/)[1])]
    : dims.split(' ').map(Number)
  lock[key] = { spec, qid: c.qid, label: c.label, desc: c.desc, file: c.file, page: info.page, artist: info.artist, license: info.license, w, h }
  console.log(`  ${new Date().toTimeString().slice(0, 8)} ${key}`)
  if (++got % 5 === 0) {
    await save()
    console.log(`  downloaded ${got}…`)
  }
}

// Keys removed from the manifest (and not a default city) lose their photo
for (const key of Object.keys(lock)) {
  if (jobs.has(key)) continue
  delete lock[key]
  if (existsSync(`public/img/${key}.jpg`)) await unlink(`public/img/${key}.jpg`)
}

await save()
const have = Object.values(lock).filter((e) => e.file).length
console.log(`${got} downloaded, ${have} photos in all`)
