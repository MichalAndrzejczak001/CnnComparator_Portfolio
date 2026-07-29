import type { ClassConfidence } from '../types/api'

interface ConfidenceListProps {
  confidences: ClassConfidence[]
  predictedLabel?: string
}

export function ConfidenceList({ confidences, predictedLabel }: ConfidenceListProps) {
  const sorted = [...confidences].sort((a, b) => b.confidence - a.confidence)

  return (
    <ul className="confidence-list">
      {sorted.map((confidence) => {
        const isPredicted = confidence.label === predictedLabel

        return (
          <li key={confidence.label} className={`confidence-row${isPredicted ? ' confidence-row-predicted' : ''}`}>
            <span className="confidence-label">{confidence.label}</span>
            <div className="confidence-bar">
              <div className="confidence-bar-fill" style={{ width: `${(confidence.confidence * 100).toFixed(1)}%` }} />
            </div>
            <span className="confidence-value">{(confidence.confidence * 100).toFixed(1)}%</span>
          </li>
        )
      })}
    </ul>
  )
}
