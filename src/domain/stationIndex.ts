import { normalizeReading, splitKana } from './kana'
import type { Route, Station } from './types'

export interface KanaStationMatch {
  stationId: string
  positions: number[]
  routeIds: string[]
}

export type KanaStationIndex = Map<string, KanaStationMatch[]>

interface StationOrder {
  route: number
  station: number
}

export function routeIdsForStation(stationId: string, routes: Route[]): string[] {
  return routes.filter((route) => route.orderedStationIds.includes(stationId)).map((route) => route.id)
}

export function buildKanaStationIndex(stations: Station[], routes: Route[]): KanaStationIndex {
  const index: KanaStationIndex = new Map()
  const uniqueStations = new Map(stations.map((station) => [station.id, station]))
  const stationOrder = new Map<string, StationOrder>()

  routes.forEach((route, routeIndex) => {
    route.orderedStationIds.forEach((stationId, stationIndex) => {
      if (!stationOrder.has(stationId)) stationOrder.set(stationId, { route: routeIndex, station: stationIndex })
    })
  })

  for (const station of uniqueStations.values()) {
    const positionsByKana = new Map<string, number[]>()
    splitKana(normalizeReading(station.reading)).forEach((kana, position) => {
      const positions = positionsByKana.get(kana) ?? []
      positions.push(position)
      positionsByKana.set(kana, positions)
    })

    const routeIds = routeIdsForStation(station.id, routes)
    for (const [kana, positions] of positionsByKana) {
      const matches = index.get(kana) ?? []
      matches.push({ stationId: station.id, positions, routeIds })
      index.set(kana, matches)
    }
  }

  for (const matches of index.values()) {
    matches.sort((a, b) => {
      const aOrder = stationOrder.get(a.stationId) ?? { route: Number.MAX_SAFE_INTEGER, station: Number.MAX_SAFE_INTEGER }
      const bOrder = stationOrder.get(b.stationId) ?? { route: Number.MAX_SAFE_INTEGER, station: Number.MAX_SAFE_INTEGER }
      if (aOrder.route !== bOrder.route) return aOrder.route - bOrder.route
      if (aOrder.station !== bOrder.station) return aOrder.station - bOrder.station
      const aStation = uniqueStations.get(a.stationId)
      const bStation = uniqueStations.get(b.stationId)
      return (aStation?.reading ?? '').localeCompare(bStation?.reading ?? '', 'ja')
        || (aStation?.displayName ?? '').localeCompare(bStation?.displayName ?? '', 'ja')
        || a.stationId.localeCompare(b.stationId)
    })
  }

  return index
}

export function matchesForKana(index: KanaStationIndex, value: string): KanaStationMatch[] {
  const characters = splitKana(normalizeReading(value))
  return characters.length === 1 ? index.get(characters[0]) ?? [] : []
}
