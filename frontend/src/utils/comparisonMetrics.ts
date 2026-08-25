export function computeOverfitGap(trainAccuracy: number[], valAccuracy: number[]): number | null {
  if (trainAccuracy.length === 0 || valAccuracy.length === 0) return null
  return trainAccuracy[trainAccuracy.length - 1] - valAccuracy[valAccuracy.length - 1]
}

export function computeBestEpoch(valLoss: number[]): number | null {
  if (valLoss.length === 0) return null
  let bestIndex = 0
  for (let index = 1; index < valLoss.length; index++) {
    if (valLoss[index] < valLoss[bestIndex]) bestIndex = index
  }
  return bestIndex
}

export function formatParamCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`
  return `${count}`
}

// Binary units (1024-based, matching how OSes report file sizes) — the raw byte size of
// everything saved in the model's state_dict (parameters + buffers like BatchNorm running
// stats), so it can diverge from param_count-derived estimates.
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

export interface BestWorst<Id> {
  bestId: Id | null
  worstId: Id | null
}

export function bestWorstIds<Row, Id>(
  rows: Row[],
  getValue: (row: Row) => number | null,
  getId: (row: Row) => Id,
  higherIsBetter: boolean,
): BestWorst<Id> {
  const withValues = rows
    .map((row) => ({ id: getId(row), value: getValue(row) }))
    .filter((entry): entry is { id: Id; value: number } => entry.value !== null)

  if (withValues.length < 2) return { bestId: null, worstId: null }

  const sorted = [...withValues].sort((a, b) => (higherIsBetter ? b.value - a.value : a.value - b.value))
  return { bestId: sorted[0].id, worstId: sorted[sorted.length - 1].id }
}
