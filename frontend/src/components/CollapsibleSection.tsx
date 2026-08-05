import { useState, type ReactNode } from 'react'

interface CollapsibleSectionProps {
  title: string
  defaultOpen?: boolean
  className?: string
  children: ReactNode
}

export function CollapsibleSection({ title, defaultOpen = true, className, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`experiment-summary-section${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className="section-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <h2>{title}</h2>
        <span className="section-toggle-icon" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  )
}
