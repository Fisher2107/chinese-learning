import { useSyncExternalStore } from 'react'

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
const read = () => window.location.hash.replace(/^#\/?/, '')

/** Current route as path segments, e.g. #/series/pangdonglai/3 → ['series', 'pangdonglai', '3']. */
export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, read)
  return hash.split('/').filter(Boolean).map(decodeURIComponent)
}

export function go(path: string, replace = false) {
  const url = `#/${path.replace(/^\//, '')}`
  if (replace) {
    history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else window.location.hash = url
}

export function back(fallback = '') {
  if (history.state?.idx !== 0 && history.length > 1) history.back()
  else go(fallback, true)
}
