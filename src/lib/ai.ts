import { deviceDb } from './db.ts'
import { readSettings } from './settings.ts'

export class NoKeyError extends Error {
  constructor() {
    super('还没有设置 OpenAI 密钥')
  }
}

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

const TUTOR = `你是一位耐心、有趣的中文老师。学生的中文是 HSK 5 水平，正在学习中国的地理、历史和文化，目标是能和中国人聊天。
规则：
- 用简体中文回答，尽量用 HSK 4–5 的词。学生要求时才用英文。
- 回答要短，像聊天，不要像教科书。一般不超过 120 字。
- 不要用 Markdown 标题或表格。可以用简单的换行。
- 例句要自然，最好是中国人日常真的会说的话。`

/** An OpenAI problem explained in plain Chinese, with the technical reason for reporting. */
export class AiError extends Error {
  detail?: string
  constructor(message: string, detail?: string) {
    super(message)
    this.detail = detail
  }
}

async function client() {
  const s = await readSettings()
  if (!s.apiKey) throw new NoKeyError()
  // The rest of the app works offline; answers asked before are kept and still show (see ask's cacheKey)
  if (navigator.onLine === false) throw new AiError('现在没有网络。AI功能要联网才能用，别的功能没网也能用。')
  const { default: OpenAI, APIConnectionError } = await import('openai')
  const key = s.apiKey.trim()
  return { openai: new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1 }), model: s.model.trim(), key, APIConnectionError }
}

/** Set once the model turns out not to accept the reasoning setting. */
let skipReasoning = false

/** Asks the model. With a cacheKey, the answer is kept on the device and reused next time. */
export async function ask(instructions: string, input: string | ChatMsg[], cacheKey?: string): Promise<string> {
  if (cacheKey) {
    const hit = await deviceDb.ai.get(cacheKey)
    if (hit) return hit.answer
  }
  const { openai, model, key, APIConnectionError } = await client()
  const run = (reasoning: boolean) =>
    openai.responses.create({ model, instructions, input, ...(reasoning ? { reasoning: { effort: 'low' as const } } : {}) })

  let res
  try {
    res = await run(!skipReasoning)
  } catch (e) {
    // OpenAI's error replies to POST requests carry no CORS headers, so in a browser every
    // error (bad key, unknown model, no quota…) looks like a network failure. Try once without
    // the reasoning setting, then ask OpenAI what's wrong with a GET request, which browsers can read.
    if (!(e instanceof APIConnectionError)) throw e
    if (skipReasoning) throw await diagnose(key, model)
    try {
      res = await run(false)
      skipReasoning = true
    } catch (e2) {
      if (!(e2 instanceof APIConnectionError)) throw e2
      throw await diagnose(key, model)
    }
  }
  const answer = res.output_text.trim()
  if (cacheKey) await deviceDb.ai.put({ key: cacheKey, answer, created: Date.now() })
  return answer
}

/** Finds out why requests fail by asking about the model with a GET request (its errors are readable). */
export async function diagnose(key: string, model: string): Promise<AiError> {
  let r: Response
  try {
    r = await fetch(`https://api.openai.com/v1/models/${encodeURIComponent(model)}`, { headers: { Authorization: `Bearer ${key}` } })
  } catch {
    return new AiError('连不上 OpenAI。请检查网络；如果你在中国大陆，需要先开 VPN。', 'network')
  }
  const body = (await r.json().catch(() => ({}))) as { error?: { code?: string; type?: string; message?: string } }
  const code = body.error?.code ?? body.error?.type ?? ''
  const detail = `${r.status}${code ? ` ${code}` : ''}`
  if (r.status === 401) return new AiError('密钥不对。请在设置里重新粘贴一次，注意前后不要有空格。', detail)
  if (r.status === 403 && /country|region|territory/i.test(`${code} ${body.error?.message ?? ''}`))
    return new AiError('OpenAI 不支持你现在所在的地区。开 VPN 以后再试。', detail)
  if (r.status === 404) return new AiError(`这个密钥用不了模型“${model}”。请在设置里检查模型名称。`, detail)
  if (r.status === 429) return new AiError('请求太多或者额度用完了。请看看 OpenAI 账户里还有没有余额。', detail)
  if (r.ok)
    return new AiError('密钥和模型都没问题，但 OpenAI 拒绝了这次请求。最常见的原因是账户余额不足，请到 OpenAI 账户里看看。', 'model ok, request rejected')
  return new AiError(`OpenAI 返回了错误：${body.error?.message ?? r.status}`, detail)
}

export function explainSentence(sentence: string) {
  return ask(
    `${TUTOR}\n现在：用更简单的中文解释下面这句话是什么意思。如果有难词或者古代的说法，顺便解释一下。不超过 80 字。`,
    sentence,
    `explain:${sentence}`,
  )
}

export function translateSentence(sentence: string) {
  return ask(
    'Translate the Chinese sentence into natural, idiomatic English. Reply with the translation only.',
    sentence,
    `translate:${sentence}`,
  )
}

export function wordInstructions(word: string, pinyin: string, sentence: string) {
  return `${TUTOR}\n学生在读到这句话时，想问关于「${word}」(${pinyin}) 的问题：\n「${sentence}」\n请结合这句话来回答。`
}

/** One turn of the word chat. The first question of a conversation is cached. */
export function askAboutWord(word: string, pinyin: string, sentence: string, history: ChatMsg[]) {
  const first = history.length === 1
  return ask(wordInstructions(word, pinyin, sentence), history, first ? `word:${word}|${sentence}|${history[0].content}` : undefined)
}

function eggInstructions(place: string, egg: string) {
  return `${TUTOR}
学生在了解「${place}」，读到了这条“聊天彩蛋”（跟中国人聊天时可以拿出来的小知识）：
「${egg}」
学生想更深入地了解它。这一次回答可以长一点（不超过 250 字）。如果这条彩蛋有说得不准确的地方，直接指出来。`
}

const eggKey = (place: string, egg: string) => `egg:${place}|${egg}`

/** An 展开 asked before, if there is one (no network). */
export async function cachedEggExpansion(place: string, egg: string) {
  return (await deviceDb.ai.get(eggKey(place, egg)))?.answer
}

/** 展开: the background to a 聊天彩蛋, a story or detail, and things to ask a Chinese friend. Cached. */
export function expandEgg(place: string, egg: string) {
  return ask(
    eggInstructions(place, egg),
    `请帮我展开讲讲：
1. 这是怎么回事？为什么？（有时间、人物、数字更好）
2. 一个相关的、有意思的细节或者小故事
3. 跟中国朋友聊这个的时候，我可以问对方的两个问题`,
    eggKey(place, egg),
  )
}

/** A follow-up about a 聊天彩蛋. The first question of a conversation is cached. */
export function askAboutEgg(place: string, egg: string, history: ChatMsg[]) {
  return ask(eggInstructions(place, egg), history, history.length === 1 ? `egg-q:${place}|${egg}|${history[0].content}` : undefined)
}

/** Quick connection test for the settings page. */
export async function testKey(): Promise<string> {
  return ask('Reply with exactly: 连接成功', 'ping')
}

export function describeError(e: unknown): string {
  if (e instanceof NoKeyError) return e.message
  if (e instanceof AiError) return e.detail ? `${e.message}（${e.detail}）` : e.message
  const msg = e instanceof Error ? e.message : String(e)
  const status = (e as { status?: number })?.status
  if (status === 401) return '密钥不对，请在设置里检查一下。（401）'
  if (status === 404) return `找不到这个模型，请在设置里检查模型名称。（404）`
  if (status === 429) return '请求太多或者额度用完了，等一会儿再试。（429）'
  return `出错了：${msg}`
}
