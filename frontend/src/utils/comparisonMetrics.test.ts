import { describe, expect, it } from 'vitest'
import { bestWorstIds, computeBestEpoch, computeOverfitGap, formatBytes, formatParamCount } from './comparisonMetrics'

describe('computeOverfitGap', () => {
  it('returns the gap between the last train and val accuracy', () => {
    expect(computeOverfitGap([0.6, 0.8, 0.95], [0.6, 0.78, 0.8])).toBeCloseTo(0.15)
  })

  it('can be negative when validation accuracy is higher than training accuracy', () => {
    expect(computeOverfitGap([0.8], [0.9])).toBeCloseTo(-0.1)
  })

  it('returns null when either series is empty', () => {
    expect(computeOverfitGap([], [0.9])).toBeNull()
    expect(computeOverfitGap([0.9], [])).toBeNull()
  })
})

describe('computeBestEpoch', () => {
  it('returns the index of the lowest validation loss', () => {
    expect(computeBestEpoch([0.9, 0.5, 0.6, 0.4, 0.45])).toBe(3)
  })

  it('returns the first index on a tie', () => {
    expect(computeBestEpoch([0.5, 0.3, 0.3])).toBe(1)
  })

  it('returns null for an empty series', () => {
    expect(computeBestEpoch([])).toBeNull()
  })
})

describe('formatParamCount', () => {
  it('formats millions with one decimal and an M suffix', () => {
    expect(formatParamCount(2_400_000)).toBe('2.4M')
  })

  it('formats thousands with one decimal and a K suffix', () => {
    expect(formatParamCount(62_006)).toBe('62.0K')
  })

  it('leaves small counts as a plain number', () => {
    expect(formatParamCount(842)).toBe('842')
  })
})

describe('formatBytes', () => {
  it('formats gigabytes with two decimals', () => {
    expect(formatBytes(2.5 * 1024 ** 3)).toBe('2.50 GB')
  })

  it('formats megabytes with two decimals', () => {
    expect(formatBytes(1.25 * 1024 ** 2)).toBe('1.25 MB')
  })

  it('formats kilobytes with one decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB')
  })

  it('leaves small byte counts as a plain number', () => {
    expect(formatBytes(512)).toBe('512 B')
  })
})

describe('bestWorstIds', () => {
  interface Row {
    id: string
    value: number | null
  }

  const rows: Row[] = [
    { id: 'a', value: 0.9 },
    { id: 'b', value: 0.5 },
    { id: 'c', value: 0.7 },
  ]

  it('picks the highest and lowest value when higher is better', () => {
    const result = bestWorstIds(rows, (row) => row.value, (row) => row.id, true)
    expect(result).toEqual({ bestId: 'a', worstId: 'b' })
  })

  it('picks the lowest and highest value when lower is better', () => {
    const result = bestWorstIds(rows, (row) => row.value, (row) => row.id, false)
    expect(result).toEqual({ bestId: 'b', worstId: 'a' })
  })

  it('ignores rows with a null value', () => {
    const withNulls: Row[] = [...rows, { id: 'd', value: null }]
    const result = bestWorstIds(withNulls, (row) => row.value, (row) => row.id, true)
    expect(result).toEqual({ bestId: 'a', worstId: 'b' })
  })

  it('returns nulls when fewer than two rows have a value', () => {
    const single: Row[] = [{ id: 'a', value: 0.9 }, { id: 'b', value: null }]
    const result = bestWorstIds(single, (row) => row.value, (row) => row.id, true)
    expect(result).toEqual({ bestId: null, worstId: null })
  })
})
