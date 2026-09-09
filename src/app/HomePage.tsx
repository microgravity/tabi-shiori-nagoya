import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { MaterialIcon } from '../components/MaterialIcon'
import { railwayOperatorById, railwayOperators, routes } from '../data/stations'
import { completedStationCount, routeAchievementLevel, routeEffortProgress, type RouteAchievement } from '../domain/progress'
import { isOperatorUnlocked, isRouteUnlocked, metroUnlockStatus, ROUTE_CHECKPOINT_RATIOS, routeCheckpointMilestoneById, unlockMilestoneById, unlockProgress as calculateUnlockProgress } from '../domain/unlocks'
import { RouteMap } from '../features/route-map/RouteMap'
import { useAppState } from './AppState'

interface CelebrationState {
  celebrateStationId?: string
  firstAdd?: boolean
  allFreeWritten?: boolean
  routeAchievements?: RouteAchievement[]
  unlockedMilestones?: string[]
}

export function HomePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const celebration = (location.state ?? {}) as CelebrationState
  const [params, setParams] = useSearchParams()
  const { state, stationById, routeStationIds, storageWarning, unlockRoute } = useAppState()
  const [mode, setMode] = useState<'all' | 'mine'>('all')
  const [zoom, setZoom] = useState(1)
  const [mapResetKey, setMapResetKey] = useState(0)
  const [routeCelebrationIndex, setRouteCelebrationIndex] = useState(0)
  const [routeCelebrationDismissed, setRouteCelebrationDismissed] = useState(false)
  const [routeCelebrationReplayKey, setRouteCelebrationReplayKey] = useState(0)
  const [manualRouteCelebration, setManualRouteCelebration] = useState<RouteAchievement | undefined>()
  const [unlockedRouteCelebrations] = useState<RouteAchievement[]>(celebration.routeAchievements ?? [])
  const availableRoutes = routes.filter((route) => isRouteUnlocked(route, railwayOperators, state.unlockedMilestones))
  const requestedRoute = routes.find((route) => route.id === params.get('route'))
  const selectedRoute = requestedRoute && isRouteUnlocked(requestedRoute, railwayOperators, state.unlockedMilestones)
    ? requestedRoute
    : availableRoutes[0]
  const [lastRouteByOperator, setLastRouteByOperator] = useState<Record<string, string>>({
    [selectedRoute.operatorId]: selectedRoute.id,
  })
  const selectedOperator = railwayOperatorById.get(selectedRoute.operatorId) ?? railwayOperators[0]
  const visibleRoutes = routes.filter((route) => route.operatorId === selectedOperator.id && isRouteUnlocked(route, railwayOperators, state.unlockedMilestones))
  const lockedMetroRoutes = selectedOperator.id === 'tokyo-metro'
    ? routes.filter((route) => route.operatorId === 'tokyo-metro' && !isRouteUnlocked(route, railwayOperators, state.unlockedMilestones))
    : []
  const metroStatus = metroUnlockStatus(state.unlockedMilestones)
  const routeCelebrations = manualRouteCelebration ? [manualRouteCelebration] : unlockedRouteCelebrations
  const activeRouteCelebration = routeCelebrationDismissed ? undefined : routeCelebrations[routeCelebrationIndex]
  const activeCelebrationRoute = routes.find((route) => route.id === activeRouteCelebration?.routeId)
  const newlyUnlockedOperator = railwayOperators.find((operator) => (
    operator.unlockMilestoneId && celebration.unlockedMilestones?.includes(operator.unlockMilestoneId)
  ))
  const newlyEarnedCheckpoint = celebration.unlockedMilestones
    ?.map((id) => routeCheckpointMilestoneById.get(id))
    .find(Boolean)
  const routeProgress = useMemo(() => new Map(routes.map((route) => {
    const stationIds = routeStationIds(route.id)
    const effort = routeEffortProgress(route.orderedStationIds, stationById, state.progress)
    return [route.id, {
      stationIds,
      completed: completedStationCount(stationIds, stationById, state.progress),
      achievement: routeAchievementLevel(stationIds, stationById, state.progress),
      effort,
      checkpoints: ROUTE_CHECKPOINT_RATIOS.filter((ratio) => effort.ratio >= ratio).length,
    }]
  })), [routeStationIds, state.progress, stationById])
  const operatorProgress = useMemo(() => new Map(railwayOperators.map((operator) => {
    return [operator.id, {
      completedRoutes: operator.routeIds.filter((routeId) => routeProgress.get(routeId)?.achievement !== 'none').length,
      masteredRoutes: operator.routeIds.filter((routeId) => routeProgress.get(routeId)?.achievement === 'master').length,
    }]
  })), [routeProgress])
  const operatorUnlockProgress = useMemo(() => new Map(railwayOperators.flatMap((operator) => {
    const milestone = operator.unlockMilestoneId ? unlockMilestoneById.get(operator.unlockMilestoneId) : undefined
    return milestone
      ? [[operator.id, calculateUnlockProgress(milestone, { routes, stationById, progress: state.progress })] as const]
      : []
  })), [state.progress, stationById])
  const selectedProgress = routeProgress.get(selectedRoute.id) ?? {
    stationIds: [], completed: 0, achievement: 'none' as const,
    effort: { practicedPositions: 0, totalPositions: 0, ratio: 0 }, checkpoints: 0,
  }
  const celebrationProgress = activeCelebrationRoute
    ? routeProgress.get(activeCelebrationRoute.id)
    : undefined
  const selectedSegment = selectedRoute.segmentLabel.replace(/（\d+えき）$/u, '')
  const customUnplaced = useMemo(
    () => [...stationById.values()].filter((station) => !station.builtIn && !state.customStations.find((item) => item.id === station.id)?.routeId),
    [state.customStations, stationById],
  )

  const chooseRoute = (routeId: string) => {
    const route = routes.find((item) => item.id === routeId)
    if (route && isRouteUnlocked(route, railwayOperators, state.unlockedMilestones)) {
      setLastRouteByOperator((current) => ({ ...current, [route.operatorId]: routeId }))
    } else {
      return
    }
    setParams({ route: routeId })
    setZoom(1)
    setMapResetKey((value) => value + 1)
  }

  const chooseOperator = (operatorId: string) => {
    const operator = railwayOperatorById.get(operatorId)
    if (!operator || !isOperatorUnlocked(operator, state.unlockedMilestones)) return
    const rememberedRouteId = lastRouteByOperator[operatorId]
    const routeId = rememberedRouteId && operator.routeIds.includes(rememberedRouteId)
      && availableRoutes.some((route) => route.id === rememberedRouteId)
      ? rememberedRouteId
      : availableRoutes.find((route) => route.operatorId === operatorId)?.id
    if (routeId) chooseRoute(routeId)
  }

  const unlockAndChooseRoute = (routeId: string) => {
    unlockRoute(routeId)
    setLastRouteByOperator((current) => ({ ...current, 'tokyo-metro': routeId }))
    setParams({ route: routeId })
    setZoom(1)
    setMapResetKey((value) => value + 1)
  }

  const showNextCelebration = () => {
    const nextIndex = routeCelebrationIndex + 1
    const nextAchievement = routeCelebrations[nextIndex]
    if (!nextAchievement) return
    setRouteCelebrationIndex(nextIndex)
    setRouteCelebrationReplayKey(0)
    chooseRoute(nextAchievement.routeId)
  }

  const goToNextRoute = () => {
    const currentRoute = activeCelebrationRoute ?? selectedRoute
    const operatorRoutes = availableRoutes.filter((route) => route.operatorId === currentRoute.operatorId)
    const currentIndex = operatorRoutes.findIndex((route) => route.id === currentRoute.id)
    const nextRoute = operatorRoutes[(currentIndex + 1) % operatorRoutes.length]
    setRouteCelebrationDismissed(true)
    setManualRouteCelebration(undefined)
    if (nextRoute) {
      setLastRouteByOperator((current) => ({ ...current, [nextRoute.operatorId]: nextRoute.id }))
      setZoom(1)
      setMapResetKey((value) => value + 1)
      navigate(`/?route=${nextRoute.id}`, { replace: true, state: null })
    }
  }

  const replaySelectedRouteCelebration = () => {
    if (selectedProgress.achievement === 'none') return
    setManualRouteCelebration({ routeId: selectedRoute.id, level: selectedProgress.achievement })
    setRouteCelebrationIndex(0)
    setRouteCelebrationDismissed(false)
    setRouteCelebrationReplayKey((value) => value + 1)
  }

  const dismissRouteCelebration = () => {
    setRouteCelebrationDismissed(true)
    setManualRouteCelebration(undefined)
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }

  return (
    <div className={`page-shell ${state.settings.reduceMotion ? 'reduce-motion' : ''}`}>
      <AppHeader />
      <main className="home-main">
        {storageWarning && <div className="notice notice--warning">{storageWarning}</div>}
        {celebration.celebrateStationId && !activeRouteCelebration && (
          <div className="celebration" role="status">
            <span className="celebration-spark" aria-hidden="true">✦</span>
            <div>
              <strong>{newlyEarnedCheckpoint ? `${Math.round(newlyEarnedCheckpoint.ratio * 100)}% くかんスタンプ！` : celebration.allFreeWritten ? 'おてほんなしで ぜんぶ かけた！' : celebration.firstAdd ? 'えきが ふえた！' : 'また かけたね！'}</strong>
              <span>{stationById.get(celebration.celebrateStationId)?.reading}</span>
            </div>
          </div>
        )}

        <Link className="kana-search-link" to="/kana">
          <span className="kana-search-sample" aria-hidden="true">あ</span>
          <span><strong>ひらがなから さがす</strong><small>もじを おして、えきを みつけよう</small></span>
          <MaterialIcon name="arrow_forward" />
        </Link>

        <section className={`map-card ${selectedProgress.achievement !== 'none' ? `map-card--${selectedProgress.achievement}` : ''}`} aria-labelledby="map-heading">
          <div className="map-heading-row">
            <div>
              <p className="eyebrow">きょうは どこへ いこう？</p>
              <h1 id="map-heading">ろせんず</h1>
            </div>
            <div className="map-controls">
              <div className="segmented" aria-label="えきの ひょうじ">
                <button type="button" className={mode === 'all' ? 'selected' : ''} onClick={() => setMode('all')}>ぜんぶ</button>
                <button type="button" className={mode === 'mine' ? 'selected' : ''} onClick={() => setMode('mine')}>じぶんの えき</button>
              </div>
              <div className="zoom-controls" aria-label="ろせんずの おおきさ">
                <button type="button" aria-label="ちいさくする" onClick={() => setZoom((value) => Math.max(.85, value - .15))}><MaterialIcon name="zoom_out" /></button>
                <button type="button" className="icon-button" onClick={() => { setZoom(.85); setMapResetKey((value) => value + 1) }}><MaterialIcon name="fit_screen" />ぜんたいを みる</button>
                <button type="button" aria-label="おおきくする" onClick={() => setZoom((value) => Math.min(1.45, value + .15))}><MaterialIcon name="zoom_in" /></button>
              </div>
            </div>
          </div>

          <div className="route-picker">
            <div className="route-picker-group">
              <p className="route-picker-label"><span>1</span>てつどうがいしゃ</p>
              <nav className="operator-tabs" aria-label="てつどうがいしゃを えらぶ">
                {railwayOperators.map((operator) => {
                  const progress = operatorProgress.get(operator.id) ?? { completedRoutes: 0, masteredRoutes: 0 }
                  const unlocked = isOperatorUnlocked(operator, state.unlockedMilestones)
                  const accessProgress = operatorUnlockProgress.get(operator.id)
                  return (
                    <button
                      key={operator.id}
                      type="button"
                      className={`${operator.id === selectedOperator.id ? 'operator-tab operator-tab--active' : 'operator-tab'} ${unlocked ? '' : 'operator-tab--locked'}`.trim()}
                      style={{ '--operator-color': operator.color } as React.CSSProperties}
                      aria-pressed={operator.id === selectedOperator.id}
                      disabled={!unlocked}
                      onClick={() => chooseOperator(operator.id)}
                    >
                      {unlocked
                        ? <i className="operator-tab-mark" aria-hidden="true"><span /><span /><span /></i>
                        : <span className="operator-tab-lock" aria-hidden="true"><MaterialIcon name="lock" filled /></span>}
                      <span className="operator-tab-copy">
                        <strong>{operator.name}</strong>
                        <small>
                          {unlocked
                            ? operator.id === 'tokyo-metro'
                              ? <>スタンプ {metroStatus.earnedStamps}こ{metroStatus.availableChoices > 0 && `　🎫${metroStatus.availableChoices}まい`}</>
                              : <>{progress.completedRoutes}/{operator.routeIds.length}ろせん クリア{progress.masteredRoutes > 0 && `　★★${progress.masteredRoutes}`}</>
                            : <>{accessProgress?.completed ?? 0}/{accessProgress?.total ?? 0}ろせん　あと{Math.max(0, (accessProgress?.total ?? 0) - (accessProgress?.completed ?? 0))}ろせん</>}
                        </small>
                      </span>
                    </button>
                  )
                })}
              </nav>
            </div>
            <div className="route-picker-group">
              <p className="route-picker-label"><span>2</span>ろせん</p>
              <nav className="route-tabs" aria-label={`${selectedOperator.name}の ろせんを えらぶ`}>
                {visibleRoutes.map((route) => {
                  const progress = routeProgress.get(route.id) ?? {
                    stationIds: [], completed: 0, achievement: 'none' as const,
                    effort: { practicedPositions: 0, totalPositions: 0, ratio: 0 }, checkpoints: 0,
                  }
                  return (
                    <button
                      key={route.id}
                      type="button"
                      className={route.id === selectedRoute.id ? 'route-tab route-tab--active' : 'route-tab'}
                      style={{ '--route-color': route.color } as React.CSSProperties}
                      aria-pressed={route.id === selectedRoute.id}
                      onClick={() => chooseRoute(route.id)}
                    >
                      <span aria-hidden="true" />
                      <strong>{route.name}</strong>
                      <small>{progress.completed}/{progress.stationIds.length}{progress.checkpoints > 0 && `　●${progress.checkpoints}/4`}</small>
                      {progress.achievement !== 'none' && (
                        <i className={`route-tab-achievement route-tab-achievement--${progress.achievement}`} aria-label={progress.achievement === 'master' ? 'ろせんマスター' : 'ろせんクリア'}>
                          {progress.achievement === 'master' ? '★★' : '★'}
                        </i>
                      )}
                    </button>
                  )
                })}
              </nav>
            </div>
            {selectedOperator.id === 'tokyo-metro' && lockedMetroRoutes.length > 0 && (
              <section className={`metro-unlock-panel ${metroStatus.availableChoices > 0 ? 'metro-unlock-panel--ready' : ''}`} aria-labelledby="metro-unlock-heading">
                <div className="metro-unlock-heading">
                  <span className="metro-ticket" aria-hidden="true"><MaterialIcon name={metroStatus.availableChoices > 0 ? 'confirmation_number' : 'lock'} filled /></span>
                  <div>
                    <strong id="metro-unlock-heading">{metroStatus.availableChoices > 0 ? 'すきな ろせんを ひらけるよ！' : 'くかんスタンプを あつめよう'}</strong>
                    <small>
                      スタンプ {metroStatus.earnedStamps}こ
                      {metroStatus.availableChoices > 0
                        ? `　きっぷ ${metroStatus.availableChoices}まい`
                        : metroStatus.nextStampTarget ? `　あと ${Math.max(0, metroStatus.nextStampTarget - metroStatus.earnedStamps)}こ` : ''}
                    </small>
                  </div>
                </div>
                <div className="metro-locked-routes">
                  {lockedMetroRoutes.map((route) => (
                    <button
                      key={route.id}
                      type="button"
                      style={{ '--route-color': route.color } as React.CSSProperties}
                      disabled={metroStatus.availableChoices < 1}
                      onClick={() => unlockAndChooseRoute(route.id)}
                    >
                      <i aria-hidden="true" />
                      <span><strong>{route.name}</strong><small>{route.orderedStationIds.length}えき</small></span>
                      <MaterialIcon name={metroStatus.availableChoices > 0 ? 'lock_open' : 'lock'} filled={metroStatus.availableChoices > 0} />
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
          <div className={`route-progress route-progress--${selectedProgress.achievement}`} style={{ '--route-color': selectedRoute.color } as React.CSSProperties}>
            <div className="route-progress-copy">
              <strong>{selectedRoute.name}</strong>
              <span>
                {selectedProgress.achievement === 'master'
                  ? '★★ おてほんなしで ぜんぶ かけた！'
                  : selectedProgress.achievement === 'complete'
                    ? '★ ぜんぶ かけた！'
                    : `${selectedProgress.completed} / ${selectedProgress.stationIds.length} えき かけた`}
              </span>
              {selectedProgress.achievement !== 'none' && <button type="button" className="route-celebration-button icon-button" onClick={replaySelectedRouteCelebration}><MaterialIcon name="celebration" filled />おいわいを みる</button>}
            </div>
            <div className="route-effort-meter">
              <progress
                value={selectedProgress.effort.practicedPositions}
                max={Math.max(1, selectedProgress.effort.totalPositions)}
                aria-label={`${selectedRoute.name}、${Math.round(selectedProgress.effort.ratio * 100)}パーセント すすんだ`}
              />
              <div className="route-checkpoints" aria-label={`くかんスタンプ ${selectedProgress.checkpoints}/4`}>
                {ROUTE_CHECKPOINT_RATIOS.map((ratio) => (
                  <span key={ratio} className={selectedProgress.effort.ratio >= ratio ? 'earned' : ''}>
                    <i aria-hidden="true">{selectedProgress.effort.ratio >= ratio ? '●' : '○'}</i>{Math.round(ratio * 100)}%
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="segment-label">しゅうろくくかん：{selectedSegment}（{selectedProgress.stationIds.length}えき）</div>
          {selectedRoute.note && <p className="route-note">{selectedRoute.note}</p>}
          <RouteMap
            key={`${selectedRoute.id}-${activeRouteCelebration ? routeCelebrationReplayKey : 'steady'}`}
            route={selectedRoute}
            stationIds={selectedProgress.stationIds}
            mode={mode}
            zoom={zoom}
            celebrateStationId={activeRouteCelebration ? undefined : celebration.celebrateStationId}
            celebrateRouteLevel={activeRouteCelebration?.routeId === selectedRoute.id ? activeRouteCelebration.level : undefined}
            routeCelebrationKey={routeCelebrationReplayKey}
            scrollResetKey={mapResetKey}
            onSelect={(stationId) => navigate(`/station/${stationId}?route=${selectedRoute.id}`)}
          />
          <div className="map-legend" aria-label="えきの しるし">
            <span><i className="legend-dot" />まだの えき</span>
            <span><i className="legend-dot legend-dot--added" />いちぶ かいた</span>
            <span><i className="legend-star">★</i>ぜんぶ かいた</span>
            <span><i className="legend-star legend-star--free-written">★★</i>おてほんなしで かいた</span>
          </div>
        </section>

        {customUnplaced.length > 0 && (
          <section className="found-stations" aria-labelledby="found-heading">
            <div>
              <p className="eyebrow">おうちのひとが いれた</p>
              <h2 id="found-heading">みつけた えき</h2>
            </div>
            <div className="found-list">
              {customUnplaced.map((station) => (
                <button key={station.id} type="button" onClick={() => navigate(`/station/${station.id}?route=found`)}>
                  <strong>{station.displayName}</strong><span>{station.reading}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
      {activeRouteCelebration && activeCelebrationRoute && celebrationProgress && (
        <div
          key={`${activeRouteCelebration.routeId}-${activeRouteCelebration.level}-${routeCelebrationReplayKey}`}
          className={`route-reward-backdrop route-reward-backdrop--${activeRouteCelebration.level}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="route-reward-title"
          aria-describedby="route-reward-count"
        >
          <div className="route-confetti" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--confetti-index': index } as React.CSSProperties}>{index % 3 === 0 ? '★' : '●'}</i>)}
          </div>
          <div className="route-reward-card" style={{ '--route-color': activeCelebrationRoute.color } as React.CSSProperties}>
            <div className="route-reward-medal" aria-hidden="true">
              <span>{activeRouteCelebration.level === 'master' ? '★★' : '★'}</span>
            </div>
            {routeCelebrations.length > 1 && <p className="route-reward-step">{routeCelebrationIndex + 1} / {routeCelebrations.length} ろせん</p>}
            <p className="eyebrow">{activeCelebrationRoute.name}</p>
            <h2 id="route-reward-title">
              {activeRouteCelebration.level === 'master' ? 'ろせんマスター！' : 'ぜんぶ かけた！'}
            </h2>
            <div className="route-reward-track" aria-hidden="true">
              <span className="route-reward-train">▰</span>
              {Array.from({ length: Math.min(9, celebrationProgress.stationIds.length) }, (_, index) => <i key={index} style={{ '--celebration-index': index } as React.CSSProperties} />)}
            </div>
            <p id="route-reward-count" className="route-reward-count">
              {celebrationProgress.stationIds.length} / {celebrationProgress.stationIds.length} えき ぜんぶ かけた
            </p>
            {activeRouteCelebration.level === 'master' && <p className="route-reward-master-copy">おてほんなしで ぜんえき クリア！</p>}
            {newlyUnlockedOperator && (
              <div className="operator-unlock-reward" role="status">
                <MaterialIcon name="lock_open" filled />
                <span><strong>{newlyUnlockedOperator.name}が ひらいた！</strong><small>あたらしい 9ろせんへ しゅっぱつ！</small></span>
              </div>
            )}
            <div className="route-reward-actions">
              <button type="button" className="soft-button icon-button" onClick={() => setRouteCelebrationReplayKey((value) => value + 1)}><MaterialIcon name="replay" />もういちど おいわい</button>
              {routeCelebrationIndex < routeCelebrations.length - 1
                ? <button type="button" className="soft-button icon-button" onClick={showNextCelebration}><MaterialIcon name="skip_next" />つぎの おいわい</button>
                : <button type="button" className="soft-button icon-button" onClick={goToNextRoute}><MaterialIcon name="arrow_forward" />つぎの ろせんへ</button>}
              <button type="button" className="primary-button icon-button" onClick={dismissRouteCelebration}><MaterialIcon name="route" />ろせんずを みる</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
