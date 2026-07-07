interface AccuracyTimePoint {
  label: string
  accuracy: number
  trainingTimeSeconds: number
}

interface AccuracyTimeChartProps {
  points: AccuracyTimePoint[]
  width?: number
  height?: number
}

const PADDING = { top: 16, right: 16, bottom: 32, left: 44 }

export function AccuracyTimeChart({ points, width = 420, height = 260 }: AccuracyTimeChartProps) {
  const innerWidth = width - PADDING.left - PADDING.right
  const innerHeight = height - PADDING.top - PADDING.bottom
  const maxTime = Math.max(1, ...points.map((p) => p.trainingTimeSeconds))

  return (
    <svg width={width} height={height} role="img" aria-label="Accuracy vs training time chart">
      <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + innerHeight} stroke="#666" />
      <line
        x1={PADDING.left}
        y1={PADDING.top + innerHeight}
        x2={PADDING.left + innerWidth}
        y2={PADDING.top + innerHeight}
        stroke="#666"
      />

      <text x={4} y={PADDING.top + 4} fontSize={10} fill="#999">
        100%
      </text>
      <text x={4} y={PADDING.top + innerHeight} fontSize={10} fill="#999">
        0%
      </text>
      <text x={PADDING.left} y={height - 6} fontSize={10} fill="#999">
        0s
      </text>
      <text x={PADDING.left + innerWidth - 24} y={height - 6} fontSize={10} fill="#999">
        {maxTime.toFixed(0)}s
      </text>

      {points.map((point) => {
        const x = PADDING.left + (point.trainingTimeSeconds / maxTime) * innerWidth
        const y = PADDING.top + innerHeight - point.accuracy * innerHeight
        const labelOnLeft = x > PADDING.left + innerWidth * 0.7

        return (
          <g key={point.label}>
            <circle cx={x} cy={y} r={5} fill="#4f8cff" />
            <text
              x={labelOnLeft ? x - 8 : x + 8}
              y={y + 4}
              fontSize={10}
              textAnchor={labelOnLeft ? 'end' : 'start'}
              fill="#ccc"
            >
              {point.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
