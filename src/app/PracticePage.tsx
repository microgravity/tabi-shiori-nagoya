import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { MaterialIcon } from '../components/MaterialIcon'
import { hasGlyph } from '../data/kana'
import { railwayOperators, routes } from '../data/stations'
import type { Point } from '../domain/input'
import { splitKana, speechForKana } from '../domain/kana'
import { nextFreeWritingPosition, nextUnpracticedPosition, reconcileProgress, type RouteAchievement } from '../domain/progress'
import { isRouteUnlocked, routeCheckpointMilestoneById } from '../domain/unlocks'
import { evaluateFreeWriting, evaluateTrace, freeWritingFeedback, traceAdvisory, traceFeedback, type TraceGuideStroke } from '../domain/traceEvaluation'
import { KanaStrip } from '../features/practice/KanaStrip'
import { sampleGlyphGuide } from '../features/practice/sampleGlyphGuide'
import { WritingPad } from '../features/practice/WritingPad'
import { useSpeech } from '../services/speech/useSpeech'
import { useAppState } from './AppState'

const strictnessNames = { gentle: 'やさしい', standard: 'ふつう', careful: 'しっかり' } as const

export function PracticePage() {
  const { stationId = '', position = '0' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { stationById, state, routeStationIds, setCurrentPosition, markPositionComplete } = useAppState()
  const { speak } = useSpeech()
  const station = stationById.get(stationId)
  const characters = useMemo(() => splitKana(station?.reading ?? ''), [station?.reading])
  const parsed = Number(position)
  const index = Number.isInteger(parsed) && parsed >= 0 && parsed < characters.length ? parsed : 0
  const requestedRouteId = params.get('route') ?? 'toyoko'
  const unlockedRoutes = routes.filter((route) => isRouteUnlocked(route, railwayOperators, state.unlockedMilestones))
  const stationRoutes = station ? unlockedRoutes.filter((route) => routeStationIds(route.id).includes(station.id)) : []
  const routeId = stationRoutes.some((route) => route.id === requestedRouteId)
    ? requestedRouteId
    : stationRoutes[0]?.id ?? 'found'
  const [mode, setMode] = useState<'trace' | 'free'>('trace')
  const [showGuide, setShowGuide] = useState(true)
  const [hasInk, setHasInk] = useState(false)
  const [inputStrokes, setInputStrokes] = useState<Point[][]>([])
  const [traceMessage, setTraceMessage] = useState('')
  const [allowTraceOverride, setAllowTraceOverride] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [replayKey, setReplayKey] = useState(0)
  const [reward, setReward] = useState<{ firstAdd: boolean; allComplete: boolean; allFreeWritten: boolean; routeAchievements: RouteAchievement[]; unlockedMilestones: string[]; notice?: string; freeWritingPassed: boolean } | null>(null)
  const kana = characters[index] ?? ''
  const traceAvailable = hasGlyph(kana)
  const activeMode = mode === 'trace' && traceAvailable ? 'trace' : 'free'
  const [traceGuide, setTraceGuide] = useState<TraceGuideStroke[] | null>(null)

  useEffect(() => {
    if (station) setCurrentPosition(station.id, index)
  }, [index, setCurrentPosition, station])

  useEffect(() => {
    setTraceGuide(traceAvailable ? sampleGlyphGuide(kana) : null)
  }, [kana, traceAvailable])

  if (!station || characters.length === 0 || (station.builtIn && stationRoutes.length === 0)) {
    return <main className="simple-message"><h1>えきが みつかりません</h1><Link to="/">ろせんずへ</Link></main>
  }

  const progress = reconcileProgress(state.progress[station.id], station.reading)

  const goTo = (nextIndex: number) => {
    setReward(null)
    setHasInk(false)
    setInputStrokes([])
    setTraceMessage('')
    setAllowTraceOverride(false)
    setTraceGuide(null)
    setResetKey((value) => value + 1)
    navigate(`/practice/${station.id}/${nextIndex}?route=${routeId}`, { replace: true })
  }

  const chooseMode = (nextMode: 'trace' | 'free') => {
    setMode(nextMode)
    setShowGuide(nextMode === 'trace')
    setHasInk(false)
    setInputStrokes([])
    setTraceMessage('')
    setAllowTraceOverride(false)
    setReward(null)
    setResetKey((value) => value + 1)
  }

  const done = (force = false) => {
    if (!hasInk) return
    let notice = ''
    let freeWritingPassed = false
    if (activeMode === 'trace' && !force) {
      if (!traceGuide) {
        setTraceMessage('おてほんを よみこめなかったよ')
        setAllowTraceOverride(true)
        return
      }
      const evaluation = evaluateTrace(inputStrokes, traceGuide, state.settings.traceStrictness)
      if (!evaluation.passed) {
        setTraceMessage(traceFeedback(evaluation))
        setAllowTraceOverride(true)
        return
      }
      notice = traceAdvisory(evaluation)
    }
    if (activeMode === 'free') {
      if (traceGuide) {
        const evaluation = evaluateFreeWriting(inputStrokes, traceGuide)
        freeWritingPassed = evaluation.passed
        notice = evaluation.passed
          ? 'じぶんの ちからで かけた！'
          : `${freeWritingFeedback(evaluation)} れんしゅうは できたよ。おてほんなしクリアは またこんど！`
      } else {
        freeWritingPassed = true
        notice = 'この もじは じぶんで できたと はんていしたよ！'
      }
    }
    const result = markPositionComplete(station.id, index, activeMode === 'free' && freeWritingPassed)
    const checkpoint = result.unlockedMilestones
      .map((id) => routeCheckpointMilestoneById.get(id))
      .find((milestone) => milestone?.routeId === routeId)
    if (checkpoint) {
      notice = `${notice ? `${notice}　` : ''}${Math.round(checkpoint.ratio * 100)}%！くかんスタンプを もらったよ！`
    }
    setTraceMessage('')
    setAllowTraceOverride(false)
    setReward({ ...result, notice, freeWritingPassed })
  }

  const next = () => goTo(activeMode === 'free'
    ? nextFreeWritingPosition(progress, station.reading, index)
    : nextUnpracticedPosition(progress, station.reading, index))
  const primaryRouteAchievement = reward?.routeAchievements.find((achievement) => achievement.routeId === routeId)
    ?? reward?.routeAchievements[0]
  const mapRouteId = primaryRouteAchievement?.routeId ?? (routeId === 'found' ? 'toyoko' : routeId)

  return (
    <div className={`page-shell practice-page practice-page--${state.settings.handedness} ${state.settings.reduceMotion ? 'reduce-motion' : ''}`}>
      <AppHeader compact />
      <main className="practice-main">
        <div className="practice-topbar">
          <Link className="back-link" to={`/station/${station.id}?route=${routeId}`}><MaterialIcon name="arrow_back" />{station.reading}</Link>
          <div className="practice-mode-area">
            {activeMode === 'trace'
              ? <span className="trace-level">はんてい：{strictnessNames[state.settings.traceStrictness]}</span>
              : <span className="trace-level trace-level--free">おてほんなし：かたちだけ</span>}
            <div className="mode-switch" aria-label="かきかた">
              <button type="button" className={activeMode === 'trace' ? 'selected' : ''} disabled={!traceAvailable} onClick={() => chooseMode('trace')}>なぞる</button>
              <button type="button" className={activeMode === 'free' ? 'selected' : ''} onClick={() => chooseMode('free')}>じぶんで かく</button>
            </div>
          </div>
        </div>

        <section className="practice-layout">
          <div className="practice-copy">
            <p className="eyebrow">{station.displayName}</p>
            <KanaStrip
              reading={station.reading}
              activeIndex={index}
              practicedPositions={progress.practicedPositions}
              freeWrittenPositions={progress.freeWrittenPositions}
              onSpeak={speak}
              onChoose={goTo}
            />
            <div className="current-kana"><span>{index + 1}</span>{kana}</div>
            {!hasGlyph(kana) && <p className="notice notice--small">このもじは おてほんなしで かいて、じぶんで できたか きめよう。</p>}
          </div>

          <WritingPad
            kana={kana}
            showGuide={activeMode === 'trace' && showGuide}
            animateGuide={activeMode === 'trace' && !state.settings.reduceMotion}
            replayKey={replayKey}
            resetKey={resetKey}
            onInkChange={setHasInk}
            onStrokesChange={(strokes) => { setInputStrokes(strokes); setTraceMessage(''); setAllowTraceOverride(false) }}
          />

          <aside className="practice-tools" aria-label="れんしゅうの そうさ">
            <button type="button" className="tool-button icon-button" onClick={() => speak(speechForKana(kana))}><MaterialIcon name="volume_up" />きく</button>
            <button type="button" className="tool-button icon-button" disabled={activeMode === 'free'} onClick={() => { setShowGuide(true); setReplayKey((value) => value + 1) }}><MaterialIcon name="play_arrow" filled />おてほん</button>
            <button type="button" className="tool-button icon-button" disabled={activeMode === 'free'} onClick={() => setShowGuide((value) => !value)}><MaterialIcon name={showGuide ? 'visibility_off' : 'visibility'} />{showGuide ? 'かくす' : 'みる'}</button>
            <button type="button" className={`done-button ${allowTraceOverride ? 'done-button--override' : ''}`} disabled={!hasInk} onClick={() => done(allowTraceOverride)}>
              <MaterialIcon name="check_circle" filled />{allowTraceOverride ? 'このまま できた' : 'できた'}
            </button>
            <button type="button" className="tool-button icon-button" onClick={next}><MaterialIcon name="skip_next" />つぎ</button>
          </aside>
        </section>
        {traceMessage
          ? <div className="trace-feedback" role="status"><strong>{traceMessage}</strong><span>なおしても、このままでも だいじょうぶ</span></div>
          : !hasInk && <p className="ink-hint">せんを ひとつ かくと「できた」を おせるよ</p>}
      </main>

      {reward && (
        <div className="reward-backdrop" role="dialog" aria-modal="true" aria-labelledby="reward-title">
          <div className="reward-card">
            <div className="haniwa" aria-hidden="true"><span className="haniwa-eye" /><span className="haniwa-eye" /><i /><b /></div>
            <p className="eyebrow">{kana} が かけたね！</p>
            <h2 id="reward-title">{reward.freeWritingPassed ? 'おてほんなし クリア！' : reward.firstAdd ? 'えきが ふえた！' : 'また かけたね！'}</h2>
            {reward.notice && <p className={`reward-notice ${activeMode === 'free' && !reward.freeWritingPassed ? 'reward-notice--try-again' : ''}`}>{reward.notice}</p>}
            <div className="reward-actions">
              <button type="button" className="soft-button icon-button" onClick={(activeMode === 'free' ? reward.allFreeWritten : reward.allComplete) ? () => goTo(0) : next}>
                <MaterialIcon name={(activeMode === 'free' ? reward.allFreeWritten : reward.allComplete) ? 'replay' : 'skip_next'} />
                {(activeMode === 'free' ? reward.allFreeWritten : reward.allComplete) ? 'もういちど かく' : 'つぎの もじ'}
              </button>
              <button
                type="button"
                className="primary-button icon-button"
                onClick={() => navigate(`/?route=${mapRouteId}`, { state: { celebrateStationId: station.id, firstAdd: reward.firstAdd, allFreeWritten: reward.allFreeWritten, routeAchievements: reward.routeAchievements, unlockedMilestones: reward.unlockedMilestones } })}
              >
                <MaterialIcon name={reward.routeAchievements.length > 0 ? 'celebration' : 'route'} filled={reward.routeAchievements.length > 0} />
                {reward.routeAchievements.length > 0 ? 'ろせん クリア！' : 'ろせんずを みる'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
