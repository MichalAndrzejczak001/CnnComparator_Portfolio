import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { CalibrationBin } from '../../types/api'

interface CalibrationChartProps {
  bins: CalibrationBin[]
  width?: number
  height?: number
}

const PADDING = { top: 14, right: 16, bottom: 44, left: 46 }
const ACCURACY_COLOR = '#3987e5'
const PERFECT_COLOR = '#f2c14e'
const EMPTY_COLOR = '#2a2e3a'
const GRIDLINE = '#2a2e3a'
const AXIS = '#3a3f4e'
const INK_PRIMARY = '#f3f4f6'
const INK_MUTED = '#6b7280'
const INK_SECONDARY = '#9ca3af'

function formatPercentTick(value: number): string {
  return `${Math.round(value * 100)}%`
}

// Expected Calibration Error: the count-weighted average gap between a bin's accuracy and
// its average predicted confidence — a single number summarizing how well "confidence" tracks
// actual correctness across the whole reliability diagram. Lower is better; 0 is perfect.
export function computeECE(bins: CalibrationBin[]): number | null {
  const totalCount = bins.reduce((sum, bin) => sum + bin.count, 0)
  if (totalCount === 0) return null

  const weightedError = bins.reduce((sum, bin) => {
    if (bin.count === 0 || bin.accuracy === null || bin.avg_confidence === null) return sum
    return sum + (bin.count / totalCount) * Math.abs(bin.accuracy - bin.avg_confidence)
  }, 0)

  return weightedError
}

export function CalibrationChart({ bins, width = 480, height = 280 }: CalibrationChartProps) {
  const ece = computeECE(bins)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const innerWidth = width - PADDING.left - PADDING.right
  const innerHeight = height - PADDING.top - PADDING.bottom
  const barGap = 4
  const slotWidth = innerWidth / bins.length
  const barWidth = Math.max(0, slotWidth - barGap)

  const xForIndex = (index: number): number => PADDING.left + index * slotWidth
  const yForValue = (value: number): number => PADDING.top + innerHeight - value * innerHeight

  const lastIndex = bins.length - 1
  const activeIndex = hoverIndex !== null ? Math.min(Math.max(hoverIndex, 0), lastIndex) : null
  const activeBin = activeIndex !== null ? bins[activeIndex] : null

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = wrapRef.current?.getBoundingClientRect()
    if (!bounds) return
    const localX = event.clientX - bounds.left
    const index = Math.floor((localX - PADDING.left) / slotWidth)
    setHoverIndex(Math.max(0, Math.min(lastIndex, index)))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setHoverIndex((prev) => Math.min(lastIndex, (prev ?? -1) + 1))
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setHoverIndex((prev) => Math.max(0, (prev ?? 1) - 1))
    } else if (event.key === 'Escape') {
      setHoverIndex(null)
    }
  }

  const tooltipX = activeIndex !== null ? xForIndex(activeIndex) + slotWidth / 2 : 0
  const tooltipLeft = Math.min(Math.max(tooltipX, 64), width - 64)

  return (
    <div className="chart-block">
      <div className="chart-header">
        <h3 className="chart-title">
          Calibration curve
          {ece !== null && <span className="chart-title-stat">ECE {(ece * 100).toFixed(1)}%</span>}
        </h3>
        <ul className="chart-legend">
          <li className="chart-legend-item">
            <span className="chart-legend-swatch" style={{ background: ACCURACY_COLOR }} />
            Accuracy
          </li>
          <li className="chart-legend-item">
            <span className="chart-legend-swatch chart-legend-swatch-dashed" style={{ borderColor: PERFECT_COLOR }} />
            Perfect calibration
          </li>
        </ul>
      </div>

      <div
        ref={wrapRef}
        className="chart-svg-wrap"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIndex(null)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="group"
        aria-label={`Calibration curve: model accuracy versus predicted confidence across ${bins.length} confidence bins. Use arrow keys to inspect bins.`}
      >
        <svg width={width} height={height}>
          {[0, 0.5, 1].map((value) => (
            <line
              key={`grid-${value}`}
              x1={PADDING.left}
              y1={yForValue(value)}
              x2={PADDING.left + innerWidth}
              y2={yForValue(value)}
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

          {[0, 0.5, 1].map((value) => (
            <text
              key={`ytick-${value}`}
              x={PADDING.left - 8}
              y={yForValue(value) + 3}
              fontSize={10}
              fill={INK_MUTED}
              textAnchor="end"
            >
              {formatPercentTick(value)}
            </text>
          ))}

          <text
            x={12}
            y={PADDING.top + innerHeight / 2}
            fontSize={11}
            fill={INK_SECONDARY}
            textAnchor="middle"
            transform={`rotate(-90, 12, ${PADDING.top + innerHeight / 2})`}
          >
            Accuracy
          </text>

          <text
            x={PADDING.left + innerWidth / 2}
            y={PADDING.top + innerHeight + 32}
            fontSize={11}
            fill={INK_SECONDARY}
            textAnchor="middle"
          >
            Confidence
          </text>

          {/* perfect-calibration reference diagonal (accuracy == confidence) */}
          <line
            x1={PADDING.left}
            y1={PADDING.top + innerHeight}
            x2={PADDING.left + innerWidth}
            y2={PADDING.top}
            stroke={PERFECT_COLOR}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.7}
          />

          {bins.map((bin, index) => {
            const hasData = bin.count > 0 && bin.accuracy !== null
            const barHeight = hasData ? Math.max(1, innerHeight * (bin.accuracy as number)) : 1
            const x = xForIndex(index) + barGap / 2
            const y = PADDING.top + innerHeight - barHeight
            const isHovered = activeIndex === index

            return (
              <rect
                key={`bin-${index}`}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2}
                fill={hasData ? ACCURACY_COLOR : EMPTY_COLOR}
                opacity={hasData ? (isHovered ? 1 : 0.85) : 0.4}
                stroke={isHovered ? INK_PRIMARY : 'none'}
                strokeWidth={isHovered ? 1.5 : 0}
              />
            )
          })}
        </svg>

        {activeBin && (
          <div className="chart-tooltip" style={{ left: tooltipLeft }}>
            <div className="chart-tooltip-header">
              {formatPercentTick(activeBin.bin_min)}&ndash;{formatPercentTick(activeBin.bin_max)} confidence
            </div>
            {activeBin.count > 0 && activeBin.accuracy !== null && activeBin.avg_confidence !== null ? (
              <>
                <div className="chart-tooltip-row">
                  <span>Accuracy</span>
                  <strong>{formatPercentTick(activeBin.accuracy)}</strong>
                </div>
                <div className="chart-tooltip-row">
                  <span>Avg. confidence</span>
                  <strong>{formatPercentTick(activeBin.avg_confidence)}</strong>
                </div>
                <div className="chart-tooltip-row">
                  <span>Samples</span>
                  <strong>{activeBin.count}</strong>
                </div>
              </>
            ) : (
              <div className="chart-tooltip-row">
                <span>No predictions in this range</span>
              </div>
            )}
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Calibration curve: accuracy versus confidence per bin</caption>
        <thead>
          <tr>
            <th scope="col">Confidence range</th>
            <th scope="col">Accuracy</th>
            <th scope="col">Avg. confidence</th>
            <th scope="col">Samples</th>
          </tr>
        </thead>
        <tbody>
          {bins.map((bin, index) => (
            <tr key={`row-${index}`}>
              <th scope="row">
                {formatPercentTick(bin.bin_min)}&ndash;{formatPercentTick(bin.bin_max)}
              </th>
              <td>{bin.accuracy !== null ? formatPercentTick(bin.accuracy) : '—'}</td>
              <td>{bin.avg_confidence !== null ? formatPercentTick(bin.avg_confidence) : '—'}</td>
              <td>{bin.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
