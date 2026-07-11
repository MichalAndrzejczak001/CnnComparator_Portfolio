import { useEffect, useRef, useState, type ChangeEvent } from 'react'

interface AugmentModalProps {
  onClose: () => void
}

const CANVAS_SIZE = 280

export function AugmentModal({ onClose }: AugmentModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const mountedRef = useRef(true)

  const [preview, setPreview] = useState<string | null>(null)
  const [rotation, setRotation] = useState(0)
  const [flip, setFlip] = useState(false)
  const [brightness, setBrightness] = useState(100)
  const [noise, setNoise] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (mountedRef.current) draw()
    }, 50)
    return () => window.clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, rotation, flip, brightness, noise])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setError(null)

    if (!selected) {
      setPreview(null)
      return
    }

    const url = URL.createObjectURL(selected)
    const image = new Image()
    image.onload = () => {
      imageRef.current = image
      if (mountedRef.current) setPreview(url)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      if (mountedRef.current) setError('Could not load the selected image.')
    }
    image.src = url
  }

  function draw() {
    const canvas = canvasRef.current
    const image = imageRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.save()
    ctx.fillStyle = '#0d1627'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (image) {
      ctx.filter = `brightness(${brightness}%)`
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(flip ? -1 : 1, 1)

      const scale = Math.min(canvas.width / image.width, canvas.height / image.height)
      const drawWidth = image.width * scale
      const drawHeight = image.height * scale
      ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
    }

    ctx.restore()

    if (image && noise > 0) {
      applyNoise(ctx, canvas.width, canvas.height, noise)
    }
  }

  function applyNoise(ctx: CanvasRenderingContext2D, width: number, height: number, amount: number) {
    const imageData = ctx.getImageData(0, 0, width, height)
    const { data } = imageData

    for (let i = 0; i < data.length; i += 4) {
      const offset = (Math.random() - 0.5) * amount * 2.55
      data[i] = Math.min(255, Math.max(0, data[i] + offset))
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + offset))
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + offset))
    }

    ctx.putImageData(imageData, 0, 0)
  }

  function handleDownload() {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.toBlob((blob) => {
      if (!blob || !mountedRef.current) return

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'augmented.png'
      link.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>Augment image</h2>

        <input type="file" accept="image/*" onChange={handleFileChange} />

        {error && <p className="form-error">{error}</p>}

        <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="augment-canvas" />

        <label className="form-field">
          <span>Rotation ({rotation}°)</span>
          <input
            type="range"
            min={-45}
            max={45}
            value={rotation}
            onChange={(event) => setRotation(Number(event.target.value))}
          />
        </label>

        <label className="form-field form-field-inline">
          <input type="checkbox" checked={flip} onChange={(event) => setFlip(event.target.checked)} />
          <span>Flip horizontally</span>
        </label>

        <label className="form-field">
          <span>Brightness ({brightness}%)</span>
          <input
            type="range"
            min={50}
            max={150}
            value={brightness}
            onChange={(event) => setBrightness(Number(event.target.value))}
          />
        </label>

        <label className="form-field">
          <span>Noise ({noise}%)</span>
          <input type="range" min={0} max={100} value={noise} onChange={(event) => setNoise(Number(event.target.value))} />
        </label>

        <button type="button" className="btn-primary btn-block" onClick={handleDownload} disabled={!preview}>
          Download result
        </button>
      </div>
    </div>
  )
}
