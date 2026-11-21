// Downloads CC-CEDICT and the HSK word lists, and turns them into the compact JSON
// files the app and the content build use. Cached in data/raw; pass --force to refresh.
//   public/data/dict.json  { word: [[pinyinNumeric, "def1/def2/…"], …] }
//   public/data/hsk.json   { word: level }   (1–6, 7 = HSK 7–9)
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { gunzipSync } from 'node:zlib'

const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz'
const HSK_URL = 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json'
const force = process.argv.includes('--force')

await mkdir('data/raw', { recursive: true })
await mkdir('public/data', { recursive: true })

async function download(url, path) {
  if (existsSync(path) && !force) return
  console.log(`Downloading ${url}`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`)
  await writeFile(path, Buffer.from(await res.arrayBuffer()))
}

// CC-CEDICT lines look like: 傳統 传统 [chuan2 tong3] /tradition/traditional/
async function buildDict() {
  const out = 'public/data/dict.json'
  if (existsSync(out) && !force) return
  await download(CEDICT_URL, 'data/raw/cedict.txt.gz')
  const text = gunzipSync(await readFile('data/raw/cedict.txt.gz')).toString('utf8')
  const dict = {}
  for (const line of text.split('\n')) {
    if (line.startsWith('#')) continue
    const m = line.match(/^\S+ (\S+) \[([^\]]+)\] \/(.+)\/\s*$/)
    if (!m) continue
    const [, simp, pinyin, defs] = m
    if (!/[\u3400-\u9fff]/.test(simp)) continue
    const kept = defs
      .split('/')
      .filter((d) => d && !d.startsWith('CL:') && !/^(old )?variant of /.test(d))
    if (!kept.length) continue
    ;(dict[simp] ??= []).push([pinyin.replace(/u:/g, 'ü'), kept.join('/')])
  }
  await writeFile(out, JSON.stringify(dict))
  console.log(`dict.json: ${Object.keys(dict).length} words`)
}

async function buildHsk() {
  const out = 'public/data/hsk.json'
  if (existsSync(out) && !force) return
  await download(HSK_URL, 'data/raw/hsk.json')
  const words = JSON.parse(await readFile('data/raw/hsk.json', 'utf8'))
  const hsk = {}
  for (const w of words) {
    const newLevels = w.level.filter((l) => l.startsWith('new-')).map((l) => Number(l.slice(4)))
    const oldLevels = w.level.filter((l) => l.startsWith('old-')).map((l) => Number(l.slice(4)))
    const levels = newLevels.length ? newLevels : oldLevels
    if (levels.length) hsk[w.simplified] = Math.min(...levels, ...oldLevels)
  }
  await writeFile(out, JSON.stringify(hsk))
  console.log(`hsk.json: ${Object.keys(hsk).length} words`)
}

await buildDict()
await buildHsk()
