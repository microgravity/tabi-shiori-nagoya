import { normalizeReading, speechForKana, splitKana } from './kana'

describe('かなの正規化と位置', () => {
  it('分解された濁点をNFCへ正規化する', () => {
    expect(normalizeReading('か\u3099く')).toBe('がく')
  })

  it('小書き文字と重複文字をそれぞれ一位置として扱う', () => {
    expect(splitKana('きゃ')).toEqual(['き', 'ゃ'])
    expect(splitKana('おおおかやま').filter((kana) => kana === 'お')).toHaveLength(3)
  })

  it('小書き文字には聞き取りやすい案内を返す', () => {
    expect(speechForKana('ょ')).toBe('ちいさい よ')
    expect(speechForKana('ゆ')).toBe('ゆ')
  })

  it('画順データがない可能性のあるひらがなも読みとして保持できる', async () => {
    const { isHiraganaReading } = await import('./kana')
    expect(isHiraganaReading('ゟ')).toBe(true)
  })
})
