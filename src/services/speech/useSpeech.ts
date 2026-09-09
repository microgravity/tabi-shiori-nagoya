import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppState } from '../../app/AppState'

export function useSpeech() {
  const { state } = useAppState()
  const [available, setAvailable] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setAvailable(false)
      return
    }
    const update = () => { voicesRef.current = window.speechSynthesis.getVoices() }
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', update)
      window.speechSynthesis.cancel()
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!available || state.settings.muted) return false
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'ja-JP'
    utterance.rate = state.settings.speechRate
    utterance.volume = state.settings.volume
    utterance.voice = voicesRef.current.find((voice) => voice.lang.toLowerCase().startsWith('ja')) ?? null
    window.speechSynthesis.speak(utterance)
    return true
  }, [available, state.settings.muted, state.settings.speechRate, state.settings.volume])

  return { speak, available }
}
