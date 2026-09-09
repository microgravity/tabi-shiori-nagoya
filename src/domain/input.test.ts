import { hasMeaningfulInk, pointInViewBox } from './input'

describe('筆記入力', () => {
  it('表示座標を論理座標へ変換する', () => {
    expect(pointInViewBox(150, 100, { left: 50, top: 50, width: 200, height: 100 })).toEqual({ x: 300, y: 300 })
  })

  it('白紙や点だけを筆記済みにしない', () => {
    expect(hasMeaningfulInk([])).toBe(false)
    expect(hasMeaningfulInk([[{ x: 10, y: 10 }]])).toBe(false)
    expect(hasMeaningfulInk([[{ x: 10, y: 10 }, { x: 30, y: 10 }]])).toBe(true)
  })
})
