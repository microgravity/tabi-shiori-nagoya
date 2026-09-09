import type { Station } from '../../domain/types'
import { builtInStationById, routes } from '../../data/stations'
import { buildRouteMapLayout } from './routeMapLayout'

const station = (id: string, displayName: string, reading: string): Station => ({
  id,
  displayName,
  reading,
  builtIn: true,
})

describe('路線図の駅間隔', () => {
  it('全21路線の組み込み駅名と読みが隣の駅へ重ならない', () => {
    for (const route of routes) {
      const { points } = buildRouteMapLayout(route.orderedStationIds, builtInStationById)
      for (let index = 1; index < points.length; index += 1) {
        const previousRight = points[index - 1].x + points[index - 1].labelHalfWidth
        const currentLeft = points[index].x - points[index].labelHalfWidth
        expect(currentLeft - previousRight, `${route.name}: ${points[index - 1].id} → ${points[index].id}`).toBeGreaterThanOrEqual(28)
      }
    }
  })

  it('長い駅名と読みの前後に余白を確保する', () => {
    const stations = new Map([
      ['before', station('before', 'すずかけ台', 'すずかけだい')],
      ['long', station('long', '南町田グランベリーパーク', 'みなみまちだぐらんべりーぱーく')],
      ['after', station('after', 'つきみ野', 'つきみの')],
    ])
    const { points } = buildRouteMapLayout(['before', 'long', 'after'], stations)

    for (let index = 1; index < points.length; index += 1) {
      const previousRight = points[index - 1].x + points[index - 1].labelHalfWidth
      const currentLeft = points[index].x - points[index].labelHalfWidth
      expect(currentLeft - previousRight).toBeGreaterThanOrEqual(28)
    }
  })

  it('短い駅名は従来どおり押しやすい駅間隔を保つ', () => {
    const stations = new Map([
      ['one', station('one', '渋谷', 'しぶや')],
      ['two', station('two', '池尻大橋', 'いけじりおおはし')],
    ])
    const { points } = buildRouteMapLayout(['one', 'two'], stations)
    expect(points[1].x - points[0].x).toBeGreaterThanOrEqual(138)
  })

  it('長いカスタム駅が先頭や末尾でもSVGの外へはみ出さない', () => {
    const stations = new Map([
      ['custom', { ...station('custom', 'とてもながいカスタムえきのなまえ', 'とてもながいかすたむえきのなまえ'), builtIn: false }],
    ])
    const { points, width } = buildRouteMapLayout(['custom'], stations)
    expect(points[0].x - points[0].labelHalfWidth).toBeGreaterThanOrEqual(28)
    expect(width - (points[0].x + points[0].labelHalfWidth)).toBeGreaterThanOrEqual(28)
  })
})
