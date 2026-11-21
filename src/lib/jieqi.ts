/**
 * The 24 solar terms (节气) with their usual start dates. Real dates move by a day
 * from year to year; that's close enough for a banner.
 */
export interface Jieqi {
  name: string
  month: number
  day: number
  season: 'spring' | 'summer' | 'autumn' | 'winter'
  hook: string
}

export const JIEQI: Jieqi[] = [
  { name: '小寒', month: 1, day: 5, season: 'winter', hook: '一年里最冷的日子快到了。北方人说：“小寒大寒，冻成一团。”' },
  { name: '大寒', month: 1, day: 20, season: 'winter', hook: '最后一个节气。过了大寒，家家户户就要准备过年了。' },
  { name: '立春', month: 2, day: 4, season: 'spring', hook: '春天开始了。很多地方这天要“咬春”，吃春饼、春卷。' },
  { name: '雨水', month: 2, day: 19, season: 'spring', hook: '天气变暖，雨慢慢多了起来。' },
  { name: '惊蛰', month: 3, day: 5, season: 'spring', hook: '春雷响了，冬眠的虫子都被“惊”醒了。' },
  { name: '春分', month: 3, day: 20, season: 'spring', hook: '白天和黑夜一样长。有人喜欢在这天试着把鸡蛋立起来。' },
  { name: '清明', month: 4, day: 5, season: 'spring', hook: '扫墓、踏青的日子。《白蛇传》的故事，也是从清明节那场雨开始的。' },
  { name: '谷雨', month: 4, day: 20, season: 'spring', hook: '雨水帮谷物生长。这时候也是喝新茶的好季节，比如杭州的龙井。' },
  { name: '立夏', month: 5, day: 5, season: 'summer', hook: '夏天开始了。江南有的地方，这天要给孩子称一称体重。' },
  { name: '小满', month: 5, day: 21, season: 'summer', hook: '麦子快熟了，但还没熟透。“小满”就好，不求太满。' },
  { name: '芒种', month: 6, day: 5, season: 'summer', hook: '农民最忙的时候：又要收麦子，又要种稻子。' },
  { name: '夏至', month: 6, day: 21, season: 'summer', hook: '一年里白天最长的一天。北方人说：“冬至饺子夏至面。”' },
  { name: '小暑', month: 7, day: 7, season: 'summer', hook: '真正的热，从现在开始。' },
  { name: '大暑', month: 7, day: 22, season: 'summer', hook: '一年里最热的时候，“三伏天”大多在这段时间。' },
  { name: '立秋', month: 8, day: 7, season: 'autumn', hook: '秋天开始了。北方有“贴秋膘”的习俗：吃顿肉，补一补。' },
  { name: '处暑', month: 8, day: 23, season: 'autumn', hook: '“{处|chǔ}”是结束的意思：热天快过去了。' },
  { name: '白露', month: 9, day: 7, season: 'autumn', hook: '早上的草上开始有白色的露水了。' },
  { name: '秋分', month: 9, day: 23, season: 'autumn', hook: '白天和黑夜又一样长了。这一天也是“中国农民丰收节”。' },
  { name: '寒露', month: 10, day: 8, season: 'autumn', hook: '露水变凉了。很多人这时候去爬山、看红叶。' },
  { name: '霜降', month: 10, day: 23, season: 'autumn', hook: '开始下霜了。很多地方这时候爱吃柿子。' },
  { name: '立冬', month: 11, day: 7, season: 'winter', hook: '冬天开始了。很多北方人这天要吃饺子。' },
  { name: '小雪', month: 11, day: 22, season: 'winter', hook: '开始下雪了，但雪还不大。南方有的地方开始做腊肉了。' },
  { name: '大雪', month: 12, day: 7, season: 'winter', hook: '雪越下越大。有句老话叫“瑞雪兆丰年”。' },
  { name: '冬至', month: 12, day: 21, season: 'winter', hook: '一年里白天最短的一天。北方吃饺子，南方吃汤圆——你站哪边？' },
]

/** The term we are in now, and the next one with the number of days until it. */
export function currentJieqi(now = new Date()) {
  const y = now.getFullYear()
  const at = (j: Jieqi, year = y) => new Date(year, j.month - 1, j.day)
  const start = new Date(y, now.getMonth(), now.getDate())
  let i = JIEQI.findLastIndex((j) => at(j) <= start)
  if (i < 0) i = JIEQI.length - 1 // early January: still 冬至 of last year
  const next = JIEQI[(i + 1) % JIEQI.length]
  const nextDate = at(next, next.month < JIEQI[i].month ? y + 1 : y)
  const days = Math.round((nextDate.getTime() - start.getTime()) / 86400000)
  return { term: JIEQI[i], next, days }
}
