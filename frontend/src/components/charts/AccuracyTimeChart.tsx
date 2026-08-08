import { useRef, useState, type PointerEvent } from 'react'

interface AccuracyTimePoint {
  label: string
  color: string
  accuracy: number
  trainingTimeSeconds: number
}

interface AccuracyTimeChartProps {
  points: AccuracyTimePoint[]
  width?: number
  height?: number
}

const PADDING = { top: 14, right: 16, bottom: 32, left: 44 }
const SURFACE = '#171a23'
const GRIDLINE = '#2a2e3a'
const AXIS = '#3a3f4e'
const INK_MUTED = '#6b7280'
const HOVER_RADIUS_SQ = 400 // 20px hit radius around a point

export function AccuracyTimeChart({ points, width = 420, height = 260 }: AccuracyTimeChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const innerWidth = width - PADDING.left - PADDING.right
  const innerHeight = height - PADDING.top - PADDING.bottom
  const maxTime = Math.max(1, ...points.map((p) => p.trainingTimeSeconds))

  const xForPoint = (p: AccuracyTimePoint): number => PADDING.left + (p.trainingTimeSeconds / maxTime) * innerWidth
  const yForPoint = (p: AccuracyTimePoint): number => PADDING.top + innerHeight - p.accuracy * innerHeight

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = wrapRef.current?.getBoundingClientRect()
    if (!bounds) return
    const localX = event.clientX - bounds.left
    const localY = event.clientY - bounds.top

    let closestIndex: number | null = null
    let closestDist = Infinity
    points.forEach((point, index) => {
      const dx = xForPoint(point) - localX
      const dy = yForPoint(point) - localY
      const dist = dx * dx + dy * dy
      if (dist < closestDist) {
        closestDist = dist
        closestIndex = index
      }
    })
    setHoverIndex(closestDist <= HOVER_RADIUS_SQ ? closestIndex : null)
  }

  const hoveredPoint = hoverIndex !== null ? points[hoverIndex] : null
  const tooltipLeft = hoveredPoint ? Math.min(Math.max(xForPoint(hoveredPoint), 64), width - 64) : 0
  const tooltipTop = hoveredPoint ? Math.max(yForPoint(hoveredPoint) - 10, 8) : 0

  return (
    <div className="chart-block">
      <div className="chart-header">
        <h3 className="chart-title">Accuracy vs. training time</h3>
        <ul className="chart-legend">
          {points.map((point) => (
            <li key={point.label} className="chart-legend-item">
              <span className="chart-legend-swatch" style={{ background: point.color }} />
              {point.label}
            </li>
          ))}
        </ul>
      </div>

      <div
        ref={wrapRef}
        className="chart-svg-wrap"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        <svg width={width} height={height} role="img" aria-label="Accuracy versus training time across models. Hover a point to see its values.">
          {[0, 0.5, 1].map((ratio) => (
            <line
              key={`grid-${ratio}`}
              x1={PADDING.left}
              y1={PADDING.top + innerHeight - ratio * innerHeight}
              x2={PADDING.left + innerWidth}
              y2={PADDING.top + innerHeight - ratio * innerHeight}
              stroke={GRIDLINE}
              strokeWidth={1}
            />
          ))}

          <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + innerHeight} stroke={AXIS} />
          <line
            x1={PADDING.left}
            y1={PADDING.top + innerHeight}
            x2={PADDING.left + innerWidth}
            y2={PADDING.top + innerHeight}
            stroke={AXIS}
          />

          {[0, 0.5, 1].map((ratio) => (
            <text
              key={`ytick-${ratio}`}
              x={PADDING.left - 8}
              y={PADDING.top + innerHeight - ratio * innerHeight + 3}
              fontSize={10}
              fill={INK_MUTED}
              textAnchor="end"
            >
              {Math.round(ratio * 100)}%
            </text>
          ))}

          <text x={PADDING.left} y={height - 4} fontSize={10} fill={INK_MUTED}>
            0s
          </text>
          <text x={PADDING.left + innerWidth} y={height - 4} fontSize={10} fill={INK_MUTED} textAnchor="end">
            {maxTime.toFixed(0)}s
          </text>

          {points.map((point, index) => {
            const isHovered = hoverIndex === index
            return (
              <circle
                key={point.label}
                cx={xForPoint(point)}
                cy={yForPoint(point)}
                r={isHovered ? 6 : 5}
                fill={point.color}
                stroke={isHovered ? '#fff' : SURFACE}
                strokeWidth={isHovered ? 2 : 1.5}
              />
            )
          })}
        </svg>

        {hoveredPoint && (
          <div className="chart-tooltip chart-tooltip-floating" style={{ left: tooltipLeft, top: tooltipTop }}>
            <div className="chart-tooltip-header">{hoveredPoint.label}</div>
            <div className="chart-tooltip-row">
              <span>Accuracy</span>
              <strong>{(hoveredPoint.accuracy * 100).toFixed(2)}%</strong>
            </div>
            <div className="chart-tooltip-row">
              <span>Training time</span>
              <strong>{hoveredPoint.trainingTimeSeconds.toFixed(1)}s</strong>
            </div>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Accuracy versus training time per model</caption>
        <thead>
          <tr>
            <th scope="col">Model</th>
            <th scope="col">Accuracy</th>
            <th scope="col">Training time</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{(point.accuracy * 100).toFixed(2)}%</td>
              <td>{point.trainingTimeSeconds.toFixed(1)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
