import { useState } from 'react'
import type { SampleGradCam } from '../types/api'

interface SamplePredictionsGalleryProps {
  samples: SampleGradCam[]
}

type Filter = 'all' | 'correct' | 'misclassified'

function isCorrect(sample: SampleGradCam): boolean {
  return sample.true_label === sample.predicted_label
}

export function SamplePredictionsGallery({ samples }: SamplePredictionsGalleryProps) {
  const [filter, setFilter] = useState<Filter>('all')
  const [zoomed, setZoomed] = useState<SampleGradCam | null>(null)

  const correctCount = samples.filter(isCorrect).length
  const misclassifiedCount = samples.length - correctCount

  const visible = samples.filter((sample) => {
    if (filter === 'correct') return isCorrect(sample)
    if (filter === 'misclassified') return !isCorrect(sample)
    return true
  })

  return (
    <>
      <div className="gallery-toolbar">
        <span className="gallery-summary">
          {correctCount} of {samples.length} classes correctly classified
        </span>
        <div className="gallery-filter">
          <button
            type="button"
            className={`btn-toggle${filter === 'all' ? ' active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({samples.length})
          </button>
          <button
            type="button"
            className={`btn-toggle${filter === 'correct' ? ' active' : ''}`}
            onClick={() => setFilter('correct')}
          >
            Correct ({correctCount})
          </button>
          <button
            type="button"
            className={`btn-toggle${filter === 'misclassified' ? ' active' : ''}`}
            onClick={() => setFilter('misclassified')}
            disabled={misclassifiedCount === 0}
          >
            Misclassified ({misclassifiedCount})
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="gallery-empty">No samples match this filter.</p>
      ) : (
        <div className="gradcam-gallery-grid">
          {visible.map((sample) => {
            const correct = isCorrect(sample)
            return (
              <button
                type="button"
                className={`card gradcam-gallery-item${correct ? ' gradcam-gallery-item-correct' : ' gradcam-gallery-item-wrong'}`}
                key={sample.true_label}
                onClick={() => setZoomed(sample)}
              >
                <span className={`gallery-badge${correct ? ' gallery-badge-correct' : ' gallery-badge-wrong'}`}>
                  {correct ? '✓ Correct' : '✕ Misclassified'}
                </span>
                <img src={`data:image/png;base64,${sample.gradcam_image}`} alt={`Grad-CAM sample: ${sample.true_label}`} />
                <p>
                  True: <strong>{sample.true_label}</strong>
                  {!correct && (
                    <>
                      {' '}
                      · Predicted: <strong>{sample.predicted_label}</strong>
                    </>
                  )}
                </p>
                <div className="gallery-confidence">
                  <div className="confidence-bar">
                    <div className="confidence-bar-fill" style={{ width: `${sample.confidence * 100}%` }} />
                  </div>
                  <span>{(sample.confidence * 100).toFixed(1)}%</span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {zoomed && (
        <div className="modal-backdrop" onClick={() => setZoomed(null)}>
          <div className="modal gallery-lightbox" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setZoomed(null)} aria-label="Close">
              ×
            </button>
            <img
              src={`data:image/png;base64,${zoomed.gradcam_image}`}
              alt={`Grad-CAM sample: ${zoomed.true_label}`}
              className="gallery-lightbox-image"
            />
            <p>
              True: <strong>{zoomed.true_label}</strong> · Predicted: <strong>{zoomed.predicted_label}</strong>
            </p>
            <div className="gallery-confidence">
              <div className="confidence-bar">
                <div className="confidence-bar-fill" style={{ width: `${zoomed.confidence * 100}%` }} />
              </div>
              <span>{(zoomed.confidence * 100).toFixed(1)}% confidence</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
