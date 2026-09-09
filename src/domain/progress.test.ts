import { completeFreeWrittenPosition, completePosition, completedStationCount, freshProgress, isStationFreeWritten, isStationPracticed, newlyUnlockedRouteAchievements, practicedKanaSet, reconcileProgress, routeAchievementLevel, routeEffortProgress } from './progress'
import type { Station } from './types'

describe('練習進捗', () => {
  it('一文字の完了で駅を追加し、位置ごとに記録する', () => {
    const progress = completePosition(freshProgress('おお'), 1)
    expect(progress.added).toBe(true)
    expect(progress.practicedPositions).toEqual([1])
    expect(isStationPracticed(progress, 'おお')).toBe(false)
  })

  it('全位置を終えたときだけ全体完了になる', () => {
    const first = completePosition(freshProgress('おお'), 0)
    const second = completePosition(first, 1)
    expect(isStationPracticed(second, 'おお')).toBe(true)
  })

  it('お手本なし完了は通常完了の上位として位置ごとに記録する', () => {
    const first = completeFreeWrittenPosition(freshProgress('おお'), 0)
    expect(first.practicedPositions).toEqual([0])
    expect(first.freeWrittenPositions).toEqual([0])
    expect(isStationPracticed(first, 'おお')).toBe(false)
    expect(isStationFreeWritten(first, 'おお')).toBe(false)

    const second = completeFreeWrittenPosition(first, 1)
    expect(isStationPracticed(second, 'おお')).toBe(true)
    expect(isStationFreeWritten(second, 'おお')).toBe(true)
  })

  it('読みが変わったら古い位置進捗を引き継がない', () => {
    const old = completePosition(freshProgress('えき'), 0)
    expect(reconcileProgress(old, 'えきまえ')).toEqual(freshProgress('えきまえ'))
  })

  it('路線の完了駅だけを数え、共有駅とカスタム駅にも同じ進捗を使う', () => {
    const stations = new Map<string, Station>([
      ['shared', { id: 'shared', displayName: '共有', reading: 'えき', builtIn: true }],
      ['custom', { id: 'custom', displayName: '追加', reading: 'あ', builtIn: false }],
      ['partial', { id: 'partial', displayName: '途中', reading: 'かき', builtIn: true }],
    ])
    const progress = {
      shared: completePosition(completePosition(freshProgress('えき'), 0), 1),
      custom: completePosition(freshProgress('あ'), 0),
      partial: completePosition(freshProgress('かき'), 0),
    }
    expect(completedStationCount(['shared'], stations, progress)).toBe(1)
    expect(completedStationCount(['shared', 'custom'], stations, progress)).toBe(2)
    expect(completedStationCount(['shared', 'custom', 'partial'], stations, progress)).toBe(2)
    expect(completedStationCount(['shared', 'shared'], stations, progress)).toBe(1)
  })

  it('一度でも練習した文字を駅データから求める', () => {
    const stations: Station[] = [
      { id: 'one', displayName: '一', reading: 'がくげい', builtIn: true },
      { id: 'custom', displayName: '追加', reading: 'いけ', builtIn: false },
    ]
    const progress = {
      one: completePosition(completePosition(freshProgress('がくげい'), 0), 3),
      custom: completePosition(freshProgress('いけ'), 0),
    }
    expect(practicedKanaSet(stations, progress)).toEqual(new Set(['が', 'い']))
  })

  it('路線全駅の完了とお手本なしマスターを既存進捗から算出する', () => {
    const stations = new Map<string, Station>([
      ['one', { id: 'one', displayName: '一', reading: 'あ', builtIn: true }],
      ['two', { id: 'two', displayName: '二', reading: 'い', builtIn: true }],
    ])
    const partial = { one: completePosition(freshProgress('あ'), 0) }
    const complete = { ...partial, two: completePosition(freshProgress('い'), 0) }
    const master = {
      one: completeFreeWrittenPosition(freshProgress('あ'), 0),
      two: completeFreeWrittenPosition(freshProgress('い'), 0),
    }
    expect(routeAchievementLevel(['one', 'two'], stations, partial)).toBe('none')
    expect(routeAchievementLevel(['one', 'two'], stations, complete)).toBe('complete')
    expect(routeAchievementLevel(['one', 'two'], stations, master)).toBe('master')
  })

  it('駅数ではなく練習した文字位置から路線の途中進捗を算出する', () => {
    const stations = new Map<string, Station>([
      ['short', { id: 'short', displayName: '短', reading: 'あ', builtIn: true }],
      ['long', { id: 'long', displayName: '長', reading: 'かきく', builtIn: true }],
    ])
    const progress = {
      short: completePosition(freshProgress('あ'), 0),
      long: completePosition(freshProgress('かきく'), 0),
    }
    expect(routeEffortProgress(['short', 'long', 'short'], stations, progress)).toEqual({
      practicedPositions: 2,
      totalPositions: 4,
      ratio: 0.5,
    })
  })

  it('未完了からクリア、通常クリアからマスターへの変化だけを通知する', () => {
    const stations = new Map<string, Station>([
      ['shared', { id: 'shared', displayName: '共有', reading: 'あ', builtIn: true }],
      ['custom', { id: 'custom', displayName: '追加', reading: 'い', builtIn: false }],
    ])
    const before = { shared: freshProgress('あ'), custom: completePosition(freshProgress('い'), 0) }
    const complete = { ...before, shared: completePosition(freshProgress('あ'), 0) }
    const master = {
      shared: completeFreeWrittenPosition(freshProgress('あ'), 0),
      custom: completeFreeWrittenPosition(freshProgress('い'), 0),
    }
    const routes = [
      { routeId: 'one', stationIds: ['shared'] },
      { routeId: 'two', stationIds: ['shared', 'custom'] },
    ]
    expect(newlyUnlockedRouteAchievements(routes, stations, before, complete)).toEqual([
      { routeId: 'one', level: 'complete' },
      { routeId: 'two', level: 'complete' },
    ])
    expect(newlyUnlockedRouteAchievements(routes, stations, complete, master)).toEqual([
      { routeId: 'one', level: 'master' },
      { routeId: 'two', level: 'master' },
    ])
    expect(newlyUnlockedRouteAchievements(routes, stations, master, master)).toEqual([])
  })
})
