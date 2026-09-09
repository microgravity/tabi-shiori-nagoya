import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { MaterialIcon } from '../components/MaterialIcon'
import { railwayOperators, routes } from '../data/stations'
import { hasGlyph } from '../data/kana'
import { isHiraganaReading, normalizeReading, splitKana } from '../domain/kana'
import type { CustomStation } from '../domain/types'
import { isRouteUnlocked } from '../domain/unlocks'
import { useSpeech } from '../services/speech/useSpeech'
import { parseBackup, serializeBackup } from '../services/storage/storage'
import { useAppState } from './AppState'

function makeCustomId(): string {
  return `custom-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`
}

export function ParentPage() {
  const {
    state,
    stations,
    stationById,
    routeStationIds,
    updateSettings,
    saveStation,
    deleteCustomStation,
    resetBuiltInStation,
    replaceState,
    clearAll,
    storageWarning,
  } = useAppState()
  const { speak, available } = useSpeech()
  const [editingId, setEditingId] = useState('new')
  const [displayName, setDisplayName] = useState('')
  const [reading, setReading] = useState('')
  const [speechText, setSpeechText] = useState('')
  const [routeId, setRouteId] = useState('')
  const [insertAfter, setInsertAfter] = useState('')
  const [status, setStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const editingStation = editingId === 'new' ? undefined : stationById.get(editingId)

  useEffect(() => {
    if (!editingStation) {
      setDisplayName('')
      setReading('')
      setSpeechText('')
      setRouteId('')
      setInsertAfter('')
      return
    }
    setDisplayName(editingStation.displayName)
    setReading(editingStation.reading)
    setSpeechText(editingStation.speechText ?? '')
    if (editingStation.builtIn) {
      setRouteId('')
      setInsertAfter('')
    } else {
      const custom = editingStation as CustomStation
      setRouteId(custom.routeId ?? '')
      setInsertAfter(custom.insertAfterStationId ?? '')
    }
  }, [editingStation])

  const normalizedReading = normalizeReading(reading)
  const missingGlyphs = useMemo(
    () => [...new Set(splitKana(normalizedReading).filter((kana) => !hasGlyph(kana)))],
    [normalizedReading],
  )
  const canSave = displayName.trim().length > 0 && displayName.trim().length <= 40
    && normalizedReading.length <= 40 && isHiraganaReading(normalizedReading)
  const insertionChoices = routeId
    ? routeStationIds(routeId).filter((id) => id !== editingStation?.id).map((id) => stationById.get(id)).filter(Boolean)
    : []
  const editableRoutes = routes.filter((route) => isRouteUnlocked(route, railwayOperators, state.unlockedMilestones))

  const submitStation = (event: FormEvent) => {
    event.preventDefault()
    if (!canSave) return
    if (editingStation?.builtIn) {
      saveStation({ ...editingStation, displayName, reading: normalizedReading, speechText: speechText || undefined })
    } else {
      const existing = editingStation as CustomStation | undefined
      const custom: CustomStation = {
        id: existing?.id ?? makeCustomId(),
        displayName,
        reading: normalizedReading,
        speechText: speechText || undefined,
        builtIn: false,
        routeId: routeId || null,
        insertAfterStationId: routeId ? insertAfter || null : null,
      }
      saveStation(custom, custom.routeId, custom.insertAfterStationId)
      setEditingId(custom.id)
    }
    setStatus('駅を保存しました。')
  }

  const exportBackup = () => {
    const blob = new Blob([serializeBackup(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `jibun-no-rosenzu-${new Date().toISOString().slice(0, 10)}.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus('バックアップを書き出しました。')
  }

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = parseBackup(await file.text())
      const summary = `設定、練習記録 ${Object.keys(parsed.progress).length}駅、追加駅 ${parsed.customStations.length}件を置き換えます。\n\n先に現在のバックアップを書き出しましたか？`
      if (!window.confirm(summary)) return
      replaceState(parsed)
      setEditingId('new')
      setStatus('バックアップを読み込みました。')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'バックアップを読み込めませんでした。')
    }
  }

  return (
    <div className="page-shell parent-page">
      <AppHeader compact />
      <main className="parent-main">
        <Link className="back-link" to="/"><MaterialIcon name="arrow_back" />ろせんず</Link>
        <div className="parent-title">
          <div className="parent-title-heading">
            <span className="parent-title-icon"><MaterialIcon name="settings" filled /></span>
            <div>
              <p className="eyebrow">保護者向け</p>
              <h1>おうちのひと</h1>
            </div>
          </div>
          <p>この入口は誤操作を減らすためのものです。認証やセキュリティ機能ではありません。</p>
        </div>
        {(storageWarning || status) && <div className="notice" role="status">{storageWarning ?? status}</div>}

        <div className="parent-grid">
          <section className="parent-card" aria-labelledby="settings-title">
            <p className="card-number">01</p>
            <h2 id="settings-title" className="icon-heading"><MaterialIcon name="tune" />使いかた</h2>
            <fieldset>
              <legend>利き手</legend>
              <label className="choice"><input type="radio" name="hand" checked={state.settings.handedness === 'left'} onChange={() => updateSettings({ handedness: 'left' })} /> 左利き</label>
              <label className="choice"><input type="radio" name="hand" checked={state.settings.handedness === 'right'} onChange={() => updateSettings({ handedness: 'right' })} /> 右利き</label>
            </fieldset>
            <fieldset>
              <legend>なぞり判定</legend>
              <div className="strictness-choices">
                <label className="choice choice--setting">
                  <input type="radio" name="trace-strictness" checked={state.settings.traceStrictness === 'gentle'} onChange={() => updateSettings({ traceStrictness: 'gentle' })} />
                  <span><strong>やさしい</strong><small>だいたい重なればOK</small></span>
                </label>
                <label className="choice choice--setting">
                  <input type="radio" name="trace-strictness" checked={state.settings.traceStrictness === 'standard'} onChange={() => updateSettings({ traceStrictness: 'standard' })} />
                  <span><strong>ふつう</strong><small>ずれや書き順違いも許容</small></span>
                </label>
                <label className="choice choice--setting">
                  <input type="radio" name="trace-strictness" checked={state.settings.traceStrictness === 'careful'} onChange={() => updateSettings({ traceStrictness: 'careful' })} />
                  <span><strong>しっかり</strong><small>始点と書き順も確認</small></span>
                </label>
              </div>
            </fieldset>
            <label className="range-field">
              <span>声の速さ <output>{state.settings.speechRate.toFixed(2)}</output></span>
              <input type="range" min="0.5" max="1.2" step="0.05" value={state.settings.speechRate} onChange={(event) => updateSettings({ speechRate: Number(event.target.value) })} />
            </label>
            <label className="range-field">
              <span>音量 <output>{Math.round(state.settings.volume * 100)}%</output></span>
              <input type="range" min="0" max="1" step="0.05" value={state.settings.volume} onChange={(event) => updateSettings({ volume: Number(event.target.value) })} />
            </label>
            <label className="toggle"><input type="checkbox" checked={state.settings.muted} onChange={(event) => updateSettings({ muted: event.target.checked })} /> 音声をミュート</label>
            <label className="toggle"><input type="checkbox" checked={state.settings.reduceMotion} onChange={(event) => updateSettings({ reduceMotion: event.target.checked })} /> 動きを減らす</label>
          </section>

          <section className="parent-card parent-card--wide" aria-labelledby="station-editor-title">
            <p className="card-number">02</p>
            <h2 id="station-editor-title" className="icon-heading"><MaterialIcon name="edit" />駅を追加・編集</h2>
            <label className="field">
              <span>編集する駅</span>
              <select value={editingId} onChange={(event) => { setEditingId(event.target.value); setStatus('') }}>
                <option value="new">＋ あたらしい駅</option>
                <optgroup label="追加した駅">
                  {state.customStations.map((station) => <option key={station.id} value={station.id}>{station.displayName}</option>)}
                </optgroup>
                <optgroup label="組み込み駅">
                  {stations.filter((station) => station.builtIn).map((station) => <option key={station.id} value={station.id}>{station.displayName}</option>)}
                </optgroup>
              </select>
            </label>
            <form className="station-form" onSubmit={submitStation}>
              <label className="field"><span>駅名</span><input required maxLength={40} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="例：東京" /></label>
              <label className="field"><span>ひらがなの読み</span><input required maxLength={40} value={reading} onChange={(event) => setReading(event.target.value)} placeholder="例：とうきょう" inputMode="text" /></label>
              <label className="field"><span>音声用の読み（任意）</span><input maxLength={80} value={speechText} onChange={(event) => setSpeechText(event.target.value)} placeholder="空欄なら、ひらがなの読みを使用" /></label>
              {!editingStation?.builtIn && (
                <>
                  <label className="field"><span>置く場所</span><select value={routeId} onChange={(event) => { setRouteId(event.target.value); setInsertAfter('') }}>
                    <option value="">みつけた えき</option>
                    {railwayOperators.filter((operator) => editableRoutes.some((route) => route.operatorId === operator.id)).map((operator) => (
                      <optgroup key={operator.id} label={operator.displayName}>
                        {editableRoutes.filter((route) => route.operatorId === operator.id).map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}
                      </optgroup>
                    ))}
                  </select></label>
                  {routeId && <label className="field"><span>この駅の後ろに入れる</span><select value={insertAfter} onChange={(event) => setInsertAfter(event.target.value)}><option value="">収録区間のいちばん前</option>{insertionChoices.map((station) => station && <option key={station.id} value={station.id}>{station.displayName}</option>)}</select></label>}
                </>
              )}
              {!isHiraganaReading(normalizedReading) && reading.length > 0 && <p className="form-error">読みは、ひらがなで入力してください。</p>}
              {normalizedReading && (
                <div className={`coverage ${missingGlyphs.length ? 'coverage--partial' : ''}`}>
                  {missingGlyphs.length ? `画順データがない文字：${missingGlyphs.join('・')}（フォント見本と自由書きになります）` : 'すべての文字に画順のお手本があります。'}
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="soft-button icon-button" disabled={!normalizedReading || !available} onClick={() => speak(speechText || normalizedReading)}><MaterialIcon name="volume_up" />試しに聞く</button>
                <button type="submit" className="primary-button icon-button" disabled={!canSave}><MaterialIcon name="save" filled />駅を保存</button>
                {editingStation?.builtIn && state.stationOverrides[editingStation.id] && <button type="button" className="text-button icon-button" onClick={() => { resetBuiltInStation(editingStation.id); setStatus('組み込み駅を初期値に戻しました。') }}><MaterialIcon name="restart_alt" />初期値に戻す</button>}
                {editingStation && !editingStation.builtIn && <button type="button" className="danger-text icon-button" onClick={() => { if (window.confirm(`${editingStation.displayName}を削除しますか？`)) { deleteCustomStation(editingStation.id); setEditingId('new'); setStatus('追加駅を削除しました。') } }}><MaterialIcon name="delete_forever" />この追加駅を削除</button>}
              </div>
            </form>
          </section>

          <section className="parent-card parent-card--wide" aria-labelledby="data-title">
            <p className="card-number">03</p>
            <h2 id="data-title" className="icon-heading"><MaterialIcon name="storage" />保存とバックアップ</h2>
            <p>データはこのブラウザ内に保存されます。ブラウザデータの削除などで失われる場合があり、他の端末とは自動で同期しません。</p>
            <div className="data-actions">
              <button type="button" className="soft-button icon-button" onClick={exportBackup}><MaterialIcon name="download" />JSONを書き出す</button>
              <button type="button" className="soft-button icon-button" onClick={() => fileInputRef.current?.click()}><MaterialIcon name="upload" />JSONから復元</button>
              <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={importBackup} />
            </div>
            <p className="import-note">復元は現在の設定・進捗・追加駅をすべて置き換えます。復元前に、現在のJSONを書き出してください。</p>
            <button type="button" className="danger-button icon-button" onClick={() => { if (window.confirm('設定、進捗、追加した駅をすべて消します。元に戻せません。よろしいですか？')) { clearAll(); setEditingId('new'); setStatus('すべての端末内データを消去しました。') } }}><MaterialIcon name="delete_forever" />すべてのデータを消す</button>
          </section>
        </div>
      </main>
    </div>
  )
}
