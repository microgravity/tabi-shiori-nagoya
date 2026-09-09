import type { Point } from './input'
import { evaluateFreeWriting, evaluateTrace, freeWritingFeedback, traceAdvisory, traceFeedback, type TraceGuideStroke } from './traceEvaluation'

const line = (from: Point, to: Point, steps = 12): Point[] => Array.from({ length: steps }, (_, index) => ({
  x: from.x + ((to.x - from.x) * index) / (steps - 1),
  y: from.y + ((to.y - from.y) * index) / (steps - 1),
}))

const guide: TraceGuideStroke[] = [
  { segments: [line({ x: 100, y: 120 }, { x: 420, y: 120 })] },
  { segments: [line({ x: 260, y: 180 }, { x: 260, y: 500 })] },
]

describe('なぞり補助判定', () => {
  it('少しずれた正しいなぞりを成功にする', () => {
    const input = [
      line({ x: 112, y: 132 }, { x: 410, y: 129 }),
      line({ x: 271, y: 192 }, { x: 266, y: 488 }),
    ]
    expect(evaluateTrace(input, guide).passed).toBe(true)
  })

  it('ふつうでは開始位置が途中でも形が重なれば許容する', () => {
    const input = [line({ x: 240, y: 120 }, { x: 420, y: 120 }), line({ x: 260, y: 180 }, { x: 260, y: 500 })]
    const result = evaluateTrace(input, guide, 'standard')
    expect(result.passed).toBe(true)
    expect(result.issues).toContain('start-position')
    expect(evaluateTrace(input, guide, 'careful').passed).toBe(false)
  })

  it('ふつうでは逆向きを許容し、分かりやすい助言を返す', () => {
    const input = [line({ x: 420, y: 120 }, { x: 100, y: 120 }), line({ x: 260, y: 500 }, { x: 260, y: 180 })]
    const result = evaluateTrace(input, guide, 'standard')
    expect(result.passed).toBe(true)
    expect(result.issues).toContain('stroke-order')
    expect(traceAdvisory(result)).toContain('だいじょうぶ')
  })

  it('ふつうでは画順違いを許容する', () => {
    const input = [line({ x: 260, y: 180 }, { x: 260, y: 500 }), line({ x: 100, y: 120 }, { x: 420, y: 120 })]
    expect(evaluateTrace(input, guide, 'standard').passed).toBe(true)
    expect(evaluateTrace(input, guide, 'careful').passed).toBe(false)
  })

  it('3段階で線のずれに対する許容範囲を変える', () => {
    const input = [line({ x: 100, y: 222 }, { x: 420, y: 222 }), line({ x: 362, y: 180 }, { x: 362, y: 500 })]
    expect(evaluateTrace(input, guide, 'gentle').passed).toBe(true)
    expect(evaluateTrace(input, guide, 'standard').passed).toBe(false)
    expect(evaluateTrace(input, guide, 'careful').passed).toBe(false)
  })

  it('お手本から大きく外れた線を成功にしない', () => {
    const input = [line({ x: 100, y: 360 }, { x: 420, y: 360 }), line({ x: 500, y: 180 }, { x: 500, y: 500 })]
    const result = evaluateTrace(input, guide, 'gentle')
    expect(result.passed).toBe(false)
    expect(traceFeedback(result)).toContain('せんから はなれている')
  })

  it('短すぎる線を成功にしない', () => {
    const input = [line({ x: 100, y: 120 }, { x: 112, y: 120 }, 3)]
    expect(evaluateTrace(input, guide).passed).toBe(false)
  })
})

describe('お手本なしの字形判定', () => {
  it('位置と大きさが違っても同じ字形なら成功にする', () => {
    const input = [
      line({ x: 205, y: 330 }, { x: 45, y: 330 }),
      line({ x: 125, y: 520 }, { x: 125, y: 360 }),
    ]
    expect(evaluateFreeWriting(input, guide).passed).toBe(true)
  })

  it('書く場所と縦横の比率が大きく違っても字形が同じなら成功にする', () => {
    const input = [
      line({ x: 540, y: 470 }, { x: 60, y: 470 }),
      line({ x: 300, y: 490 }, { x: 300, y: 570 }),
    ]
    expect(evaluateFreeWriting(input, guide).passed).toBe(true)
  })

  it('書き順と向きは判定に使わない', () => {
    const input = [
      line({ x: 125, y: 360 }, { x: 125, y: 520 }),
      line({ x: 205, y: 330 }, { x: 45, y: 330 }),
    ]
    expect(evaluateFreeWriting(input, guide).passed).toBe(true)
  })

  it('字形が大きく違う線は上位クリアにしない', () => {
    const input = [
      line({ x: 50, y: 320 }, { x: 210, y: 520 }),
      line({ x: 210, y: 320 }, { x: 50, y: 520 }),
    ]
    const result = evaluateFreeWriting(input, guide)
    expect(result.passed).toBe(false)
    expect(freeWritingFeedback(result)).toContain('かたち')
  })

  it('短すぎる線は上位クリアにしない', () => {
    const result = evaluateFreeWriting([line({ x: 10, y: 10 }, { x: 30, y: 10 }, 3)], guide)
    expect(result.passed).toBe(false)
    expect(result.issues).toContain('too-short')
  })

  it('長くても一本線だけなら複数部分のお手本をクリアにしない', () => {
    const result = evaluateFreeWriting([line({ x: 40, y: 300 }, { x: 560, y: 300 })], guide)
    expect(result.passed).toBe(false)
  })
})
