export type TripPracticeRecord = Record<string, readonly number[] | undefined>

type PracticeStop = { kana: string }
type PracticeDay = { stops: readonly PracticeStop[] }

export type PracticeSummary = {
  completedCharacters: number
  totalCharacters: number
  completedStops: number
  totalStops: number
}

export const PRACTICE_CHECKPOINTS = [0.25, 0.5, 0.75, 1] as const

export function stopPracticeSummary(kana: string, positions: readonly number[] | undefined) {
  const totalCharacters = [...kana.normalize('NFC')].length
  const completedCharacters = new Set(
    (positions ?? []).filter((position) => Number.isInteger(position) && position >= 0 && position < totalCharacters),
  ).size
  return {
    completedCharacters,
    totalCharacters,
    complete: totalCharacters > 0 && completedCharacters === totalCharacters,
  }
}

export function dayPracticeSummary(
  dayIndex: number,
  stops: readonly PracticeStop[],
  practice: TripPracticeRecord,
): PracticeSummary {
  return stops.reduce<PracticeSummary>((summary, stop, stopIndex) => {
    const current = stopPracticeSummary(stop.kana, practice[`${dayIndex}:${stopIndex}`])
    return {
      completedCharacters: summary.completedCharacters + current.completedCharacters,
      totalCharacters: summary.totalCharacters + current.totalCharacters,
      completedStops: summary.completedStops + (current.complete ? 1 : 0),
      totalStops: summary.totalStops + 1,
    }
  }, { completedCharacters: 0, totalCharacters: 0, completedStops: 0, totalStops: 0 })
}

export function tripPracticeSummary(days: readonly PracticeDay[], practice: TripPracticeRecord): PracticeSummary {
  return days.reduce<PracticeSummary>((summary, day, dayIndex) => {
    const current = dayPracticeSummary(dayIndex, day.stops, practice)
    return {
      completedCharacters: summary.completedCharacters + current.completedCharacters,
      totalCharacters: summary.totalCharacters + current.totalCharacters,
      completedStops: summary.completedStops + current.completedStops,
      totalStops: summary.totalStops + current.totalStops,
    }
  }, { completedCharacters: 0, totalCharacters: 0, completedStops: 0, totalStops: 0 })
}

export function crossedPracticeCheckpoint(before: number, after: number, total: number): number | null {
  if (total <= 0 || after <= before) return null
  const beforeRatio = before / total
  const afterRatio = after / total
  return [...PRACTICE_CHECKPOINTS].reverse().find((checkpoint) => beforeRatio < checkpoint && afterRatio >= checkpoint) ?? null
}
