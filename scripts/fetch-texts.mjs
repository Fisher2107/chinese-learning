// Downloads the public-domain full texts from Chinese Wikisource and writes them
// to content/texts/ in simplified characters. Run by hand when adding a text:
//   node scripts/fetch-texts.mjs
import { writeFile, mkdir } from 'node:fs/promises'
import * as OpenCC from 'opencc-js'

const UA = 'zhongguotong/0.1 (personal Chinese-learning app; github.com/Fisher2107/chinese-learning)'
const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' })

const TEXTS = [
  {
    id: 'bai-niangzi',
    page: '警世通言/第28卷',
    title: '白娘子永镇雷峰塔',
    author: '冯梦龙',
    year: 1624,
    from: '《警世通言》第二十八卷',
    places: ['hangzhou', 'zhenjiang'],
  },
  {
    id: 'lun-leifengta',
    page: '論雷峰塔的倒掉',
    title: '论雷峰塔的倒掉',
    author: '鲁迅',
    year: 1924,
    from: '《坟》',
    places: ['hangzhou'],
  },
  {
    id: 'guxiang',
    page: '故鄉',
    title: '故乡',
    author: '鲁迅',
    year: 1921,
    from: '《呐喊》',
    places: ['shaoxing'],
  },
]

function htmlToParagraphs(html) {
  return html
    .replace(/<(style|script)[\s\S]*?<\/\1>/g, '')
    .replace(/<div class="(?:ws-noexport|licenseContainer|mw-references-wrap)[\s\S]*$/g, '')
    .replace(/<table[\s\S]*?<\/table>/g, '')
    .replace(/<sup[\s\S]*?<\/sup>/g, '')
    .replace(/<span class="pagenum[\s\S]*?<\/span>/g, '')
    .replace(/\n/g, '')
    .replace(/<br\s*\/?>/g, '')
    .replace(/<\/(p|div|dd|li|h\d)>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#160;|&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .split('\n')
    .map((line) => line.replace(/[\s　]+/g, '').trim())
    .filter((line) => /[一-鿿]/.test(line) && line.length > 8 && !line.includes('姊妹计划'))
}

for (const t of TEXTS) {
  const url = `https://zh.wikisource.org/w/api.php?action=parse&format=json&formatversion=2&prop=text&variant=zh-hans&page=${encodeURIComponent(t.page)}`
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${t.page}: HTTP ${res.status}`)
  const { parse } = await res.json()
  const paragraphs = htmlToParagraphs(parse.text).map(toSimplified)
  const source = `https://zh.wikisource.org/wiki/${encodeURIComponent(t.page)}`
  const front = [
    '---',
    `id: ${t.id}`,
    `title: ${t.title}`,
    `author: ${t.author}`,
    `year: ${t.year}`,
    `from: ${t.from}`,
    `places: [${t.places.join(', ')}]`,
    `source: ${source}`,
    'license: public-domain',
    '---',
  ].join('\n')
  await mkdir('content/texts', { recursive: true })
  await writeFile(`content/texts/${t.id}.md`, `${front}\n${paragraphs.join('\n\n')}\n`)
  console.log(`${t.id}: ${paragraphs.length} paragraphs, ${paragraphs.join('').length} characters`)
}
