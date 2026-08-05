interface MostConfusedPairsProps {
  matrix: number[][]
  labels: string[]
  limit?: number
}

export interface ConfusedPair {
  actual: string
  predicted: string
  count: number
  shareOfActual: number
}

export function computeConfusedPairs(matrix: number[][], labels: string[]): ConfusedPair[] {
  const pairs: ConfusedPair[] = []

  for (let row = 0; row < labels.length; row++) {
    const rowTotal = matrix[row]?.reduce((sum, value) => sum + value, 0) ?? 0

    for (let col = 0; col < labels.length; col++) {
      if (row === col) continue

      const count = matrix[row]?.[col] ?? 0
      if (count > 0) {
        pairs.push({
          actual: labels[row],
          predicted: labels[col],
          count,
          shareOfActual: rowTotal > 0 ? count / rowTotal : 0,
        })
      }
    }
  }

  return pairs.sort((a, b) => b.count - a.count)
}

export function MostConfusedPairs({ matrix, labels, limit = 5 }: MostConfusedPairsProps) {
  const pairs = computeConfusedPairs(matrix, labels).slice(0, limit)

  if (pairs.length === 0) {
    return <p className="text-muted">No misclassifications — every prediction matched the actual class.</p>
  }

  return (
    <ul className="confused-pairs-list">
      {pairs.map((pair, index) => (
        <li key={`${pair.actual}-${pair.predicted}`} className="confused-pairs-item">
          <span className="confused-pairs-rank">#{index + 1}</span>
          <span className="confused-pairs-labels">
            <strong>{pair.actual}</strong> mistaken for <strong>{pair.predicted}</strong>
          </span>
          <span className="confused-pairs-count">{pair.count}&times;</span>
          <span className="confused-pairs-share">
            ({(pair.shareOfActual * 100).toFixed(1)}% of actual {pair.actual})
          </span>
        </li>
      ))}
    </ul>
  )
}
