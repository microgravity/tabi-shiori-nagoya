import type { PracticeProgress, Station } from './types'
import { readingVersion, splitKana } from './kana'

export type RouteAchievementLevel = 'none' | 'complete' | 'master'

export interface RouteAchievement {
  routeId: string
  level: Exclude<RouteAchievementLevel, 'none'>
}

export interface RouteProgressDefinition {
  routeId: string
  stationIds: string[]
}

export interface RouteEffortProgress {
  practicedPositions: number
  totalPositions: number
  ratio: number
}

export function freshProgress(reading: string): PracticeProgress {
  return {
    readingSnapshot: readingVersion(reading),
    practicedPositions: [],
    freeWrittenPositions: [],
    currentPosition: 0,
    added: false,
  }
}

export function reconcileProgress(progress: PracticeProgress | undefined, reading: string): PracticeProgress {
  const version = readingVersion(reading)
  if (!progress || progress.readingSnapshot !== version) return freshProgress(reading)
  const lastIndex = Math.max(0, splitKana(reading).length - 1)
  const practicedPositions = [...new Set(progress.practicedPositions)].filter((index) => index >= 0 && index <= lastIndex)
  return {
    ...progress,
    practicedPositions,
    freeWrittenPositions: [...new Set(progress.freeWrittenPositions ?? [])].filter((index) => practicedPositions.includes(index)),
    currentPosition: Math.min(Math.max(0, progress.currentPosition), lastIndex),
  }
}

export function completePosition(progress: PracticeProgress, position: number): PracticeProgress {
  return {
    ...progress,
    practicedPositions: [...new Set([...progress.practicedPositions, position])].sort((a, b) => a - b),
    currentPosition: position,
    added: true,
    addedAt: progress.addedAt ?? new Date().toISOString(),
  }
}

export function completeFreeWrittenPosition(progress: PracticeProgress, position: number): PracticeProgress {
  const completed = completePosition(progress, position)
  return {
    ...completed,
    freeWrittenPositions: [...new Set([...(completed.freeWrittenPositions ?? []), position])].sort((a, b) => a - b),
  }
}

export function isStationPracticed(progress: PracticeProgress | undefined, reading: string): boolean {
  if (!progress) return false
  const current = reconcileProgress(progress, reading)
  const positions = splitKana(reading)
  return positions.length > 0 && positions.every((_, index) => current.practicedPositions.includes(index))
}

export function isStationFreeWritten(progress: PracticeProgress | undefined, reading: string): boolean {
  if (!progress) return false
  const current = reconcileProgress(progress, reading)
  const positions = splitKana(reading)
  return positions.length > 0 && positions.every((_, index) => current.freeWrittenPositions.includes(index))
}

export function practicedKanaSet(
  stations: Iterable<Station>,
  progress: Record<string, PracticeProgress>,
): Set<string> {
  const practiced = new Set<string>()
  for (const station of stations) {
    const current = reconcileProgress(progress[station.id], station.reading)
    const kana = splitKana(station.reading)
    current.practicedPositions.forEach((position) => {
      if (kana[position]) practiced.add(kana[position])
    })
  }
  return practiced
}

export function completedStationCount(
  stationIds: string[],
  stationById: ReadonlyMap<string, Station>,
  progress: Record<string, PracticeProgress>,
): number {
  return [...new Set(stationIds)].filter((stationId) => {
    const station = stationById.get(stationId)
    return Boolean(station && isStationPracticed(progress[stationId], station.reading))
  }).length
}

export function routeEffortProgress(
  stationIds: readonly string[],
  stationById: ReadonlyMap<string, Station>,
  progress: Record<string, PracticeProgress>,
): RouteEffortProgress {
  let practicedPositions = 0
  let totalPositions = 0
  for (const stationId of new Set(stationIds)) {
    const station = stationById.get(stationId)
    if (!station) continue
    const length = splitKana(station.reading).length
    const current = reconcileProgress(progress[stationId], station.reading)
    totalPositions += length
    practicedPositions += current.practicedPositions.filter((position) => position < length).length
  }
  return {
    practicedPositions,
    totalPositions,
    ratio: totalPositions === 0 ? 0 : practicedPositions / totalPositions,
  }
}

export function routeAchievementLevel(
  stationIds: string[],
  stationById: ReadonlyMap<string, Station>,
  progress: Record<string, PracticeProgress>,
): RouteAchievementLevel {
  const uniqueStationIds = [...new Set(stationIds)]
  if (uniqueStationIds.length === 0) return 'none'
  const stations = uniqueStationIds.map((stationId) => stationById.get(stationId))
  if (stations.some((station) => !station)) return 'none'
  if (stations.every((station) => station && isStationFreeWritten(progress[station.id], station.reading))) {
    return 'master'
  }
  if (stations.every((station) => station && isStationPracticed(progress[station.id], station.reading))) {
    return 'complete'
  }
  return 'none'
}

export function newlyUnlockedRouteAchievements(
  definitions: RouteProgressDefinition[],
  stationById: ReadonlyMap<string, Station>,
  before: Record<string, PracticeProgress>,
  after: Record<string, PracticeProgress>,
): RouteAchievement[] {
  const rank: Record<RouteAchievementLevel, number> = { none: 0, complete: 1, master: 2 }
  return definitions.flatMap(({ routeId, stationIds }) => {
    const previousLevel = routeAchievementLevel(stationIds, stationById, before)
    const nextLevel = routeAchievementLevel(stationIds, stationById, after)
    return rank[nextLevel] > rank[previousLevel] && nextLevel !== 'none'
      ? [{ routeId, level: nextLevel }]
      : []
  })
}

export function nextUnpracticedPosition(progress: PracticeProgress, reading: string, after: number): number {
  const length = splitKana(reading).length
  for (let offset = 1; offset <= length; offset += 1) {
    const index = (after + offset) % length
    if (!progress.practicedPositions.includes(index)) return index
  }
  return (after + 1) % length
}

export function nextFreeWritingPosition(progress: PracticeProgress, reading: string, after: number): number {
  const current = reconcileProgress(progress, reading)
  const length = splitKana(reading).length
  for (let offset = 1; offset <= length; offset += 1) {
    const index = (after + offset) % length
    if (!current.freeWrittenPositions.includes(index)) return index
  }
  return (after + 1) % length
}
