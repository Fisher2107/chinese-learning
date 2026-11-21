import { Component, type ReactNode } from 'react'

/** Clears the service worker and its caches (not IndexedDB: saved words stay) and reloads. */
export async function hardReload() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
    await Promise.all(regs.map((r) => r.unregister()))
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)))
  } finally {
    location.reload()
  }
}

/** Shows what broke instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {}
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div className="mx-auto max-w-md px-6 pt-16">
        <h1 className="text-[22px] font-black">出了点问题</h1>
        <p className="mt-1 font-bold text-mute">生词和进度都还在。先试试重新加载；如果还不行，把下面这段发给开发者。</p>
        <pre className="mt-4 rounded-xl bg-sunken p-3 text-xs whitespace-pre-wrap">{`${error.name}: ${error.message}\n${(error.stack ?? '').split('\n').slice(0, 4).join('\n')}\n${navigator.userAgent}`}</pre>
        <button onClick={hardReload} className="mt-4 h-13 w-full rounded-2xl bg-zhu text-[17px] font-extrabold text-white">
          重新加载
        </button>
        <button onClick={() => ((location.hash = '#/'), this.setState({ error: undefined }))} className="mt-3 h-12 w-full rounded-2xl border-2 border-line font-extrabold">
          回到首页
        </button>
      </div>
    )
  }
}
