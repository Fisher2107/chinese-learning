import { lazy, Suspense, useEffect } from 'react'
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
import { Loading } from './components/ui.tsx'

// The map, province pages and feed carry the map geometry: load them when first opened
const MapScreen = lazy(() => import('./screens/MapScreen.tsx').then((m) => ({ default: m.MapScreen })))
const StampBook = lazy(() => import('./screens/MapScreen.tsx').then((m) => ({ default: m.StampBook })))
const CityPage = lazy(() => import('./screens/CityPage.tsx').then((m) => ({ default: m.CityPage })))
const MapTest = lazy(() => import('./screens/MapTest.tsx').then((m) => ({ default: m.MapTest })))
const PlacePage = lazy(() => import('./screens/PlacePage.tsx').then((m) => ({ default: m.PlacePage })))
const StampQuiz = lazy(() => import('./screens/PlacePage.tsx').then((m) => ({ default: m.StampQuiz })))
const Feed = lazy(() => import('./screens/Feed.tsx').then((m) => ({ default: m.Feed })))

const HistoricalAtlas = lazy(() => import('./screens/HistoricalAtlas.tsx').then(m => ({ default: m.HistoricalAtlas })))

const num = (s: string | undefined, fallback: number) => (s && /^\d+$/.test(s) ? Number(s) : fallback)

function Screen({ route }: { route: string[] }): { tab?: string; el: React.ReactNode } {
  const [head, a, b] = route
  switch (head) {
    case undefined:
      return { tab: '', el: <Today /> }
    case 'shelf':
      return { tab: 'shelf', el: <Shelf /> }
    case 'words':
      return { tab: 'me', el: <WordBank /> }
    case 'feed':
      return { tab: 'feed', el: <Feed key={a ?? ''} start={a} /> }
    case 'me':
      return { tab: 'me', el: <Me /> }
    case 'map':
      if (a === 'history') return { tab: 'map', el: <HistoricalAtlas periodId={b} eventId={route[3]} /> }
      if (a === 'stamps') return { el: <StampBook /> }
      if (a === 'test') return { el: <MapTest /> }
      if ((a === 'city' || a === 'place') && b) return { tab: 'map', el: <MapScreen key={`${a}/${b}`} focus={{ kind: a === 'city' ? 'city' : 'province', id: b }} /> }
      return { tab: 'map', el: <MapScreen /> }
    case 'city':
      return { el: <CityPage key={a} id={a} /> }
    case 'place':
      if (b === 'stamp') return { el: <StampQuiz key={a} id={a} /> }
      return { el: <PlacePage key={a} id={a} /> }
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
      <main className={tab !== undefined ? 'pb-24' : ''}>
        <Suspense fallback={<Loading />}>{el}</Suspense>
      </main>
      {tab !== undefined && <TabBar current={tab} />}
    </WordSheetProvider>
  )
}
