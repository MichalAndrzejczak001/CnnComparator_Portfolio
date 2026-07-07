interface RadarSeries {
  label: string
  values: number[]
  color: string
}

interface RadarChartProps {
  axes: string[]
  series: RadarSeries[]
  size?: number
}

export function RadarChart({ axes, series, size = 280 }: RadarChartProps) {
  const center = size / 2
  const radius = size / 2 - 40
  const angleStep = (2 * Math.PI) / Math.max(axes.length, 1)

  const maxByAxis = axes.map((_, axisIndex) => Math.max(1, ...series.map((s) => s.values[axisIndex] ?? 0)))

  const pointFor = (axisIndex: number, value: number, max: number): { x: number; y: number } => {
    const angle = axisIndex * angleStep - Math.PI / 2
    const ratio = max > 0 ? value / max : 0
    return {
      x: center + Math.cos(angle) * radius * ratio,
      y: center + Math.sin(angle) * radius * ratio,
    }
  }

  const polygonPoints = (values: number[]): string =>
    values
      .map((value, axisIndex) => {
        const { x, y } = pointFor(axisIndex, value, maxByAxis[axisIndex])
        return `${x},${y}`
      })
      .join(' ')

  return (
    <svg width={size} height={size} role="img" aria-label="Model comparison radar chart">
      {axes.map((axis, axisIndex) => {
        const angle = axisIndex * angleStep - Math.PI / 2
        const x = center + Math.cos(angle) * radius
        const y = center + Math.sin(angle) * radius
        const labelX = center + Math.cos(angle) * (radius + 16)
        const labelY = center + Math.sin(angle) * (radius + 16)

        return (
          <g key={axis}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="#444" />
            <text x={labelX} y={labelY} fontSize={11} textAnchor="middle" fill="#ccc">
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

      <g transform={`translate(8, ${size - 8 - series.length * 14})`}>
        {series.map((s, index) => (
          <g key={s.label} transform={`translate(0, ${index * 14})`}>
            <rect width={10} height={10} fill={s.color} />
            <text x={14} y={9} fontSize={10} fill="#ccc">
              {s.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}
