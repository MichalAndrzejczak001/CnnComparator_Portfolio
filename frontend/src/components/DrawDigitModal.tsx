import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ApiError, predict } from '../api/client'
import type { PredictResponse } from '../types/api'
import { ConfidenceList } from './ConfidenceList'

interface DrawDigitModalProps {
  experimentId: number
  onClose: () => void
}

const CANVAS_SIZE = 280
const STROKE_WIDTH = 22

export function DrawDigitModal({ experimentId, onClose }: DrawDigitModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  const [hasDrawing, setHasDrawing] = useState(false)
  const [result, setResult] = useState<PredictResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    clearCanvas()
  }, [])

  function clearCanvas() {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = STROKE_WIDTH
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    setHasDrawing(false)
    setResult(null)
    setError(null)
  }

  function getPoint(event: ReactPointerEvent<HTMLCanvasElement>): { x: number; y: number } | null {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    isDrawingRef.current = true
    lastPointRef.current = getPoint(event)
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return

    const ctx = canvasRef.current?.getContext('2d')
    const point = getPoint(event)
    if (!ctx || !point || !lastPointRef.current) return

    ctx.beginPath()
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()

    lastPointRef.current = point
    setHasDrawing(true)
  }

  function handlePointerUp() {
    isDrawingRef.current = false
    lastPointRef.current = null
  }

  async function handleClassify() {
    const canvas = canvasRef.current
    if (!canvas) return

    setLoading(true)
    setError(null)

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setLoading(false)
        setError('Could not read the drawing.')
        return
      }

      try {
        const file = new File([blob], 'digit.png', { type: 'image/png' })
        const response = await predict(experimentId, file)
        setResult(response)
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : 'Classification failed. Please try again.')
      } finally {
        setLoading(false)
      }
    }, 'image/png')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>Draw a digit</h2>

        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="draw-canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={clearCanvas}>
            Clear
          </button>
          <button
            type="button"
            className="btn-primary btn-block"
            onClick={handleClassify}
            disabled={!hasDrawing || loading}
          >
            {loading ? 'Classifying…' : 'Classify'}
          </button>
        </div>

        {result && (
          <div className="predict-result">
            <p className="predict-label">
              Predicted: <strong>{result.predicted_class}</strong>
            </p>
            <ConfidenceList confidences={result.confidences} />
          </div>
        )}
      </div>
    </div>
  )
}
