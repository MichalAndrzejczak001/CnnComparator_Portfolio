import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

interface ConfusionMatrixProps {
  matrix: number[][]
  labels: string[]
  cellSize?: number
}

interface Cursor {
  row: number
  col: number
}

const LABEL_WIDTH = 64
const MARGIN_TOP = 20
const MARGIN_LEFT = 20
const CELL_GAP = 2
const ZERO_RGB: [number, number, number] = [28, 33, 48]
const MAX_RGB: [number, number, number] = [57, 135, 229]
const INK_PRIMARY = '#f3f4f6'
const INK_SECONDARY = '#9ca3af'
const INK_MUTED = '#6b7280'

function mixColor(t: number): string {
  const r = Math.round(ZERO_RGB[0] + (MAX_RGB[0] - ZERO_RGB[0]) * t)
  const g = Math.round(ZERO_RGB[1] + (MAX_RGB[1] - ZERO_RGB[1]) * t)
  const b = Math.round(ZERO_RGB[2] + (MAX_RGB[2] - ZERO_RGB[2]) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const toLinear = (channel: number) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function textColorFor(t: number): string {
  const cellRgb: [number, number, number] = [
    ZERO_RGB[0] + (MAX_RGB[0] - ZERO_RGB[0]) * t,
    ZERO_RGB[1] + (MAX_RGB[1] - ZERO_RGB[1]) * t,
    ZERO_RGB[2] + (MAX_RGB[2] - ZERO_RGB[2]) * t,
  ]
  const cellLum = relativeLuminance(cellRgb)
  const contrastWithWhite = (1.0 + 0.05) / (cellLum + 0.05)
  const contrastWithInk = (cellLum + 0.05) / (0.0 + 0.05)
  return contrastWithWhite >= contrastWithInk ? INK_PRIMARY : '#0b0b0b'
}

export function ConfusionMatrix({ matrix, labels, cellSize = 32 }: ConfusionMatrixProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [cursor, setCursor] = useState<Cursor | null>(null)

  const maxValue = Math.max(1, ...matrix.flat())
  const gridSize = labels.length * cellSize
  const gridOriginX = MARGIN_LEFT + LABEL_WIDTH
  const gridOriginY = MARGIN_TOP + LABEL_WIDTH
  const width = gridOriginX + gridSize + 8
  const height = gridOriginY + gridSize + 8
  const lastIndex = labels.length - 1

  function cellAt(localX: number, localY: number): Cursor | null {
    const col = Math.floor((localX - gridOriginX) / cellSize)
    const row = Math.floor((localY - gridOriginY) / cellSize)
    if (col < 0 || col > lastIndex || row < 0 || row > lastIndex) {
      return null
    }
    return { row, col }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const bounds = wrapRef.current?.getBoundingClientRect()
    if (!bounds) return
    setCursor(cellAt(event.clientX - bounds.left, event.clientY - bounds.top))
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      setCursor(null)
      return
    }
    const deltas: Record<string, [number, number]> = {
      ArrowRight: [0, 1],
      ArrowLeft: [0, -1],
      ArrowDown: [1, 0],
      ArrowUp: [-1, 0],
    }
    const delta = deltas[event.key]
    if (!delta) return
    event.preventDefault()
    setCursor((prev) => {
      const base = prev ?? { row: 0, col: 0 }
      return {
        row: Math.min(lastIndex, Math.max(0, base.row + delta[0])),
        col: Math.min(lastIndex, Math.max(0, base.col + delta[1])),
      }
    })
  }

  const hoveredValue = cursor ? matrix[cursor.row]?.[cursor.col] ?? 0 : 0
  const rowTotal = cursor ? matrix[cursor.row]?.reduce((sum, value) => sum + value, 0) ?? 0 : 0
  const rowShare = rowTotal > 0 ? (hoveredValue / rowTotal) * 100 : 0

  const tooltipLeft = cursor ? Math.min(Math.max(gridOriginX + cursor.col * cellSize + cellSize / 2, 72), width - 72) : 0
  const tooltipTop = cursor ? Math.max(gridOriginY + cursor.row * cellSize - 8, 8) : 0

  return (
    <div className="chart-block">
      <div className="chart-header">
        <h3 className="chart-title">Confusion matrix</h3>
        <div className="matrix-scale" aria-hidden="true">
          <span className="matrix-scale-label">0</span>
          <span
            className="matrix-scale-gradient"
            style={{ background: `linear-gradient(90deg, ${mixColor(0)}, ${mixColor(1)})` }}
          />
          <span className="matrix-scale-label">{maxValue}</span>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="chart-svg-wrap"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setCursor(null)}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="group"
        aria-label={`Confusion matrix for ${labels.length} classes: rows are the actual class, columns are the predicted class. Use arrow keys to inspect cells.`}
      >
        <svg width={width} height={height}>
          <text
            x={gridOriginX + gridSize / 2}
            y={MARGIN_TOP - 6}
            fontSize={11}
            fill={INK_SECONDARY}
            textAnchor="middle"
          >
            Predicted class
          </text>
          <text
            x={12}
            y={gridOriginY + gridSize / 2}
            fontSize={11}
            fill={INK_SECONDARY}
            textAnchor="middle"
            transform={`rotate(-90, 12, ${gridOriginY + gridSize / 2})`}
          >
            Actual class
          </text>

          {labels.map((label, col) => (
            <text
              key={`col-${label}`}
              x={gridOriginX + col * cellSize + cellSize / 2}
              y={gridOriginY - 6}
              fontSize={10}
              textAnchor="middle"
              fill={cursor?.col === col ? INK_PRIMARY : INK_MUTED}
              fontWeight={cursor?.col === col ? 700 : 400}
            >
              {label}
            </text>
          ))}

          {labels.map((rowLabel, row) => (
            <text
              key={`row-${rowLabel}`}
              x={gridOriginX - 6}
              y={gridOriginY + row * cellSize + cellSize / 2 + 4}
              fontSize={10}
              textAnchor="end"
              fill={cursor?.row === row ? INK_PRIMARY : INK_MUTED}
              fontWeight={cursor?.row === row ? 700 : 400}
            >
              {rowLabel}
            </text>
          ))}

          {labels.map((_, row) =>
            matrix[row]?.map((value, col) => {
              const t = value / maxValue
              const isHovered = cursor?.row === row && cursor?.col === col
              const isDiagonal = row === col
              return (
                <g key={`cell-${row}-${col}`}>
                  <rect
                    x={gridOriginX + col * cellSize + CELL_GAP / 2}
                    y={gridOriginY + row * cellSize + CELL_GAP / 2}
                    width={cellSize - CELL_GAP}
                    height={cellSize - CELL_GAP}
                    rx={3}
                    fill={mixColor(t)}
                  />
                  {isHovered && (
                    <rect
                      x={gridOriginX + col * cellSize + CELL_GAP / 2}
                      y={gridOriginY + row * cellSize + CELL_GAP / 2}
                      width={cellSize - CELL_GAP}
                      height={cellSize - CELL_GAP}
                      rx={3}
                      fill="none"
                      stroke={INK_PRIMARY}
                      strokeWidth={2}
                    />
                  )}
                  <text
                    x={gridOriginX + col * cellSize + cellSize / 2}
                    y={gridOriginY + row * cellSize + cellSize / 2 + 4}
                    fontSize={11}
                    textAnchor="middle"
                    fill={textColorFor(t)}
                    fontWeight={isDiagonal ? 700 : 400}
                  >
                    {value}
                  </text>
                </g>
              )
            }),
          )}
        </svg>

        {cursor && (
          <div className="chart-tooltip chart-tooltip-floating" style={{ left: tooltipLeft, top: tooltipTop }}>
            <div className="chart-tooltip-header">
              Actual: {labels[cursor.row]} &rarr; Predicted: {labels[cursor.col]}
            </div>
            <div className="chart-tooltip-row">
              <span>Count</span>
              <strong>{hoveredValue}</strong>
            </div>
            <div className="chart-tooltip-row">
              <span>Share of actual class</span>
              <strong>{rowShare.toFixed(1)}%</strong>
            </div>
            <div className="matrix-tooltip-note">
              {cursor.row === cursor.col ? 'Correct prediction' : `Misclassified as "${labels[cursor.col]}"`}
            </div>
          </div>
        )}
      </div>

      <table className="sr-only">
        <caption>Confusion matrix: rows are the actual class, columns are the predicted class</caption>
        <thead>
          <tr>
            <th scope="col">Actual \ Predicted</th>
            {labels.map((label) => (
              <th key={`head-${label}`} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((rowLabel, row) => (
            <tr key={`row-${rowLabel}`}>
              <th scope="row">{rowLabel}</th>
              {matrix[row]?.map((value, col) => (
                <td key={`cell-${row}-${col}`}>{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
