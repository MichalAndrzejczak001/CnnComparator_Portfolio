import type { ClassConfidence } from '../types/api'

interface ConfidenceListProps {
  confidences: ClassConfidence[]
}

export function ConfidenceList({ confidences }: ConfidenceListProps) {
  return (
    <ul className="confidence-list">
      {confidences.map((confidence) => (
        <li key={confidence.label} className="confidence-row">
          <span className="confidence-label">{confidence.label}</span>
          <div className="confidence-bar">
            <div className="confidence-bar-fill" style={{ width: `${(confidence.confidence * 100).toFixed(1)}%` }} />
          </div>
          <span className="confidence-value">{(confidence.confidence * 100).toFixed(1)}%</span>
        </li>
      ))}
    </ul>
  )
}
