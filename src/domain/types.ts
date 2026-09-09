export type Handedness = 'left' | 'right'
export type TraceStrictness = 'gentle' | 'standard' | 'careful'
export type LearningModeId = 'hiragana' | 'katakana' | 'kanji'

export interface Station {
  id: string
  displayName: string
  reading: string
  speechText?: string
  sourceUrl?: string
  builtIn: boolean
}

export interface Route {
  id: string
  operatorId: string
  name: string
  color: string
  segmentLabel: string
  orderedStationIds: string[]
  stationCodes: string[]
  sourceUrl: string
  note?: string
  unlockMilestoneId?: string
}

export interface RailwayOperator {
  id: string
  name: string
  displayName: string
  shortName: string
  color: string
  routeIds: string[]
  sourceUrl: string
  unlockMilestoneId?: string
}

export interface LearningMode {
  id: LearningModeId
  name: string
  unlockMilestoneId?: string
}

export interface CustomStation extends Station {
  builtIn: false
  routeId: string | null
  insertAfterStationId: string | null
}

export interface StationOverride {
  displayName: string
  reading: string
  speechText?: string
}

export interface PracticeProgress {
  readingSnapshot: string
  practicedPositions: number[]
  freeWrittenPositions: number[]
  currentPosition: number
  added: boolean
  addedAt?: string
}

export interface AppSettings {
  handedness: Handedness
  traceStrictness: TraceStrictness
  speechRate: number
  volume: number
  muted: boolean
  reduceMotion: boolean
}

export interface PersistedState {
  schemaVersion: 1
  unlockSystemVersion: number
  settings: AppSettings
  customStations: CustomStation[]
  stationOverrides: Record<string, StationOverride>
  progress: Record<string, PracticeProgress>
  unlockedMilestones: string[]
}

export type AppState = PersistedState
