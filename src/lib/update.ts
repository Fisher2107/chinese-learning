import { registerSW } from 'virtual:pwa-register'

let reg: ServiceWorkerRegistration | undefined

/** When this copy of the app was built. */
export const BUILT = new Date(__BUILT__)

export const builtLabel = () => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${BUILT.getMonth() + 1}月${BUILT.getDate()}日 ${pad(BUILT.getHours())}:${pad(BUILT.getMinutes())}`
}

/**
 * Keeps the installed app up to date. A browser only looks for a new version when the app is opened
 * fresh, but phones bring it back from the background for days without reopening it. So also look
 * each time it comes back on screen, and every half hour. A new version installs itself and the
 * page reloads once it's ready (registerType: 'autoUpdate').
 */
export function startUpdates() {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      reg = r
      if (!r) return
      let last = Date.now()
      const check = () => {
        if (!navigator.onLine || Date.now() - last < 60_000) return
        last = Date.now()
        r.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
      setInterval(check, 30 * 60_000)
    },
  })
}

/** Looks for a new version now: 'new' means it's downloading and the app will reopen by itself. */
export async function checkForUpdate(): Promise<'new' | 'latest' | 'offline'> {
  if (!reg) return navigator.onLine ? 'latest' : 'offline'
  try {
    await reg.update()
  } catch {
    return 'offline'
  }
  return reg.installing || reg.waiting ? 'new' : 'latest'
}
