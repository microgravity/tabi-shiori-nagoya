import { basicKanaRows, smallKanaRows, voicedKanaRows } from './kanaChart'

describe('ひらがな一覧表', () => {
  it('基本46文字を重複なく五十音表へ置く', () => {
    const kana = basicKanaRows.flat().filter((item): item is string => item !== null)
    expect(kana).toHaveLength(46)
    expect(new Set(kana).size).toBe(46)
  })

  it('濁音・半濁音と小さい文字を別領域にする', () => {
    const basic = new Set(basicKanaRows.flat())
    expect(voicedKanaRows.flat().every((kana) => !basic.has(kana))).toBe(true)
    expect(smallKanaRows.flat().every((kana) => !basic.has(kana))).toBe(true)
    expect(smallKanaRows.flat()).toEqual(expect.arrayContaining(['ゃ', 'ゅ', 'ょ', 'っ']))
  })
})
