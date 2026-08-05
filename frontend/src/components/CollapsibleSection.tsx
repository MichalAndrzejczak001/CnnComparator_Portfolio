import type { ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  open: boolean
  onToggle: () => void
  className?: string
  children: ReactNode
}

export function CollapsibleSection({ title, open, onToggle, className, children }: CollapsibleSectionProps) {
  return (
    <div className={`experiment-summary-section${className ? ` ${className}` : ''}`}>
      <button type="button" className="section-toggle" onClick={onToggle} aria-expanded={open}>
        <h2>{title}</h2>
        <span className="section-toggle-icon" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  )
}
