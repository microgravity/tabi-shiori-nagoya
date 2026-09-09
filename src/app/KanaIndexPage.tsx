import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { MaterialIcon } from '../components/MaterialIcon'
import { basicKanaRows, smallKanaRows, voicedKanaRows } from '../data/kanaChart'
import { railwayOperators, routes, stationCodeForRoute } from '../data/stations'
import { normalizeReading, splitKana } from '../domain/kana'
import { practicedKanaSet } from '../domain/progress'
import { buildKanaStationIndex, matchesForKana } from '../domain/stationIndex'
import type { Route } from '../domain/types'
import { isRouteUnlocked } from '../domain/unlocks'
import { useAppState } from './AppState'

const listedKana = new Set([...basicKanaRows.flat(), ...voicedKanaRows.flat(), ...smallKanaRows.flat()].filter((kana): kana is string => Boolean(kana)))

export function KanaIndexPage() {
  const { kana: routeKana } = useParams()
  const navigate = useNavigate()
  const { stations, stationById, routeStationIds, state } = useAppState()
  const unlockedRoutes = useMemo(
    () => routes.filter((route) => isRouteUnlocked(route, railwayOperators, state.unlockedMilestones)),
    [state.unlockedMilestones],
  )
  const indexedRoutes = useMemo(
    () => unlockedRoutes.map((route) => ({ ...route, orderedStationIds: routeStationIds(route.id) })),
    [routeStationIds, unlockedRoutes],
  )
  const indexedStations = useMemo(() => {
    const accessibleIds = new Set(indexedRoutes.flatMap((route) => route.orderedStationIds))
    return stations.filter((station) => accessibleIds.has(station.id) || (!station.builtIn && !state.customStations.find((item) => item.id === station.id)?.routeId))
  }, [indexedRoutes, state.customStations, stations])
  const index = useMemo(() => buildKanaStationIndex(indexedStations, indexedRoutes), [indexedRoutes, indexedStations])
  const practicedKana = useMemo(() => practicedKanaSet(indexedStations, state.progress), [indexedStations, state.progress])
  const normalizedKana = routeKana ? normalizeReading(routeKana) : ''
  const selectedKana = splitKana(normalizedKana).length === 1 && listedKana.has(normalizedKana) ? normalizedKana : ''
  const matches = selectedKana ? matchesForKana(index, selectedKana) : []

  return (
    <div className={`page-shell kana-index-page ${state.settings.reduceMotion ? 'reduce-motion' : ''}`}>
      <AppHeader compact />
      <main className="kana-index-main">
        <Link className="back-link" to={selectedKana ? '/kana' : '/'}><MaterialIcon name="arrow_back" />{selectedKana ? 'もじの ひょう' : 'ろせんず'}</Link>
        {selectedKana ? (
          <section aria-labelledby="kana-results-title">
            <div className="kana-results-heading">
              <div className="selected-kana" aria-hidden="true">{selectedKana}</div>
              <div>
                <p className="eyebrow">この もじが はいっている</p>
                <h1 id="kana-results-title">「{selectedKana}」の えき</h1>
                <p>{matches.length}この えきが みつかったよ</p>
              </div>
            </div>
            <div className="kana-results-list">
              {matches.map((match) => {
                const station = stationById.get(match.stationId)
                if (!station) return null
                const primaryRouteId = match.routeIds[0] ?? 'found'
                const stationUrl = `/station/${station.id}?route=${primaryRouteId}&focus=${match.positions[0]}&from=kana&kana=${encodeURIComponent(selectedKana)}`
                return (
                  <article key={station.id} className="kana-result-card">
                    <button type="button" className="kana-result-station" onClick={() => navigate(stationUrl)}>
                      <span className="kana-result-name">{station.displayName}</span>
                      <span className="kana-result-reading">{highlightReading(station.reading, selectedKana)}</span>
                    </button>
                    <div className="route-badges" aria-label="この えきの ろせん">
                      {match.routeIds.length > 0 ? match.routeIds.map((routeId) => {
                        const route = routes.find((item) => item.id === routeId)
                        if (!route) return null
                        const code = stationCodeForRoute(route, station.id)
                        return <RouteBadge key={route.id} route={route} code={code} />
                      }) : <span className="route-badge route-badge--found">みつけた えき</span>}
                    </div>
                    <div className="kana-result-actions" aria-label={`${selectedKana}を かく ばしょ`}>
                      {match.positions.map((position, occurrenceIndex) => (
                        <button
                          key={position}
                          type="button"
                          className="icon-button"
                          onClick={() => navigate(`/practice/${station.id}/${position}?route=${primaryRouteId}`)}
                        >
                          <MaterialIcon name="draw" />
                          {match.positions.length > 1 ? `${occurrenceIndex + 1}こめの「${selectedKana}」を かく` : `この「${selectedKana}」を かく`}
                        </button>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        ) : (
          <section aria-labelledby="kana-index-title">
            <div className="kana-index-heading">
              <p className="eyebrow">もじを おして みつけよう</p>
              <h1 id="kana-index-title">ひらがなから さがす</h1>
              <p>えきの なまえに ある もじは、おせるよ。</p>
              <p className="kana-practice-legend"><MaterialIcon name="check" />れんしゅうした もじ</p>
            </div>
            <KanaTable title="ごじゅうおん" rows={basicKanaRows} index={index} practicedKana={practicedKana} onChoose={(kana) => navigate(`/kana/${encodeURIComponent(kana)}`)} />
            <div className="kana-extra-grid">
              <KanaTable title="だくおん" rows={voicedKanaRows} index={index} practicedKana={practicedKana} onChoose={(kana) => navigate(`/kana/${encodeURIComponent(kana)}`)} />
              <KanaTable title="ちいさい もじ" rows={smallKanaRows} index={index} practicedKana={practicedKana} onChoose={(kana) => navigate(`/kana/${encodeURIComponent(kana)}`)} />
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

function KanaTable({ title, rows, index, practicedKana, onChoose }: { title: string; rows: Array<Array<string | null>>; index: ReturnType<typeof buildKanaStationIndex>; practicedKana: ReadonlySet<string>; onChoose: (kana: string) => void }) {
  const titleId = `kana-table-${title === 'ごじゅうおん' ? 'basic' : title === 'だくおん' ? 'voiced' : 'small'}`
  return (
    <section className="kana-table-card" aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      <div className="kana-table" role="grid" aria-label={title}>
        {rows.flatMap((row, rowIndex) => row.map((kana, columnIndex) => {
          if (!kana) return <span key={`${rowIndex}-${columnIndex}`} className="kana-cell kana-cell--blank" aria-hidden="true" />
          const count = index.get(kana)?.length ?? 0
          const practiced = practicedKana.has(kana)
          return (
            <button
              key={kana}
              type="button"
              className={`kana-cell ${practiced ? 'kana-cell--practiced' : ''}`}
              disabled={count === 0}
              aria-label={`${kana}、${count}この えき${practiced ? '、れんしゅうした' : ''}`}
              onClick={() => onChoose(kana)}
            >
              <strong>{kana}</strong><small>{count}</small>{practiced && <MaterialIcon name="check" className="kana-practiced-mark" />}
            </button>
          )
        }))}
      </div>
    </section>
  )
}

function RouteBadge({ route, code }: { route: Route; code?: string }) {
  return (
    <span className="route-badge" style={{ '--route-color': route.color } as React.CSSProperties}>
      <i aria-hidden="true" />{route.name}{code && <small>{code}</small>}
    </span>
  )
}

function highlightReading(reading: string, selectedKana: string) {
  return splitKana(reading).map((kana, index) => kana === selectedKana
    ? <mark key={index}>{kana}</mark>
    : <span key={index}>{kana}</span>)
}
