import { useLayoutEffect, useRef } from 'react'
import { getGlyphSvg } from '../../data/kana'

export function GlyphGuide({ kana, animate, replayKey }: { kana: string; animate: boolean; replayKey: number }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const svg = getGlyphSvg(kana)

  useLayoutEffect(() => {
    const root = rootRef.current
    const element = root?.querySelector('svg')
    if (!element) return
    element.querySelector('.stroke-markers')?.remove()
    element.classList.add('glyph-svg')
    element.setAttribute('aria-label', `${kana}の おてほん`)
    const strokeGroup = element.querySelector('[data-strokesvg="strokes"]')
    if (!strokeGroup) return
    const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    markerGroup.setAttribute('class', 'stroke-markers')
    Array.from(strokeGroup.children).forEach((stroke, index) => {
      const path = stroke.tagName.toLowerCase() === 'path' ? stroke as SVGPathElement : stroke.querySelector('path')
      if (!path || typeof path.getPointAtLength !== 'function') return
      const point = path.getPointAtLength(0)
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
      circle.setAttribute('cx', String(point.x))
      circle.setAttribute('cy', String(point.y))
      circle.setAttribute('r', '25')
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('x', String(point.x))
      label.setAttribute('y', String(point.y + 11))
      label.textContent = String(index + 1)
      markerGroup.append(circle, label)
    })
    element.append(markerGroup)
  })

  if (!svg) return <div className="font-guide" aria-label={`${kana}の フォントおてほん`}>{kana}</div>

  return (
    <div
      key={`${kana}-${replayKey}`}
      ref={rootRef}
      className={`glyph-guide ${animate ? 'glyph-guide--animate' : ''}`}
      // SVGは同梱した、出典とライセンスを確認済みの固定データだけを表示する。
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
