import { useEffect, useState } from 'react'
import { cloudDb, connectCloud, disconnectCloud, inCloud } from '../lib/db.ts'
import { Button, Section } from './ui.tsx'

export function CloudSync() {
  const [user, setUser] = useState(cloudDb?.cloud.currentUser.value)
  const [state, setState] = useState(cloudDb?.cloud.syncState.value)
  const [last, setLast] = useState<Date>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    if (!cloudDb) return
    const connection = () => setOnline(navigator.onLine)
    window.addEventListener('online', connection)
    window.addEventListener('offline', connection)
    const subscriptions = [
      cloudDb.cloud.currentUser.subscribe(setUser),
      cloudDb.cloud.syncState.subscribe(setState),
      cloudDb.cloud.persistedSyncState.subscribe(s => setLast(s?.timestamp)),
    ]
    return () => {
      subscriptions.forEach(s => s.unsubscribe())
      window.removeEventListener('online', connection)
      window.removeEventListener('offline', connection)
    }
  }, [])
  if (!cloudDb) return null
  const cloud = cloudDb.cloud
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try { await action() }
    catch (e) { setError(e instanceof Error ? e.message : '连接失败，请再试一次。') }
    finally { setBusy(false) }
  }
  const phase = state?.phase
  const status = !online || phase === 'offline' ? '已离线，联网后自动同步'
    : phase === 'error' ? '同步失败，可手动重试'
    : phase === 'in-sync' ? '已同步' : '等待同步'
  return <Section title="云同步">
    <div className="tile space-y-3 p-4">
      {inCloud && user?.isLoggedIn ? <>
        <p className="font-bold">{user.email}</p>
        <p role="status" className="text-sm font-semibold text-mute">{status}{last && ' · 上次同步 ' + new Date(last).toLocaleString('zh-CN')}</p>
        <div className="flex gap-2">
          <Button tone="dai" size="sm" disabled={busy || !online} onClick={() => run(() => cloud.sync({ purpose: 'pull', wait: true }))}>立即同步</Button>
          <Button tone="plain" size="sm" disabled={busy || !online} onClick={() => run(disconnectCloud)}>退出账号</Button>
        </div>
      </> : <>
        <p className="text-sm font-semibold text-mute">在各台设备上用同一邮箱登录，即可同步生词、例句、笔记、复习和阅读进度。首次登录会打开独立的云端学习记录。原来的本机记录会保留。</p>
        <Button tone="dai" size="md" disabled={busy || !online} onClick={() => run(connectCloud)}>{busy ? '正在连接…' : '用邮箱登录'}</Button>
      </>}
      {error && <p role="alert" className="text-sm font-bold text-zhu">{error}</p>}
    </div>
  </Section>
}
