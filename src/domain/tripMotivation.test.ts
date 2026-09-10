import { crossedPracticeCheckpoint, dayPracticeSummary, stopPracticeSummary, tripPracticeSummary } from './tripMotivation'

describe('trip motivation progress', () => {
  it('counts only unique valid completed character positions', () => {
    expect(stopPracticeSummary('なごや', [0, 0, 2, 9])).toEqual({
      completedCharacters: 2,
      totalCharacters: 3,
      complete: false,
    })
  })

  it('counts completed stops separately from completed characters', () => {
    const stops = [{ kana: 'なごや' }, { kana: 'ぎふ' }]
    expect(dayPracticeSummary(0, stops, { '0:0': [0, 1, 2], '0:1': [0] })).toEqual({
      completedCharacters: 4,
      totalCharacters: 5,
      completedStops: 1,
      totalStops: 2,
    })
  })

  it('aggregates the whole trip without treating unfinished stops as complete', () => {
    const days = [{ stops: [{ kana: 'なごや' }] }, { stops: [{ kana: 'ぎふ' }] }]
    expect(tripPracticeSummary(days, { '0:0': [0, 1, 2], '1:0': [0] }).completedStops).toBe(1)
  })

  it('reports the highest newly crossed checkpoint', () => {
    expect(crossedPracticeCheckpoint(2, 6, 8)).toBe(0.75)
    expect(crossedPracticeCheckpoint(6, 6, 8)).toBeNull()
  })
})
