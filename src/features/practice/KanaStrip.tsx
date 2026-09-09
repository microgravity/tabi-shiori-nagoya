import { useRef, useState, type PointerEvent } from 'react'
import { speechForKana, splitKana } from '../../domain/kana'

interface Props {
  reading: string
  activeIndex?: number
  practicedPositions?: number[]
  freeWrittenPositions?: number[]
  onChoose?: (index: number) => void
  onSpeak: (text: string) => void
}

export function KanaStrip({ reading, activeIndex, practicedPositions = [], freeWrittenPositions = [], onChoose, onSpeak }: Props) {
  const kana = splitKana(reading)
  const [highlighted, setHighlighted] = useState<number | null>(null)
  const activePointer = useRef<number | null>(null)
  const lastSpoken = useRef<number | null>(null)

  const speakIndex = (index: number) => {
    if (lastSpoken.current === index) return
    lastSpoken.current = index
    setHighlighted(index)
    onSpeak(speechForKana(kana[index]))
  }

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    activePointer.current = event.pointerId
    lastSpoken.current = null
    event.currentTarget.setPointerCapture(event.pointerId)
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-kana-index]')
    if (target) speakIndex(Number(target.dataset.kanaIndex))
  }

  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('[data-kana-index]')
    if (target) speakIndex(Number(target.dataset.kanaIndex))
  }

  const pointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return
    activePointer.current = null
    lastSpoken.current = null
    setHighlighted(null)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div
      className="kana-strip"
      aria-label="もじを おして きく。よこに なぞっても きけます"
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerEnd}
      onPointerCancel={pointerEnd}
    >
      {kana.map((character, index) => (
        <button
          key={`${character}-${index}`}
          type="button"
          data-kana-index={index}
          className={`kana-chip ${activeIndex === index ? 'kana-chip--active' : ''} ${highlighted === index ? 'kana-chip--speaking' : ''}`}
          onClick={() => onChoose?.(index)}
          aria-label={`${index + 1}もじめ、${speechForKana(character)}${freeWrittenPositions.includes(index) ? '、おてほんなしで かいた' : practicedPositions.includes(index) ? '、れんしゅうした' : ''}`}
        >
          {character}
          {practicedPositions.includes(index) && <span className={`kana-check ${freeWrittenPositions.includes(index) ? 'kana-check--free-written' : ''}`} aria-hidden="true">{freeWrittenPositions.includes(index) ? '★' : '●'}</span>}
        </button>
      ))}
    </div>
  )
}
