import { useMemo, useState } from 'react'

interface PerClassMetricsTableProps {
  matrix: number[][]
  labels: string[]
}

export interface ClassMetric {
  label: string
  support: number
  precision: number | null
  recall: number | null
  f1: number | null
}

type SortKey = 'label' | 'precision' | 'recall' | 'f1' | 'support'
type SortDir = 'asc' | 'desc'

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  label: 'asc',
  precision: 'desc',
  recall: 'desc',
  f1: 'desc',
  support: 'desc',
}

export function computeMetrics(matrix: number[][], labels: string[]): ClassMetric[] {
  return labels.map((label, cls) => {
    const support = matrix[cls]?.reduce((sum, value) => sum + value, 0) ?? 0
    const truePositive = matrix[cls]?.[cls] ?? 0
    const predictedPositive = matrix.reduce((sum, row) => sum + (row[cls] ?? 0), 0)

    const precision = predictedPositive > 0 ? truePositive / predictedPositive : null
    const recall = support > 0 ? truePositive / support : null
    const f1 =
      precision !== null && recall !== null && precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : null

    return { label, support, precision, recall, f1 }
  })
}

export function macroAverage(metrics: ClassMetric[], key: 'precision' | 'recall' | 'f1'): number | null {
  const values = metrics.map((metric) => metric[key]).filter((value): value is number => value !== null)
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null
}

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toFixed(1)}%`
}

function compareNullable(a: number | null, b: number | null, dir: SortDir): number {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1
  return dir === 'asc' ? a - b : b - a
}

export function PerClassMetricsTable({ matrix, labels }: PerClassMetricsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('f1')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const metrics = useMemo(() => computeMetrics(matrix, labels), [matrix, labels])
  const maxSupport = Math.max(1, ...metrics.map((metric) => metric.support))
  const totalSupport = metrics.reduce((sum, metric) => sum + metric.support, 0)

  const sortedMetrics = useMemo(() => {
    const copy = [...metrics]
    copy.sort((a, b) => {
      if (sortKey === 'label') {
        return sortDir === 'asc' ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label)
      }
      if (sortKey === 'support') {
        return sortDir === 'asc' ? a.support - b.support : b.support - a.support
      }
      return compareNullable(a[sortKey], b[sortKey], sortDir)
    })
    return copy
  }, [metrics, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(DEFAULT_DIR[key])
    }
  }

  function ariaSort(key: SortKey): 'ascending' | 'descending' | undefined {
    if (key !== sortKey) return undefined
    return sortDir === 'asc' ? 'ascending' : 'descending'
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return null
    return <span className="metrics-sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  function headerButton(key: SortKey, label: string) {
    return (
      <button type="button" className="metrics-sort-button" onClick={() => handleSort(key)}>
        {label}
        {sortIndicator(key)}
      </button>
    )
  }

  function metricCell(value: number | null) {
    return (
      <td>
        <div className="metric-cell">
          <div className="metric-bar">
            <div className="metric-bar-fill" style={{ width: `${value === null ? 0 : value * 100}%` }} />
          </div>
          <span className="metric-value">{formatPercent(value)}</span>
        </div>
      </td>
    )
  }

  return (
    <div className="metrics-table-wrap">
      <table className="metrics-table">
        <thead>
          <tr>
            <th scope="col" aria-sort={ariaSort('label')}>
              {headerButton('label', 'Class')}
            </th>
            <th scope="col" aria-sort={ariaSort('precision')}>
              {headerButton('precision', 'Precision')}
            </th>
            <th scope="col" aria-sort={ariaSort('recall')}>
              {headerButton('recall', 'Recall')}
            </th>
            <th scope="col" aria-sort={ariaSort('f1')}>
              {headerButton('f1', 'F1 score')}
            </th>
            <th scope="col" aria-sort={ariaSort('support')}>
              {headerButton('support', 'Support')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedMetrics.map((metric) => (
            <tr key={metric.label}>
              <th scope="row">{metric.label}</th>
              {metricCell(metric.precision)}
              {metricCell(metric.recall)}
              {metricCell(metric.f1)}
              <td>
                <div className="metric-cell">
                  <div className="metric-bar metric-bar-neutral">
                    <div className="metric-bar-fill metric-bar-fill-neutral" style={{ width: `${(metric.support / maxSupport) * 100}%` }} />
                  </div>
                  <span className="metric-value">{metric.support}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Macro average</th>
            <td>{formatPercent(macroAverage(metrics, 'precision'))}</td>
            <td>{formatPercent(macroAverage(metrics, 'recall'))}</td>
            <td>{formatPercent(macroAverage(metrics, 'f1'))}</td>
            <td>{totalSupport}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
