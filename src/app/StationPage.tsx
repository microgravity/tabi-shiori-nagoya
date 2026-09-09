import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { MaterialIcon } from '../components/MaterialIcon'
import { railwayOperators, routes, stationCodeForRoute } from '../data/stations'
import { splitKana } from '../domain/kana'
import { reconcileProgress } from '../domain/progress'
import { isRouteUnlocked } from '../domain/unlocks'
import { KanaStrip } from '../features/practice/KanaStrip'
import { useSpeech } from '../services/speech/useSpeech'
import { useAppState } from './AppState'

export function StationPage() {
  const { stationId = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { stationById, state, routeStationIds, setCurrentPosition } = useAppState()
  const { speak, available } = useSpeech()
  const station = stationById.get(stationId)
  const requestedRouteId = params.get('route') ?? 'toyoko'
  const storedPosition = station ? reconcileProgress(state.progress[station.id], station.reading).currentPosition : 0
  const focusParam = params.get('focus')
  const focusValue = focusParam === null ? Number.NaN : Number(focusParam)
  const focusedPosition = station && Number.isInteger(focusValue) && focusValue >= 0 && focusValue < splitKana(station.reading).length ? focusValue : null
  const [selectedPosition, setSelectedPosition] = useState(focusedPosition ?? storedPosition)

  useEffect(() => {
    setSelectedPosition(focusedPosition ?? storedPosition)
  }, [focusedPosition, stationId, storedPosition])

  if (!station) return <NotFound />
  const progress = reconcileProgress(state.progress[station.id], station.reading)
  const unlockedRoutes = routes.filter((route) => isRouteUnlocked(route, railwayOperators, state.unlockedMilestones))
  const stationRoutes = unlockedRoutes.filter((route) => routeStationIds(route.id).includes(station.id))
  if (station.builtIn && stationRoutes.length === 0) return <LockedStation />
  const routeId = stationRoutes.some((route) => route.id === requestedRouteId)
    ? requestedRouteId
    : stationRoutes[0]?.id ?? 'found'
  const backToKana = params.get('from') === 'kana' && params.get('kana')
  const backUrl = backToKana ? `/kana/${encodeURIComponent(params.get('kana')!)}` : `/?route=${routeId === 'found' ? 'toyoko' : routeId}`

  const startAt = (index: number) => {
    setCurrentPosition(station.id, index)
    navigate(`/practice/${station.id}/${index}?route=${routeId}`)
  }

  return (
    <div className={`page-shell station-page ${state.settings.reduceMotion ? 'reduce-motion' : ''}`}>
      <AppHeader compact />
      <main className="station-main">
        <Link className="back-link" to={backUrl}><MaterialIcon name="arrow_back" />{backToKana ? 'もじの えき' : 'ろせんず'}</Link>
        <article className="station-card">
          <div className="station-sign" aria-hidden="true"><span /><span /></div>
          <p className="eyebrow">この えきは</p>
          <h1>{station.displayName}</h1>
          <p className="station-big-reading">{station.reading}</p>
          <div className="route-badges route-badges--center" aria-label="この えきの ろせん">
            {stationRoutes.map((route) => (
              <span key={route.id} className="route-badge" style={{ '--route-color': route.color } as React.CSSProperties}>
                <i aria-hidden="true" />{route.name}{stationCodeForRoute(route, station.id) && <small>{stationCodeForRoute(route, station.id)}</small>}
              </span>
            ))}
          </div>
          <KanaStrip
            reading={station.reading}
            activeIndex={selectedPosition}
            practicedPositions={progress.practicedPositions}
            freeWrittenPositions={progress.freeWrittenPositions}
            onSpeak={speak}
            onChoose={setSelectedPosition}
          />
          <p className="swipe-hint">もじを おすか、ゆびで よこに なぞって きいてみよう</p>
          <div className="station-actions">
            <button type="button" className="big-action big-action--listen" onClick={() => speak(station.speechText ?? station.reading)}>
              <MaterialIcon name="volume_up" filled /><strong>きく</strong>
              {!available && <small>このたんまつでは おとがでません</small>}
            </button>
            <button type="button" className="big-action big-action--write" onClick={() => startAt(selectedPosition)}>
              <MaterialIcon name="draw" filled /><strong>かく</strong>
              <small>{progress.practicedPositions.length}/{splitKana(station.reading).length} もじ</small>
            </button>
          </div>
        </article>
      </main>
    </div>
  )
}

function NotFound() {
  return (
    <main className="simple-message">
      <h1>えきが みつかりません</h1>
      <Link to="/">ろせんずへ もどる</Link>
    </main>
  )
}

function LockedStation() {
  return (
    <main className="simple-message">
      <MaterialIcon name="lock" filled />
      <h1>まだ はいれない えきだよ</h1>
      <Link to="/">ろせんずへ もどる</Link>
    </main>
  )
}
