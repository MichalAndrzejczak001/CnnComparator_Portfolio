interface ConfusionMatrixProps {
  matrix: number[][]
  labels: string[]
  cellSize?: number
}

const LABEL_WIDTH = 60

export function ConfusionMatrix({ matrix, labels, cellSize = 32 }: ConfusionMatrixProps) {
  const maxValue = Math.max(1, ...matrix.flat())
  const gridSize = labels.length * cellSize

  return (
    <svg
      width={LABEL_WIDTH + gridSize}
      height={LABEL_WIDTH + gridSize}
      role="img"
      aria-label="Confusion matrix"
    >
      {labels.map((label, col) => (
        <text
          key={`col-${label}`}
          x={LABEL_WIDTH + col * cellSize + cellSize / 2}
          y={LABEL_WIDTH - 6}
          fontSize={10}
          textAnchor="middle"
          fill="#ccc"
        >
          {label}
        </text>
      ))}

      {labels.map((rowLabel, row) => (
        <g key={`row-${rowLabel}`}>
          <text
            x={LABEL_WIDTH - 6}
            y={LABEL_WIDTH + row * cellSize + cellSize / 2 + 4}
            fontSize={10}
            textAnchor="end"
            fill="#ccc"
          >
            {rowLabel}
          </text>

          {matrix[row]?.map((value, col) => {
            const intensity = value / maxValue
            return (
              <g key={`cell-${row}-${col}`}>
                <rect
                  x={LABEL_WIDTH + col * cellSize}
                  y={LABEL_WIDTH + row * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={`rgba(79, 140, 255, ${intensity})`}
                  stroke="#333"
                />
                <text
                  x={LABEL_WIDTH + col * cellSize + cellSize / 2}
                  y={LABEL_WIDTH + row * cellSize + cellSize / 2 + 4}
                  fontSize={10}
                  textAnchor="middle"
                  fill={intensity > 0.5 ? '#fff' : '#ccc'}
                >
                  {value}
                </text>
              </g>
            )
          })}
        </g>
      ))}
    </svg>
  )
}
