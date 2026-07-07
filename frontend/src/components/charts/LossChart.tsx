interface LossChartProps {
  trainLoss: number[]
  testLoss: number[]
  width?: number
  height?: number
}

const PADDING = { top: 16, right: 16, bottom: 28, left: 40 }

export function LossChart({ trainLoss, testLoss, width = 420, height = 240 }: LossChartProps) {
  const innerWidth = width - PADDING.left - PADDING.right
  const innerHeight = height - PADDING.top - PADDING.bottom

  const allValues = [...trainLoss, ...testLoss]
  const maxLoss = allValues.length > 0 ? Math.max(...allValues) : 1
  const minLoss = allValues.length > 0 ? Math.min(...allValues) : 0
  const range = maxLoss - minLoss || 1
  const epochCount = Math.max(trainLoss.length, testLoss.length, 1)

  const toPoints = (series: number[]): string =>
    series
      .map((value, index) => {
        const x = PADDING.left + (index / Math.max(epochCount - 1, 1)) * innerWidth
        const y = PADDING.top + innerHeight - ((value - minLoss) / range) * innerHeight
        return `${x},${y}`
      })
      .join(' ')

  return (
    <svg width={width} height={height} role="img" aria-label="Loss per epoch chart">
      <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={PADDING.top + innerHeight} stroke="#666" />
      <line
        x1={PADDING.left}
        y1={PADDING.top + innerHeight}
        x2={PADDING.left + innerWidth}
        y2={PADDING.top + innerHeight}
        stroke="#666"
      />

      <text x={4} y={PADDING.top + 4} fontSize={10} fill="#999">
        {maxLoss.toFixed(2)}
      </text>
      <text x={4} y={PADDING.top + innerHeight} fontSize={10} fill="#999">
        {minLoss.toFixed(2)}
      </text>

      <polyline points={toPoints(trainLoss)} fill="none" stroke="#4f8cff" strokeWidth={2} />
      <polyline points={toPoints(testLoss)} fill="none" stroke="#ff6b6b" strokeWidth={2} />

      <g transform={`translate(${PADDING.left}, ${height - 8})`}>
        <rect width={10} height={10} fill="#4f8cff" />
        <text x={14} y={9} fontSize={10} fill="#ccc">
          train
        </text>
        <rect x={60} width={10} height={10} fill="#ff6b6b" />
        <text x={74} y={9} fontSize={10} fill="#ccc">
          test
        </text>
      </g>
    </svg>
  )
}
