import { getGlyphSvg } from '../../data/kana'
import type { Point } from '../../domain/input'
import type { TraceGuideStroke } from '../../domain/traceEvaluation'

const PAD_SIZE = 600
const GUIDE_INSET = 30
const TARGET_SAMPLE_SPACING = 9
const cache = new Map<string, TraceGuideStroke[] | null>()

export function sampleGlyphGuide(kana: string): TraceGuideStroke[] | null {
  const normalized = kana.normalize('NFC')
  if (cache.has(normalized)) return cache.get(normalized) ?? null
  const source = getGlyphSvg(normalized)
  if (!source || typeof document === 'undefined') return null

  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-10000px;top:-10000px;width:1px;height:1px;overflow:hidden;visibility:hidden'
  host.innerHTML = source
  document.body.append(host)

  try {
    const svg = host.querySelector('svg')
    const strokeRoot = svg?.querySelector('[data-strokesvg="strokes"]')
    const viewBox = svg?.viewBox.baseVal
    if (!svg || !strokeRoot || !viewBox || viewBox.width <= 0 || viewBox.height <= 0) return null
    const scale = Math.min((PAD_SIZE - GUIDE_INSET * 2) / viewBox.width, (PAD_SIZE - GUIDE_INSET * 2) / viewBox.height)
    const offsetX = (PAD_SIZE - viewBox.width * scale) / 2 - viewBox.x * scale
    const offsetY = (PAD_SIZE - viewBox.height * scale) / 2 - viewBox.y * scale
    const convert = (point: DOMPoint): Point => ({ x: offsetX + point.x * scale, y: offsetY + point.y * scale })

    const strokes = Array.from(strokeRoot.children).map((stroke): TraceGuideStroke | null => {
      const paths = stroke.tagName.toLowerCase() === 'path'
        ? [stroke as SVGPathElement]
        : Array.from(stroke.querySelectorAll('path'))
      const segments = paths.map((path) => {
        if (typeof path.getTotalLength !== 'function' || typeof path.getPointAtLength !== 'function') return []
        const length = path.getTotalLength()
        const samples = Math.max(2, Math.ceil((length * scale) / TARGET_SAMPLE_SPACING) + 1)
        return Array.from({ length: samples }, (_, index) => convert(path.getPointAtLength((length * index) / (samples - 1))))
      }).filter((segment) => segment.length >= 2)
      return segments.length > 0 ? { segments } : null
    }).filter((stroke): stroke is TraceGuideStroke => Boolean(stroke))

    const result = strokes.length > 0 ? strokes : null
    cache.set(normalized, result)
    return result
  } finally {
    host.remove()
  }
}
