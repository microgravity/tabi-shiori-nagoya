import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { builtInStations, routes } from '../data/stations'
import { normalizeReading } from '../domain/kana'
import { completeFreeWrittenPosition, completePosition, freshProgress, isStationFreeWritten, isStationPracticed, newlyUnlockedRouteAchievements, reconcileProgress, type RouteAchievement } from '../domain/progress'
import type { AppSettings, AppState, CustomStation, PersistedState, Station, StationOverride } from '../domain/types'
import { grantEarnedMilestones, grantMetroRouteChoice, migrateUnlockMilestones, UNLOCK_SYSTEM_VERSION } from '../domain/unlocks'
import { defaultState, loadState, saveState } from '../services/storage/storage'

interface AppStateValue {
  state: AppState
  stations: Station[]
  stationById: Map<string, Station>
  storageWarning?: string
  routeStationIds: (routeId: string) => string[]
  updateSettings: (patch: Partial<AppSettings>) => void
  markPositionComplete: (stationId: string, position: number, freeWritten?: boolean) => { firstAdd: boolean; allComplete: boolean; allFreeWritten: boolean; routeAchievements: RouteAchievement[]; unlockedMilestones: string[] }
  unlockRoute: (routeId: string) => void
  setCurrentPosition: (stationId: string, position: number) => void
  saveStation: (station: CustomStation | Station, routeId?: string | null, insertAfterStationId?: string | null) => void
  deleteCustomStation: (stationId: string) => void
  resetBuiltInStation: (stationId: string) => void
  replaceState: (state: PersistedState) => void
  clearAll: () => void
}

const Context = createContext<AppStateValue | null>(null)

function withEarnedMilestones(state: AppState): AppState {
  const stations = builtInStations.map((station) => ({ ...station, ...state.stationOverrides[station.id] }))
  const stationById = new Map(stations.map((station) => [station.id, station]))
  const unlockedMilestones = grantEarnedMilestones(
    migrateUnlockMilestones(state.unlockedMilestones, state.unlockSystemVersion),
    { routes, stationById, progress: state.progress },
  )
  return unlockedMilestones.length === state.unlockedMilestones.length && state.unlockSystemVersion === UNLOCK_SYSTEM_VERSION
    ? state
    : { ...state, unlockSystemVersion: UNLOCK_SYSTEM_VERSION, unlockedMilestones }
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const loaded = useMemo(() => {
    const result = loadState()
    return { ...result, state: withEarnedMilestones(result.state) }
  }, [])
  const [state, setState] = useState<AppState>(loaded.state)
  const [storageWarning, setStorageWarning] = useState<string | undefined>(loaded.warning)

  const stations = useMemo<Station[]>(() => {
    const merged = builtInStations.map((station) => ({ ...station, ...state.stationOverrides[station.id] }))
    return [...merged, ...state.customStations]
  }, [state.customStations, state.stationOverrides])
  const stationById = useMemo(() => new Map(stations.map((station) => [station.id, station])), [stations])

  useEffect(() => {
    try {
      saveState(state)
      setStorageWarning(undefined)
    } catch {
      setStorageWarning('このブラウザに ほぞんできませんでした。バックアップを おすすめします。')
    }
  }, [state])

  const routeStationIds = useCallback((routeId: string) => {
    const route = routes.find((item) => item.id === routeId)
    if (!route) return []
    const ordered = [...route.orderedStationIds]
    for (const station of state.customStations.filter((item) => item.routeId === routeId)) {
      if (station.insertAfterStationId === null) {
        ordered.unshift(station.id)
        continue
      }
      const index = ordered.indexOf(station.insertAfterStationId)
      ordered.splice(index >= 0 ? index + 1 : ordered.length, 0, station.id)
    }
    return ordered
  }, [state.customStations])

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setState((current) => ({ ...current, settings: { ...current.settings, ...patch } }))
  }, [])

  const markPositionComplete = useCallback((stationId: string, position: number, freeWritten = false) => {
    const station = stationById.get(stationId)
    if (!station) return { firstAdd: false, allComplete: false, allFreeWritten: false, routeAchievements: [], unlockedMilestones: [] }
    const previous = reconcileProgress(state.progress[stationId], station.reading)
    const update = freeWritten ? completeFreeWrittenPosition : completePosition
    const completed = update(previous, position)
    const progressAfter = { ...state.progress, [stationId]: completed }
    const routeAchievements = newlyUnlockedRouteAchievements(
      routes.map((route) => ({ routeId: route.id, stationIds: routeStationIds(route.id) })),
      stationById,
      state.progress,
      progressAfter,
    )
    const unlockedAfter = grantEarnedMilestones(state.unlockedMilestones, { routes, stationById, progress: progressAfter })
    const unlockedMilestones = unlockedAfter.filter((id) => !state.unlockedMilestones.includes(id))
    const result = {
      firstAdd: !previous.added,
      allComplete: isStationPracticed(completed, station.reading),
      allFreeWritten: isStationFreeWritten(completed, station.reading),
      routeAchievements,
      unlockedMilestones,
    }
    setState((current) => {
      const existing = reconcileProgress(current.progress[stationId], station.reading)
      return withEarnedMilestones({
        ...current,
        progress: { ...current.progress, [stationId]: update(existing, position) },
      })
    })
    return result
  }, [routeStationIds, state.progress, state.unlockedMilestones, stationById])

  const setCurrentPosition = useCallback((stationId: string, position: number) => {
    const station = stationById.get(stationId)
    if (!station) return
    setState((current) => {
      const progress = reconcileProgress(current.progress[stationId], station.reading)
      return { ...current, progress: { ...current.progress, [stationId]: { ...progress, currentPosition: position } } }
    })
  }, [stationById])

  const unlockRoute = useCallback((routeId: string) => {
    setState((current) => {
      const earned = withEarnedMilestones(current)
      const unlockedMilestones = grantMetroRouteChoice(earned.unlockedMilestones, routeId)
      return unlockedMilestones.length === earned.unlockedMilestones.length
        ? earned
        : { ...earned, unlockedMilestones }
    })
  }, [])

  const saveStation = useCallback((station: CustomStation | Station, routeId?: string | null, insertAfterStationId?: string | null) => {
    setState((current) => {
      if (station.builtIn) {
        const override: StationOverride = {
          displayName: station.displayName.trim(),
          reading: normalizeReading(station.reading),
          speechText: station.speechText?.trim() || undefined,
        }
        const previousReading = current.stationOverrides[station.id]?.reading
          ?? builtInStations.find((item) => item.id === station.id)?.reading
        const progress = { ...current.progress }
        if (previousReading !== override.reading) delete progress[station.id]
        return { ...current, stationOverrides: { ...current.stationOverrides, [station.id]: override }, progress }
      }
      const existing = station as CustomStation
      const custom: CustomStation = {
        ...existing,
        builtIn: false,
        displayName: station.displayName.trim(),
        reading: normalizeReading(station.reading),
        speechText: station.speechText?.trim() || undefined,
        routeId: routeId !== undefined ? routeId : existing.routeId,
        insertAfterStationId: insertAfterStationId !== undefined ? insertAfterStationId : existing.insertAfterStationId,
      }
      const customStations = current.customStations.some((item) => item.id === custom.id)
        ? current.customStations.map((item) => item.id === custom.id ? custom : item)
        : [...current.customStations, custom]
      const previousReading = current.customStations.find((item) => item.id === custom.id)?.reading
      const progress = { ...current.progress }
      if (previousReading && previousReading !== custom.reading) delete progress[custom.id]
      return { ...current, customStations, progress }
    })
  }, [])

  const deleteCustomStation = useCallback((stationId: string) => {
    setState((current) => {
      const progress = { ...current.progress }
      delete progress[stationId]
      return { ...current, customStations: current.customStations.filter((item) => item.id !== stationId), progress }
    })
  }, [])

  const resetBuiltInStation = useCallback((stationId: string) => {
    setState((current) => {
      const stationOverrides = { ...current.stationOverrides }
      delete stationOverrides[stationId]
      const progress = { ...current.progress }
      delete progress[stationId]
      return { ...current, stationOverrides, progress }
    })
  }, [])

  const value: AppStateValue = {
    state,
    stations,
    stationById,
    storageWarning,
    routeStationIds,
    updateSettings,
    markPositionComplete,
    unlockRoute,
    setCurrentPosition,
    saveStation,
    deleteCustomStation,
    resetBuiltInStation,
    replaceState: (replacement) => setState(withEarnedMilestones(replacement)),
    clearAll: () => setState(defaultState()),
  }

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export function useAppState(): AppStateValue {
  const value = useContext(Context)
  if (!value) throw new Error('useAppState must be used inside AppStateProvider')
  return value
}
