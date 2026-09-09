import { builtInStations } from '../stations'
import { splitKana } from '../../domain/kana'
import { hasGlyph } from '.'

describe('組み込み駅の画順データ', () => {
  it('未収録文字を意図したフォント見本だけに限定する', () => {
    const missing = [...new Set(builtInStations.flatMap((station) => splitKana(station.reading)).filter((kana) => !hasGlyph(kana)))]
    expect(missing.sort()).toEqual(['っ', 'ー'].sort())
  })

  it('濁音と小書き文字のデータがある', () => {
    expect(hasGlyph('が')).toBe(true)
    expect(hasGlyph('ょ')).toBe(true)
    expect(hasGlyph('ぱ')).toBe(true)
  })
})
