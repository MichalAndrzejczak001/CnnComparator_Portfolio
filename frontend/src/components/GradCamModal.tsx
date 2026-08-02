import { useEffect, useState, type ChangeEvent } from 'react'
import { ApiError, generateGradCam } from '../api/client'
import type { GradCamResponse } from '../types/api'
import { ConfidenceList } from './ConfidenceList'

interface GradCamModalProps {
  experimentId: number
  onClose: () => void
}

export function GradCamModal({ experimentId, onClose }: GradCamModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<GradCamResponse | null>(null)
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

  async function handleGenerate() {
    if (!file) return

    setLoading(true)
    setError(null)

    try {
      const response = await generateGradCam(experimentId, file)
      setResult(response)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Grad-CAM generation failed. Please try again.')
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

        <h2>Grad-CAM</h2>

        <input type="file" accept="image/*" onChange={handleFileChange} />

        {preview && !result && <img src={preview} alt="Selected preview" className="image-preview" />}

        {error && <p className="form-error">{error}</p>}

        <button type="button" className="btn-primary btn-block" onClick={handleGenerate} disabled={!file || loading}>
          {loading ? 'Generating…' : 'Generate Grad-CAM'}
        </button>

        {result && (
          <div className="gradcam-result">
            <img
              src={`data:image/png;base64,${result.gradcam_image}`}
              alt="Grad-CAM overlay"
              className="gradcam-image"
            />
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
