import { defaultState, parseBackup, serializeBackup } from './storage'

describe('バックアップ検証', () => {
  it('正しい状態を往復できる', () => {
    const state = defaultState()
    expect(parseBackup(serializeBackup(state))).toEqual(state)
  })

  it('不正JSONと未知のバージョンを拒否する', () => {
    expect(() => parseBackup('{')).toThrow()
    expect(() => parseBackup(JSON.stringify({ ...defaultState(), schemaVersion: 99 }))).toThrow(/バージョン/)
  })

  it('存在しない駅の進捗を拒否する', () => {
    const state = defaultState()
    state.progress.unknown = {
      readingSnapshot: 'えき',
      practicedPositions: [],
      freeWrittenPositions: [],
      currentPosition: 0,
      added: false,
    }
    expect(() => parseBackup(serializeBackup(state))).toThrow(/みつかりません/)
  })

  it('初期版の駅IDと進捗をそのまま読み込める', () => {
    const state = defaultState()
    state.progress['tokyu-ty05'] = {
      readingSnapshot: 'がくげいだいがく',
      practicedPositions: [0, 3],
      freeWrittenPositions: [0],
      currentPosition: 3,
      added: true,
      addedAt: '2026-09-06T00:00:00.000Z',
    }
    expect(parseBackup(serializeBackup(state)).progress['tokyu-ty05']).toEqual(state.progress['tokyu-ty05'])
  })

  it('判定設定がない旧データを「ふつう」で読み込む', () => {
    const oldState = JSON.parse(serializeBackup(defaultState()))
    delete oldState.settings.traceStrictness
    expect(parseBackup(JSON.stringify(oldState)).settings.traceStrictness).toBe('standard')
  })

  it('解除記録がない旧データを未解除の状態で読み込む', () => {
    const oldState = JSON.parse(serializeBackup(defaultState()))
    delete oldState.unlockedMilestones
    expect(parseBackup(JSON.stringify(oldState)).unlockedMilestones).toEqual([])
  })

  it('段階解除の世代がない旧データを移行対象として読み込む', () => {
    const oldState = JSON.parse(serializeBackup(defaultState()))
    delete oldState.unlockSystemVersion
    expect(parseBackup(JSON.stringify(oldState)).unlockSystemVersion).toBe(1)
  })

  it('一度獲得した解除記録をバックアップで保持する', () => {
    const state = defaultState()
    state.unlockedMilestones.push('tokyo-metro-unlock-v1')
    expect(parseBackup(serializeBackup(state)).unlockedMilestones).toEqual(['tokyo-metro-unlock-v1'])
  })

  it('お手本なし進捗がない旧データを空の上位進捗として読み込む', () => {
    const oldState = JSON.parse(serializeBackup(defaultState()))
    oldState.progress['tokyu-ty05'] = {
      readingSnapshot: 'がくげいだいがく',
      practicedPositions: [0, 3],
      currentPosition: 3,
      added: true,
    }
    expect(parseBackup(JSON.stringify(oldState)).progress['tokyu-ty05'].freeWrittenPositions).toEqual([])
  })

  it('相鉄線へ追加したカスタム駅を読み込める', () => {
    const state = defaultState()
    state.customStations.push({
      id: 'custom-sotetsu',
      displayName: '追加駅',
      reading: 'ついかえき',
      builtIn: false,
      routeId: 'sotetsu-main',
      insertAfterStationId: 'sotetsu-so02',
    })
    expect(parseBackup(serializeBackup(state)).customStations[0]).toEqual(state.customStations[0])
  })
})
