import { useSyncExternalStore } from 'react'
import { useLiveQuery as useDexieLiveQuery } from 'dexie-react-hooks'
import { db } from './db.ts'

/*
 * WebKit (Safari, and every browser on iPhone) sometimes drops its IndexedDB connection while
 * the app sits in the background. Reads then fail with UnknownError ("Unable to open cursor",
 * "Connection to Indexed Database server lost") until the database is closed and opened again.
 * Nothing is lost on disk; the connection just has to be remade.
 */
export function isLostConnection(e: unknown): boolean {
  const err = e as { name?: string; message?: string; inner?: { name?: string; message?: string } } | undefined
  if (!err) return false
  const names = [err.name, err.inner?.name]
  if (names.some((n) => n === 'UnknownError' || n === 'DatabaseClosedError' || n === 'InvalidStateError')) return true
  return /open cursor|Indexed ?Database server|connection (is closing|was lost|lost)/i.test(`${err.message ?? ''} ${err.inner?.message ?? ''}`)
}

let epoch = 0
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
let tries: number[] = []
let reopening: Promise<boolean> | undefined

/** Whether another reconnect is allowed: at most 3 in 30 seconds, so a real failure still shows. */
function mayRetry() {
  const now = Date.now()
  tries = tries.filter((t) => now - t < 30_000)
  return tries.length < 3
}

/** Closes and reopens the database, then makes every live query run again. */
export function reconnect(): Promise<boolean> {
  if (reopening) return reopening
  if (!mayRetry()) return Promise.resolve(false)
  tries.push(Date.now())
  reopening = (async () => {
    try {
      db.close({ disableAutoOpen: false })
      await db.open()
      return true
    } catch {
      return false
    } finally {
      reopening = undefined
      epoch++
      listeners.forEach((l) => l())
    }
  })()
  return reopening
}

/** Coming back to the app after a while: check the connection before the user hits it. */
export function watchConnection() {
  let hiddenAt = 0
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now()
      return
    }
    if (Date.now() - hiddenAt < 5_000) return
    try {
      await db.words.orderBy('created').reverse().limit(1).toArray()
    } catch (e) {
      if (isLostConnection(e)) reconnect()
    }
  })
  window.addEventListener('unhandledrejection', (ev) => {
    if (isLostConnection(ev.reason)) reconnect()
  })
}

/**
 * Dexie's useLiveQuery, but a lost connection doesn't crash the screen: the query returns its
 * default for a moment, the database reconnects, and the query runs again.
 */
export function useLiveQuery<T>(querier: () => Promise<T> | T, deps?: unknown[]): T | undefined
export function useLiveQuery<T, D>(querier: () => Promise<T> | T, deps: unknown[], defaultResult: D): T | D
export function useLiveQuery<T, D>(querier: () => Promise<T> | T, deps: unknown[] = [], defaultResult?: D): T | D | undefined {
  const e = useSyncExternalStore(subscribe, () => epoch)
  return useDexieLiveQuery(
    async () => {
      try {
        return await querier()
      } catch (err) {
        if (isLostConnection(err) && mayRetry()) {
          reconnect()
          return defaultResult
        }
        throw err
      }
    },
    [...deps, e],
    defaultResult,
  )
}
