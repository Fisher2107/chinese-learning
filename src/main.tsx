import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { watchConnection } from './lib/live.ts'
import { startUpdates } from './lib/update.ts'
import './index.css'

startUpdates()
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
