import type { Station } from '../../domain/types'

const MIN_STATION_SPACING = 138
const LABEL_GAP = 28
const EDGE_PADDING = 90
const MIN_LABEL_HALF_WIDTH = 54

export interface RouteMapPoint {
  id: string
  x: number
  labelHalfWidth: number
}

export interface RouteMapLayout {
  width: number
  points: RouteMapPoint[]
}

function characterCount(value: string): number {
  return Array.from(value.normalize('NFC')).length
}

export function estimateLabelHalfWidth(station: Station | undefined): number {
  if (!station) return MIN_LABEL_HALF_WIDTH
  const displayNameHalfWidth = characterCount(station.displayName) * 10 + 12
  const readingHalfWidth = characterCount(station.reading) * 7 + 12
  return Math.max(MIN_LABEL_HALF_WIDTH, displayNameHalfWidth, readingHalfWidth)
}

export function buildRouteMapLayout(
  stationIds: string[],
  stationById: ReadonlyMap<string, Station>,
): RouteMapLayout {
  const points: RouteMapPoint[] = []

  stationIds.forEach((id, index) => {
    const labelHalfWidth = estimateLabelHalfWidth(stationById.get(id))
    if (index === 0) {
      points.push({ id, x: Math.max(EDGE_PADDING, labelHalfWidth + LABEL_GAP), labelHalfWidth })
      return
    }
    const previous = points[index - 1]
    const spacing = Math.max(MIN_STATION_SPACING, previous.labelHalfWidth + labelHalfWidth + LABEL_GAP)
    points.push({ id, x: previous.x + spacing, labelHalfWidth })
  })

  const last = points.at(-1)
  const contentWidth = last ? last.x + Math.max(EDGE_PADDING, last.labelHalfWidth + LABEL_GAP) : 0
  return { width: Math.max(980, contentWidth), points }
}
