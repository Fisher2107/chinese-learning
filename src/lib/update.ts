import { useSyncExternalStore } from 'react'
import { registerSW } from 'virtual:pwa-register'

let reg: ServiceWorkerRegistration | undefined

/**
 * Whether everything the app needs offline is on this device:
 * 'downloading' the first time (the app works online meanwhile), 'ready' once it's all there,
 * 'updating' while a new version downloads (the old one still works offline).
 */
export type OfflineState = 'starting' | 'downloading' | 'ready' | 'updating' | 'unsupported'
let offline: OfflineState = typeof navigator !== 'undefined' && 'serviceWorker' in navigator ? 'starting' : 'unsupported'
const listeners = new Set<() => void>()
function watchOffline(r: ServiceWorkerRegistration) {
  const refresh = () => {
    const next: OfflineState = r.installing || r.waiting ? (r.active ? 'updating' : 'downloading') : r.active ? 'ready' : 'starting'
    if (next === offline) return
    offline = next
    listeners.forEach((l) => l())
  }
  refresh()
  r.addEventListener('updatefound', () => {
    refresh()
    r.installing?.addEventListener('statechange', refresh)
  })
  r.installing?.addEventListener('statechange', refresh)
  r.waiting?.addEventListener('statechange', refresh)
  navigator.serviceWorker.addEventListener('controllerchange', refresh)
}

export function useOffline(): OfflineState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => offline,
  )
}

/** Opened from the home screen rather than in a browser tab. */
export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true

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
      watchOffline(r)
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
