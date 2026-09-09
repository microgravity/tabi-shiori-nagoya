import { useRef, type PointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MaterialIcon } from './MaterialIcon'

export function AppHeader({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate()
  const timer = useRef<number | null>(null)

  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  const start = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    stop()
    timer.current = window.setTimeout(() => navigate('/parent'), 1100)
  }

  return (
    <header className={`app-header ${compact ? 'app-header--compact' : ''}`}>
      <Link to="/" className="brand" aria-label="ろせんずへ もどる">
        <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
        <span>じぶんの ろせんず</span>
      </Link>
      {!compact && (
        <button
          type="button"
          className="parent-entry"
          onPointerDown={start}
          onPointerUp={stop}
          onPointerCancel={stop}
          onPointerLeave={stop}
          onClick={(event) => { if (event.detail === 0) navigate('/parent') }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              navigate('/parent')
            }
          }}
          aria-label="おうちのひとの設定。長押ししてください"
        >
          <MaterialIcon name="settings" filled /> おうちのひと
          <small>ながく おす</small>
        </button>
      )}
    </header>
  )
}
