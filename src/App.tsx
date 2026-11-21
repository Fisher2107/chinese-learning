import { useEffect } from 'react'
import { useRoute } from './lib/router.ts'
import { WordSheetProvider } from './components/WordSheet.tsx'
import { TabBar } from './components/chrome.tsx'
import { Today } from './screens/Today.tsx'
import { Shelf } from './screens/Shelf.tsx'
import { WordBank } from './screens/WordBank.tsx'
import { Me } from './screens/Me.tsx'
import { SeriesPath } from './screens/SeriesPath.tsx'
import { EpisodeReader } from './screens/EpisodeReader.tsx'
import { AfterPage } from './screens/AfterPage.tsx'
import { TextReader, ImportReader } from './screens/TextReader.tsx'
import { ImportNew } from './screens/ImportNew.tsx'
import { Review } from './screens/Review.tsx'

const num = (s: string | undefined, fallback: number) => (s && /^\d+$/.test(s) ? Number(s) : fallback)

function Screen({ route }: { route: string[] }): { tab?: string; el: React.ReactNode } {
  const [head, a, b] = route
  switch (head) {
    case undefined:
      return { tab: '', el: <Today /> }
    case 'shelf':
      return { tab: 'shelf', el: <Shelf /> }
    case 'words':
      return { tab: 'words', el: <WordBank /> }
    case 'me':
      return { tab: 'me', el: <Me /> }
    case 'review':
      return { el: <Review /> }
    case 'series':
      if (b === 'after') return { el: <AfterPage id={a} /> }
      if (b) return { el: <EpisodeReader key={`${a}/${b}`} id={a} n={num(b, 1)} /> }
      return { el: <SeriesPath id={a} /> }
    case 'text':
      return { el: <TextReader key={a} id={a} sitting={num(b, 1) - 1} /> }
    case 'import':
      if (a === 'new') return { el: <ImportNew /> }
      return { el: <ImportReader key={a} id={num(a, 0)} sitting={num(b, 1) - 1} /> }
    default:
      return { tab: '', el: <Today /> }
  }
}

export default function App() {
  const route = useRoute()
  const path = route.join('/')
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])
  const { tab, el } = Screen({ route })
  return (
    <WordSheetProvider>
      <main className={tab !== undefined ? 'pb-24' : ''}>{el}</main>
      {tab !== undefined && <TabBar current={tab} />}
    </WordSheetProvider>
  )
}
