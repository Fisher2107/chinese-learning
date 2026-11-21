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

/*
 * The app keeps its own trail of pages: each history entry knows how deep it is (`d`), and
 * `trail[d]` is the page at that depth. That lets "back" work even when the app was opened on a
 * deep link, and lets `go()` step back instead of piling up a loop (page A → B → A → B …).
 */
const KEY = 'zgt-trail'
let trail: string[] = []
try {
  trail = JSON.parse(sessionStorage.getItem(KEY) ?? '[]')
} catch {
  trail = []
}
let depth = 0

const stateDepth = () => (typeof history.state?.d === 'number' ? (history.state.d as number) : undefined)

function sync() {
  let d = stateDepth()
  if (d === undefined) {
    // An entry the app didn't make (first launch, or a plain link): put it after the current one
    d = trail.length && trail[depth] !== read() ? depth + 1 : depth
    history.replaceState({ ...history.state, d }, '', window.location.href)
  }
  depth = d
  trail = trail.slice(0, d)
  trail[d] = read()
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail))
  } catch {
    // private mode: the trail only lives in memory
  }
}
if (stateDepth() === undefined) trail = []
sync()
window.addEventListener('hashchange', sync)

export function go(path: string, replace = false) {
  path = path.replace(/^\//, '')
  // Going to the page we just came from: step back instead of adding it again
  if (depth > 0 && trail[depth - 1] === path) {
    history.back()
    return
  }
  const url = `#/${path}`
  if (replace) history.replaceState({ d: depth }, '', url)
  else history.pushState({ d: depth + 1 }, '', url)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** Back to the previous page in the app, or to `fallback` if this is the first page. */
export function back(fallback = '') {
  if (depth > 0) history.back()
  else go(fallback, true)
}
