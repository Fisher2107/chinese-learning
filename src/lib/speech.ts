export const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window

let voice: SpeechSynthesisVoice | undefined

function pickVoice() {
  const voices = speechSynthesis.getVoices()
  const zh = voices.filter((v) => /^zh[-_]CN/i.test(v.lang))
  return (
    zh.find((v) => /Tingting|婷婷|Xiaoxiao|晓晓|Yunxi/i.test(v.name)) ??
    zh.find((v) => v.localService) ??
    zh[0] ??
    voices.find((v) => v.lang.startsWith('zh'))
  )
}

if (canSpeak) speechSynthesis.addEventListener?.('voiceschanged', () => (voice = pickVoice()))

/** Reads Chinese text aloud. Resolves when finished or stopped. */
export function speak(text: string, rate = 0.9): Promise<void> {
  if (!canSpeak) return Promise.resolve()
  speechSynthesis.cancel()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    voice ??= pickVoice()
    if (voice) u.voice = voice
    u.rate = rate
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

export function stopSpeaking() {
  if (canSpeak) speechSynthesis.cancel()
}
