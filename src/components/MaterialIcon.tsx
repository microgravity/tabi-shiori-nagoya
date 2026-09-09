interface MaterialIconProps {
  name: string
  className?: string
  filled?: boolean
}

export function MaterialIcon({ name, className = '', filled = false }: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-rounded material-icon ${filled ? 'material-icon--filled' : ''} ${className}`.trim()}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
