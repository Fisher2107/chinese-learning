import { useEffect, useState, useSyncExternalStore, type Dispatch, type SetStateAction } from 'react'

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
 *
 * Each entry also has a key of its own (`k`, kept in `keys[d]`), so a page can keep its state with
 * the entry (see usePageState): follow a link out of a quiz, come back, and it's as you left it.
 */
const KEY = 'zgt-trail'
const KEYS = 'zgt-trail-keys'
const PAGE = 'zgt-page:'

function load(key: string): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? '[]')
  } catch {
    return []
  }
}
let trail = load(KEY)
let keys = load(KEYS)
let depth = 0

const stateDepth = () => (typeof history.state?.d === 'number' ? (history.state.d as number) : undefined)
const stateKey = () => (typeof history.state?.k === 'string' ? (history.state.k as string) : undefined)
const newKey = () => Math.random().toString(36).slice(2, 10)

/** Drops what pages kept for entries that can't be reached any more. */
function forget() {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const name = sessionStorage.key(i)
      if (name?.startsWith(PAGE) && !keys.includes(name.slice(PAGE.length).split(':')[0])) sessionStorage.removeItem(name)
    }
  } catch {
    // private mode: nothing was kept
  }
}

function sync() {
  let d = stateDepth()
  let k = stateKey()
  const fresh = k === undefined
  if (d === undefined || k === undefined) {
    // An entry the app didn't make (first launch, or a plain link): put it after the current one
    d ??= trail.length && trail[depth] !== read() ? depth + 1 : depth
    k ??= newKey()
    history.replaceState({ ...history.state, d, k }, '', window.location.href)
  }
  depth = d
  trail = trail.slice(0, d)
  trail[d] = read()
  keys = keys.slice(0, d)
  keys[d] = k
  // a new entry replaces any that were ahead of it, and what they kept
  if (fresh) forget()
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail))
    sessionStorage.setItem(KEYS, JSON.stringify(keys))
  } catch {
    // private mode: the trail only lives in memory
  }
}
if (stateDepth() === undefined) {
  trail = []
  keys = []
}
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

/**
 * useState that stays with this visit to the page: follow a link and come back (back button, or
 * the page reloading) and it's as you left it; open the page afresh and it starts fresh. For a quiz
 * half done, say. Values must survive JSON (no Sets, Maps or Dates); undefined isn't kept.
 */
export function usePageState<T>(name: string, initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [store] = useState(() => `${PAGE}${keys[depth] ?? ''}:${name}`)
  const [value, setValue] = useState<T>(() => {
    try {
      const kept = sessionStorage.getItem(store)
      if (kept !== null) return JSON.parse(kept) as T
    } catch {
      // nothing kept, or it can't be read: start fresh
    }
    return typeof initial === 'function' ? (initial as () => T)() : initial
  })
  useEffect(() => {
    try {
      if (value === undefined) sessionStorage.removeItem(store)
      else sessionStorage.setItem(store, JSON.stringify(value))
    } catch {
      // private mode or full: it lives as long as the page does
    }
  }, [store, value])
  return [value, setValue]
}
