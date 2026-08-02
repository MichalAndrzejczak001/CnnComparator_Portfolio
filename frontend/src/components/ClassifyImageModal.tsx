import { useEffect, useState, type ChangeEvent } from 'react'
import { ApiError, predict } from '../api/client'
import type { PredictResponse } from '../types/api'
import { ConfidenceList } from './ConfidenceList'

interface ClassifyImageModalProps {
  experimentId: number
  onClose: () => void
}

export function ClassifyImageModal({ experimentId, onClose }: ClassifyImageModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<PredictResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setResult(null)
    setError(null)
    setFile(selected)
    setPreview(selected ? URL.createObjectURL(selected) : null)
  }

  async function handleClassify() {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const response = await predict(experimentId, file)
      setResult(response)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Classification failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>Classify image</h2>

        <input type="file" accept="image/*" onChange={handleFileChange} />

        {preview && <img src={preview} alt="Selected preview" className="image-preview" />}

        {error && <p className="form-error">{error}</p>}

        <button type="button" className="btn-primary btn-block" onClick={handleClassify} disabled={!file || loading}>
          {loading ? 'Classifying…' : 'Classify'}
        </button>

        {result && (
          <div className="predict-result">
            <div className="predict-hero">
              <span className="predict-hero-eyebrow">Predicted class</span>
              <div className="predict-hero-main">
                <strong className="predict-hero-value">{result.predicted_class}</strong>
                <span className="predict-hero-confidence">
                  {(
                    (result.confidences.find((c) => c.label === result.predicted_class)?.confidence ?? 0) * 100
                  ).toFixed(1)}
                  % confidence
                </span>
              </div>
            </div>
            <p className="predict-breakdown-label">Confidence by class</p>
            <ConfidenceList confidences={result.confidences} predictedLabel={result.predicted_class} />
          </div>
        )}
      </div>
    </div>
  )
}
