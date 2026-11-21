import { db } from './db.ts'
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

async function client() {
  const s = await readSettings()
  if (!s.apiKey) throw new NoKeyError()
  const { default: OpenAI } = await import('openai')
  return { openai: new OpenAI({ apiKey: s.apiKey, dangerouslyAllowBrowser: true }), model: s.model }
}

/** Asks the model. With a cacheKey, the answer is kept on the device and reused next time. */
export async function ask(instructions: string, input: string | ChatMsg[], cacheKey?: string): Promise<string> {
  if (cacheKey) {
    const hit = await db.ai.get(cacheKey)
    if (hit) return hit.answer
  }
  const { openai, model } = await client()
  const res = await openai.responses.create({ model, instructions, input, reasoning: { effort: 'low' } })
  const answer = res.output_text.trim()
  if (cacheKey) await db.ai.put({ key: cacheKey, answer, created: Date.now() })
  return answer
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

/** Quick connection test for the settings page. */
export async function testKey(): Promise<string> {
  return ask('Reply with exactly: 连接成功', 'ping')
}

export function describeError(e: unknown): string {
  if (e instanceof NoKeyError) return e.message
  const msg = e instanceof Error ? e.message : String(e)
  if (/401|invalid api key|incorrect api key/i.test(msg)) return '密钥不对，请在设置里检查一下。'
  if (/429|quota|rate/i.test(msg)) return '请求太多或者额度用完了，等一会儿再试。'
  if (/fetch|network|Failed/i.test(msg)) return '连不上网络，等一会儿再试。'
  return `出错了：${msg}`
}
