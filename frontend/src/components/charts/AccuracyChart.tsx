import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

interface AccuracyChartProps {
  trainAccuracy: number[]
  valAccuracy: number[]
  width?: number
  height?: number
}

const PADDING = { top: 14, right: 54, bottom: 44, left: 46 }
const MAX_X_TICKS = 8
const TRAIN_COLOR = '#3987e5'
const VAL_COLOR = '#e66767'
const SURFACE = '#171a23'
const GRIDLINE = '#2a2e3a'
const AXIS = '#3a3f4e'
const INK_MUTED = '#6b7280'
const INK_SECONDARY = '#9ca3af'

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function AccuracyChart({ trainAccuracy, valAccuracy, width = 480, height = 280 }: AccuracyChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const innerWidth = width - PADDING.left - PADDING.right
  const innerHeight = height - PADDING.top - PADDING.bottom

  const allValues = [...trainAccuracy, ...valAccuracy]
  const maxAcc = allValues.length > 0 ? Math.max(...allValues) : 1
  const minAcc = allValues.length > 0 ? Math.min(...allValues) : 0
  const midAcc = (maxAcc + minAcc) / 2
  const range = maxAcc - minAcc || 1
  const epochCount = Math.max(trainAccuracy.length, valAccuracy.length, 1)
  const lastIndex = epochCount - 1

  const xForIndex = (index: number): number =>
    PADDING.left + (index / Math.max(lastIndex, 1)) * innerWidth

  const yForValue = (value: number): number =>
    PADDING.top + innerHeight - ((value - minAcc) / range) * innerHeight

  const toPoints = (series: number[]): string =>
    series.map((value, index) => `${xForIndex(index)},${yForValue(value)}`).join(' ')

  const xTickStep = Math.max(1, Math.ceil(epochCount / MAX_X_TICKS))
  const xTicks = Array.from({ length: epochCount }, (_, index) => index).filter(
    (index) => index % xTickStep === 0 || index === lastIndex,
  )

  const activeIndex = hoverIndex !== null ? Math.min(hoverIndex, lastIndex) : null
  const tooltip =
    activeIndex === null
      ? null
      : {
          epoch: activeIndex + 1,
          train: trainAccuracy[activeIndex],
          val: valAccuracy[activeIndex],
          x: xForIndex(activeIndex),
        }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = wrapRef.current?.getBoundingClientRect()
    if (!bounds) return
    const localX = event.clientX - bounds.left
    const ratio = (localX - PADDING.left) / innerWidth
    const index = Math.round(ratio * lastIndex)
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

  const tooltipLeft = tooltip ? Math.min(Math.max(tooltip.x, 64), width - 64) : 0

  return (
    <div className="chart-block">
      <div className="chart-header">
        <h3 className="chart-title">Accuracy per epoch</h3>
        <ul className="chart-legend">
          <li className="chart-legend-item">
            <span className="chart-legend-swatch" style={{ background: TRAIN_COLOR }} />
            Train
          </li>
          <li className="chart-legend-item">
            <span className="chart-legend-swatch" style={{ background: VAL_COLOR }} />
            Validation
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
        aria-label={`Accuracy per epoch: training and validation accuracy across ${epochCount} epoch${epochCount === 1 ? '' : 's'}. Use arrow keys to inspect values.`}
      >
        <svg width={width} height={height}>
          {/* gridlines */}
          {[maxAcc, midAcc, minAcc].map((value) => (
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

          {/* Y axis value ticks */}
          {[maxAcc, midAcc, minAcc].map((value) => (
            <text
              key={`ytick-${value}`}
              x={PADDING.left - 8}
              y={yForValue(value) + 3}
              fontSize={10}
              fill={INK_MUTED}
              textAnchor="end"
            >
              {formatPercent(value)}
            </text>
          ))}

          {/* Y axis title */}
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

          {/* X axis epoch ticks */}
          {xTicks.map((index) => (
            <text
              key={`xtick-${index}`}
              x={xForIndex(index)}
              y={PADDING.top + innerHeight + 16}
              fontSize={9}
              fill={INK_MUTED}
              textAnchor="middle"
            >
              {index + 1}
            </text>
          ))}

          {/* X axis title */}
          <text
            x={PADDING.left + innerWidth / 2}
            y={PADDING.top + innerHeight + 32}
            fontSize={11}
            fill={INK_SECONDARY}
            textAnchor="middle"
          >
            Epoch
          </text>

          <polyline
            points={toPoints(trainAccuracy)}
            fill="none"
            stroke={TRAIN_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <polyline
            points={toPoints(valAccuracy)}
            fill="none"
            stroke={VAL_COLOR}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* end markers + direct end labels */}
          {trainAccuracy.length > 0 && (
            <>
              <circle cx={xForIndex(trainAccuracy.length - 1)} cy={yForValue(trainAccuracy[trainAccuracy.length - 1])} r={4} fill={TRAIN_COLOR} stroke={SURFACE} strokeWidth={2} />
              <text
                x={xForIndex(trainAccuracy.length - 1) + 8}
                y={yForValue(trainAccuracy[trainAccuracy.length - 1]) + 3}
                fontSize={10}
                fill={INK_SECONDARY}
              >
                {formatPercent(trainAccuracy[trainAccuracy.length - 1])}
              </text>
            </>
          )}
          {valAccuracy.length > 0 && (
            <>
              <circle cx={xForIndex(valAccuracy.length - 1)} cy={yForValue(valAccuracy[valAccuracy.length - 1])} r={4} fill={VAL_COLOR} stroke={SURFACE} strokeWidth={2} />
              <text
                x={xForIndex(valAccuracy.length - 1) + 8}
                y={yForValue(valAccuracy[valAccuracy.length - 1]) + 3}
                fontSize={10}
                fill={INK_SECONDARY}
              >
                {formatPercent(valAccuracy[valAccuracy.length - 1])}
              </text>
            </>
          )}

          {/* hover crosshair */}
          {tooltip && (
            <g>
              <line
                x1={tooltip.x}
                y1={PADDING.top}
                x2={tooltip.x}
                y2={PADDING.top + innerHeight}
                stroke={AXIS}
                strokeWidth={1}
              />
              <circle cx={tooltip.x} cy={yForValue(tooltip.train)} r={4} fill={TRAIN_COLOR} stroke={SURFACE} strokeWidth={2} />
              <circle cx={tooltip.x} cy={yForValue(tooltip.val)} r={4} fill={VAL_COLOR} stroke={SURFACE} strokeWidth={2} />
            </g>
          )}
        </svg>

        {tooltip && (
          <div className="chart-tooltip" style={{ left: tooltipLeft }}>
            <div className="chart-tooltip-header">Epoch {tooltip.epoch}</div>
            <div className="chart-tooltip-row">
              <span className="chart-legend-swatch" style={{ background: TRAIN_COLOR }} />
              <span>Train</span>
              <strong>{formatPercent(tooltip.train)}</strong>
            </div>
            <div className="chart-tooltip-row">
              <span className="chart-legend-swatch" style={{ background: VAL_COLOR }} />
              <span>Validation</span>
              <strong>{formatPercent(tooltip.val)}</strong>
            </div>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Accuracy per epoch (training and validation)</caption>
        <thead>
          <tr>
            <th scope="col">Epoch</th>
            <th scope="col">Train accuracy</th>
            <th scope="col">Validation accuracy</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: epochCount }, (_, index) => (
            <tr key={`row-${index}`}>
              <th scope="row">{index + 1}</th>
              <td>{trainAccuracy[index] !== undefined ? formatPercent(trainAccuracy[index]) : '—'}</td>
              <td>{valAccuracy[index] !== undefined ? formatPercent(valAccuracy[index]) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
