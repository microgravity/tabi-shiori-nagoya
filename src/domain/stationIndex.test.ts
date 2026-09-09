import { builtInStations, routes } from '../data/stations'
import type { Route, Station } from './types'
import { buildKanaStationIndex, matchesForKana } from './stationIndex'

describe('ひらがなから駅を探す索引', () => {
  const index = buildKanaStationIndex(builtInStations, routes)
  const stationById = new Map(builtInStations.map((station) => [station.id, station]))

  it('「い」で指定の駅を路線順に返す', () => {
    const names = matchesForKana(index, 'い').map((match) => stationById.get(match.stationId)?.displayName)
    expect(names).toEqual(expect.arrayContaining(['学芸大学', '池上', '石川台', '大井町']))
  })

  it('濁音と小書き文字を別文字として扱う', () => {
    const ka = new Set(matchesForKana(index, 'か').map((match) => match.stationId))
    const ga = new Set(matchesForKana(index, 'が').map((match) => match.stationId))
    const ya = new Set(matchesForKana(index, 'や').map((match) => match.stationId))
    const smallYa = new Set(matchesForKana(index, 'ゃ').map((match) => match.stationId))
    expect(ka).not.toEqual(ga)
    expect(ya).not.toEqual(smallYa)
    expect(matchesForKana(index, 'か\u3099')).toEqual(matchesForKana(index, 'が'))
  })

  it('共有駅を重複させず全所属路線を持たせる', () => {
    const jiyugaoka = matchesForKana(index, 'じ').find((match) => match.stationId === 'tokyu-ty07')
    expect(jiyugaoka?.routeIds).toEqual(['toyoko', 'oimachi'])
    expect(matchesForKana(index, 'じ').filter((match) => match.stationId === 'tokyu-ty07')).toHaveLength(1)
  })

  it('会社をまたぐ共有駅も一件にまとめる', () => {
    const yokohama = matchesForKana(index, 'よ').find((match) => match.stationId === 'tokyu-ty21')
    expect(yokohama?.routeIds).toEqual(['toyoko', 'sotetsu-main'])
    expect(matchesForKana(index, 'よ').filter((match) => match.stationId === 'tokyu-ty21')).toHaveLength(1)

    const shinyokohama = matchesForKana(index, 'し').find((match) => match.stationId === 'tokyu-sh01')
    expect(shinyokohama?.routeIds).toEqual(['shinyokohama', 'sotetsu-shinyokohama'])
  })

  it('同じ文字の全出現位置を保持する', () => {
    const gakugei = matchesForKana(index, 'い').find((match) => match.stationId === 'tokyu-ty05')
    expect(gakugei?.positions).toEqual([3, 5])
  })

  it('カスタム駅の追加・編集・削除を入力データから反映する', () => {
    const custom: Station = { id: 'custom-test', displayName: '試験', reading: 'いえ', builtIn: false }
    const customRoute: Route = { ...routes[0], orderedStationIds: [...routes[0].orderedStationIds, custom.id], stationCodes: [...routes[0].stationCodes, ''] }
    expect(matchesForKana(buildKanaStationIndex([...builtInStations, custom], [customRoute]), 'い').some((match) => match.stationId === custom.id)).toBe(true)

    const edited = { ...custom, reading: 'うえ' }
    expect(matchesForKana(buildKanaStationIndex([...builtInStations, edited], [customRoute]), 'い').some((match) => match.stationId === custom.id)).toBe(false)
    expect(matchesForKana(buildKanaStationIndex(builtInStations, routes), 'い').some((match) => match.stationId === custom.id)).toBe(false)
  })
})
