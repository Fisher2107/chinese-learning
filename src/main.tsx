import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { watchConnection } from './lib/live.ts'
import './index.css'

registerSW({ immediate: true })
watchConnection()

// Ask the browser to keep IndexedDB (saved words, progress) even when storage is low.
navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
