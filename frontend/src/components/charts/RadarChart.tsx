import { useState } from 'react'

interface RadarSeries {
  label: string
  values: number[]
  displayValues?: string[]
  color: string
}

interface RadarChartProps {
  axes: string[]
  series: RadarSeries[]
  size?: number
  title?: string
}

interface HoverTarget {
  seriesIndex: number
  axisIndex: number
}

// Extra horizontal room so axis labels near the left/right edges (e.g. "Training speed")
// have space to render fully instead of being clipped by the SVG viewport.
const LABEL_PADDING_X = 44

export function RadarChart({ axes, series, size = 280, title = 'Model comparison' }: RadarChartProps) {
  const [hover, setHover] = useState<HoverTarget | null>(null)

  const svgWidth = size + LABEL_PADDING_X * 2
  const centerX = size / 2 + LABEL_PADDING_X
  const centerY = size / 2
  const radius = size / 2 - 44
  const angleStep = (2 * Math.PI) / Math.max(axes.length, 1)

  const maxByAxis = axes.map((_, axisIndex) => Math.max(1, ...series.map((s) => s.values[axisIndex] ?? 0)))

  const pointFor = (axisIndex: number, value: number, max: number): { x: number; y: number } => {
    const angle = axisIndex * angleStep - Math.PI / 2
    const ratio = max > 0 ? value / max : 0
    return {
      x: centerX + Math.cos(angle) * radius * ratio,
      y: centerY + Math.sin(angle) * radius * ratio,
    }
  }

  const labelAnchorFor = (angle: number): 'start' | 'middle' | 'end' => {
    const cos = Math.cos(angle)
    if (cos > 0.3) return 'start'
    if (cos < -0.3) return 'end'
    return 'middle'
  }

  const polygonPoints = (values: number[]): string =>
    values
      .map((value, axisIndex) => {
        const { x, y } = pointFor(axisIndex, value, maxByAxis[axisIndex])
        return `${x},${y}`
      })
      .join(' ')

  const hoveredSeries = hover ? series[hover.seriesIndex] : null
  const hoveredPoint =
    hover && hoveredSeries
      ? pointFor(hover.axisIndex, hoveredSeries.values[hover.axisIndex] ?? 0, maxByAxis[hover.axisIndex])
      : null
  const hoveredValue =
    hover && hoveredSeries
      ? (hoveredSeries.displayValues?.[hover.axisIndex] ?? hoveredSeries.values[hover.axisIndex]?.toFixed(2) ?? '—')
      : null

  const tooltipLeft = hoveredPoint ? Math.min(Math.max(hoveredPoint.x, 64), svgWidth - 64) : 0
  const tooltipTop = hoveredPoint ? Math.max(hoveredPoint.y - 10, 8) : 0

  return (
    <div className="chart-block">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        <ul className="chart-legend">
          {series.map((s) => (
            <li key={s.label} className="chart-legend-item">
              <span className="chart-legend-swatch" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      </div>

      <div className="chart-svg-wrap">
        <svg
          width={svgWidth}
          height={size}
          role="img"
          aria-label={`${title} radar chart. Hover a point to see its value.`}
        >
          {axes.map((axis, axisIndex) => {
            const angle = axisIndex * angleStep - Math.PI / 2
            const x = centerX + Math.cos(angle) * radius
            const y = centerY + Math.sin(angle) * radius
            const labelX = centerX + Math.cos(angle) * (radius + 18)
            const labelY = centerY + Math.sin(angle) * (radius + 18)

            return (
              <g key={axis}>
                <line x1={centerX} y1={centerY} x2={x} y2={y} stroke="#444" />
                <text x={labelX} y={labelY} fontSize={11} textAnchor={labelAnchorFor(angle)} fill="#ccc">
                  {axis}
                </text>
              </g>
            )
          })}

          {series.map((s) => (
            <polygon
              key={s.label}
              points={polygonPoints(s.values)}
              fill={s.color}
              fillOpacity={0.25}
              stroke={s.color}
              strokeWidth={2}
            />
          ))}

          {series.map((s, seriesIndex) =>
            axes.map((_, axisIndex) => {
              const value = s.values[axisIndex] ?? 0
              const { x, y } = pointFor(axisIndex, value, maxByAxis[axisIndex])
              const isHovered = hover?.seriesIndex === seriesIndex && hover?.axisIndex === axisIndex

              return (
                <circle
                  key={`${s.label}-${axisIndex}`}
                  cx={x}
                  cy={y}
                  r={isHovered ? 5 : 3}
                  fill={s.color}
                  stroke={isHovered ? '#fff' : 'none'}
                  strokeWidth={isHovered ? 1.5 : 0}
                  style={{ cursor: 'pointer' }}
                  onPointerEnter={() => setHover({ seriesIndex, axisIndex })}
                  onPointerLeave={() => setHover(null)}
                />
              )
            }),
          )}
        </svg>

        {hover && hoveredSeries && (
          <div className="chart-tooltip chart-tooltip-floating" style={{ left: tooltipLeft, top: tooltipTop }}>
            <div className="chart-tooltip-header">{hoveredSeries.label}</div>
            <div className="chart-tooltip-row">
              <span className="chart-legend-swatch" style={{ background: hoveredSeries.color }} />
              <span>{axes[hover.axisIndex]}</span>
              <strong>{hoveredValue}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
