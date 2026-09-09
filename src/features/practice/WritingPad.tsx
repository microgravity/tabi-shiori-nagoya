import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { hasMeaningfulInk, pointDistance, pointInViewBox, type Point } from '../../domain/input'
import { GlyphGuide } from './GlyphGuide'
import { MaterialIcon } from '../../components/MaterialIcon'

interface Props {
  kana: string
  showGuide: boolean
  animateGuide: boolean
  replayKey: number
  onInkChange: (hasInk: boolean) => void
  onStrokesChange: (strokes: Point[][]) => void
  resetKey: number
}

export function WritingPad({ kana, showGuide, animateGuide, replayKey, onInkChange, onStrokesChange, resetKey }: Props) {
  const [strokes, setStrokes] = useState<Point[][]>([])
  const [seenResetKey, setSeenResetKey] = useState(resetKey)
  const activePointer = useRef<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const strokesRef = useRef<Point[][]>([])

  const clearWritingLock = () => {
    document.documentElement.classList.remove('is-writing')
    document.body.classList.remove('is-writing')
  }

  const releasePointer = (pointerId?: number) => {
    if (pointerId !== undefined && activePointer.current !== pointerId) return
    const capturedPointer = activePointer.current
    activePointer.current = null
    clearWritingLock()
    if (capturedPointer !== null && svgRef.current?.hasPointerCapture(capturedPointer)) {
      svgRef.current.releasePointerCapture(capturedPointer)
    }
  }

  if (seenResetKey !== resetKey) {
    setSeenResetKey(resetKey)
    setStrokes([])
    strokesRef.current = []
  }

  useEffect(() => {
    const pad = svgRef.current
    if (!pad) return

    const stopTouchScroll = (event: TouchEvent) => {
      if (activePointer.current !== null) event.preventDefault()
    }
    const finishOutsidePad = (event: globalThis.PointerEvent) => releasePointer(event.pointerId)
    const finishInterruptedGesture = () => releasePointer()

    pad.addEventListener('touchmove', stopTouchScroll, { passive: false })
    window.addEventListener('pointerup', finishOutsidePad)
    window.addEventListener('pointercancel', finishOutsidePad)
    window.addEventListener('blur', finishInterruptedGesture)
    return () => {
      pad.removeEventListener('touchmove', stopTouchScroll)
      window.removeEventListener('pointerup', finishOutsidePad)
      window.removeEventListener('pointercancel', finishOutsidePad)
      window.removeEventListener('blur', finishInterruptedGesture)
      releasePointer()
    }
  }, [])

  const update = (next: Point[][]) => {
    strokesRef.current = next
    setStrokes(next)
    onInkChange(hasMeaningfulInk(next))
    onStrokesChange(next)
  }

  const pointFor = (event: ReactPointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    return rect ? pointInViewBox(event.clientX, event.clientY, rect) : { x: 0, y: 0 }
  }

  const pointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!event.isPrimary || activePointer.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    activePointer.current = event.pointerId
    document.documentElement.classList.add('is-writing')
    document.body.classList.add('is-writing')
    event.currentTarget.setPointerCapture(event.pointerId)
    update([...strokesRef.current, [pointFor(event)]])
  }

  const pointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== event.pointerId) return
    event.preventDefault()
    const point = pointFor(event)
    const currentStrokes = strokesRef.current
    const currentStroke = currentStrokes.at(-1)
    const last = currentStroke?.at(-1)
    if (!last || pointDistance(last, point) < 2.5) return
    const next = currentStrokes.map((stroke, index) => index === currentStrokes.length - 1 ? [...stroke, point] : stroke)
    update(next)
  }

  const pointerEnd = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== event.pointerId) return
    event.preventDefault()
    releasePointer(event.pointerId)
  }

  const lostPointerCapture = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (activePointer.current !== event.pointerId) return
    releasePointer(event.pointerId)
  }

  return (
    <div className="writing-pad-wrap">
      <div className="writing-pad" data-kana={kana}>
        <span className="grid-line grid-line--horizontal" />
        <span className="grid-line grid-line--vertical" />
        {showGuide && <GlyphGuide key={`${kana}-${replayKey}`} kana={kana} animate={animateGuide} replayKey={replayKey} />}
        <svg
          ref={svgRef}
          className="ink-layer"
          viewBox="0 0 600 600"
          aria-label={`${kana}を かくところ`}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerEnd}
          onPointerCancel={pointerEnd}
          onLostPointerCapture={lostPointerCapture}
          onContextMenu={(event) => event.preventDefault()}
        >
          {strokes.map((stroke, index) => (
            <polyline
              key={index}
              points={stroke.map((point) => `${point.x},${point.y}`).join(' ')}
              className="ink-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="pad-tools" aria-label="かいたせんの そうさ">
        <button type="button" className="soft-button icon-button" onClick={() => update(strokesRef.current.slice(0, -1))} disabled={strokes.length === 0}>
          <MaterialIcon name="undo" />ひとつ もどす
        </button>
        <button type="button" className="soft-button icon-button" onClick={() => update([])} disabled={strokes.length === 0}>
          <MaterialIcon name="backspace" />けす
        </button>
      </div>
    </div>
  )
}
