import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

interface LineSeries {
  label: string
  color: string
  values: number[]
  // Rendered as a dashed line and left out of the legend (its solid counterpart, same
  // color, represents the pair there) — used for overlaying a train curve on a validation one.
  dashed?: boolean
}

interface MultiLineChartProps {
  title: string
  yLabel: string
  series: LineSeries[]
  width?: number
  height?: number
  formatValue?: (value: number) => string
}

const PADDING = { top: 14, right: 16, bottom: 44, left: 50 }
const MAX_X_TICKS = 8
const SURFACE = '#171a23'
const GRIDLINE = '#2a2e3a'
const AXIS = '#3a3f4e'
const INK_MUTED = '#6b7280'
const INK_SECONDARY = '#9ca3af'

function defaultFormatValue(value: number): string {
  return value.toFixed(3)
}

export function MultiLineChart({
  title,
  yLabel,
  series,
  width = 480,
  height = 280,
  formatValue = defaultFormatValue,
}: MultiLineChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const innerWidth = width - PADDING.left - PADDING.right
  const innerHeight = height - PADDING.top - PADDING.bottom

  const allValues = series.flatMap((s) => s.values)
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1
  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0
  const midValue = (maxValue + minValue) / 2
  const range = maxValue - minValue || 1
  const epochCount = Math.max(1, ...series.map((s) => s.values.length))
  const lastIndex = epochCount - 1

  const xForIndex = (index: number): number =>
    PADDING.left + (index / Math.max(lastIndex, 1)) * innerWidth

  const yForValue = (value: number): number =>
    PADDING.top + innerHeight - ((value - minValue) / range) * innerHeight

  const toPoints = (values: number[]): string =>
    values.map((value, index) => `${xForIndex(index)},${yForValue(value)}`).join(' ')

  const xTickStep = Math.max(1, Math.ceil(epochCount / MAX_X_TICKS))
  const xTicks = Array.from({ length: epochCount }, (_, index) => index).filter(
    (index) => index % xTickStep === 0 || index === lastIndex,
  )

  const activeIndex = hoverIndex !== null ? Math.min(hoverIndex, lastIndex) : null

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

  const tooltipX = activeIndex !== null ? xForIndex(activeIndex) : 0
  const tooltipLeft = Math.min(Math.max(tooltipX, 80), width - 80)
  const hasDashedSeries = series.some((s) => s.dashed)

  return (
    <div className="chart-block">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        <ul className="chart-legend">
          {series
            .filter((s) => !s.dashed)
            .map((s) => (
              <li key={s.label} className="chart-legend-item">
                <span className="chart-legend-swatch" style={{ background: s.color }} />
                {s.label}
              </li>
            ))}
          {hasDashedSeries && (
            <li className="chart-legend-item chart-legend-hint">(solid = validation, dashed = train)</li>
          )}
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
        aria-label={`${title}: comparing ${series.length} experiments across up to ${epochCount} epochs. Use arrow keys to inspect values.`}
      >
        <svg width={width} height={height}>
          {[maxValue, midValue, minValue].map((value) => (
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

          {[maxValue, midValue, minValue].map((value) => (
            <text
              key={`ytick-${value}`}
              x={PADDING.left - 8}
              y={yForValue(value) + 3}
              fontSize={10}
              fill={INK_MUTED}
              textAnchor="end"
            >
              {formatValue(value)}
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
            {yLabel}
          </text>

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

          <text
            x={PADDING.left + innerWidth / 2}
            y={PADDING.top + innerHeight + 32}
            fontSize={11}
            fill={INK_SECONDARY}
            textAnchor="middle"
          >
            Epoch
          </text>

          {series.map((s) => (
            <polyline
              key={s.label}
              points={toPoints(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? '5 4' : undefined}
              opacity={s.dashed ? 0.6 : 1}
            />
          ))}

          {activeIndex !== null && (
            <g>
              <line
                x1={tooltipX}
                y1={PADDING.top}
                x2={tooltipX}
                y2={PADDING.top + innerHeight}
                stroke={AXIS}
                strokeWidth={1}
              />
              {series.map((s) => {
                const value = s.values[activeIndex]
                if (value === undefined) return null
                return (
                  <circle
                    key={s.label}
                    cx={tooltipX}
                    cy={yForValue(value)}
                    r={4}
                    fill={s.color}
                    stroke={SURFACE}
                    strokeWidth={2}
                  />
                )
              })}
            </g>
          )}
        </svg>

        {activeIndex !== null && (
          <div className="chart-tooltip" style={{ left: tooltipLeft }}>
            <div className="chart-tooltip-header">Epoch {activeIndex + 1}</div>
            {series.map((s) => {
              const value = s.values[activeIndex]
              return (
                <div key={s.label} className="chart-tooltip-row">
                  <span className="chart-legend-swatch" style={{ background: s.color }} />
                  <span>{s.label}</span>
                  <strong>{value !== undefined ? formatValue(value) : '—'}</strong>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Epoch</th>
            {series.map((s) => (
              <th key={s.label} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: epochCount }, (_, index) => (
            <tr key={`row-${index}`}>
              <th scope="row">{index + 1}</th>
              {series.map((s) => (
                <td key={s.label}>{s.values[index] !== undefined ? formatValue(s.values[index]) : '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
