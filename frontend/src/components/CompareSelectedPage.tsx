import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, compareExistingExperiments } from '../api/client'
import type { DatasetName, ExperimentResponse } from '../types/api'
import { CollapsibleSection } from './CollapsibleSection'
import { ConfusionMatrix } from './charts/ConfusionMatrix'
import { computeConfusedPairs } from './charts/MostConfusedPairs'
import { MultiLineChart } from './charts/MultiLineChart'
import { computeMetrics, macroAverage, PerClassMetricsTable } from './charts/PerClassMetricsTable'
import { RadarChart } from './charts/RadarChart'
import {
  bestWorstIds,
  computeBestEpoch,
  computeOverfitGap,
  formatParamCount,
  type BestWorst,
} from '../utils/comparisonMetrics'
import { downloadCsvText, toCsvSection } from '../utils/csv'

const MODEL_LABELS: Record<string, string> = {
  simple_cnn: 'SimpleCNN',
  lenet5: 'LeNet-5',
  alexnet: 'AlexNet',
  vgg11: 'VGG11',
  resnet18: 'ResNet18',
  mobilenet: 'MobileNetV1',
}

const DATASET_LABELS: Record<string, string> = {
  mnist: 'MNIST',
  cifar10: 'CIFAR-10',
  fashion_mnist: 'Fashion-MNIST',
}

const DATASET_CLASS_LABELS: Record<DatasetName, string[]> = {
  mnist: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  cifar10: ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck'],
  fashion_mnist: ['T-shirt', 'Trouser', 'Pullover', 'Dress', 'Coat', 'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot'],
}

const SERIES_COLORS = ['#4f8cff', '#ff6b6b', '#4caf50', '#ffc107', '#9c27b0', '#00bcd4', '#e91e63', '#8bc34a']

interface Row {
  experiment: ExperimentResponse
  color: string
  macroF1: number | null
  overfitGap: number | null
  bestEpochIndex: number | null
}

type SortKey =
  | 'id'
  | 'model'
  | 'dataset'
  | 'accuracy'
  | 'macroF1'
  | 'testLoss'
  | 'trainingTime'
  | 'params'
  | 'inferenceLatency'
  | 'throughput'
  | 'overfitGap'
  | 'bestEpoch'
  | 'createdAt'

type SortDir = 'asc' | 'desc'

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  id: 'asc',
  model: 'asc',
  dataset: 'asc',
  accuracy: 'desc',
  macroF1: 'desc',
  testLoss: 'asc',
  trainingTime: 'asc',
  params: 'asc',
  inferenceLatency: 'asc',
  throughput: 'desc',
  overfitGap: 'asc',
  bestEpoch: 'asc',
  createdAt: 'desc',
}

const BETTER_DIRECTION: Partial<Record<SortKey, 'higher' | 'lower'>> = {
  accuracy: 'higher',
  macroF1: 'higher',
  testLoss: 'lower',
  trainingTime: 'lower',
  params: 'lower',
  inferenceLatency: 'lower',
  throughput: 'higher',
  overfitGap: 'lower',
}

const SECTION_KEYS = ['charts', 'results', 'matrices', 'perClass'] as const
type SectionKey = (typeof SECTION_KEYS)[number]

const DEFAULT_OPEN_SECTIONS: Record<SectionKey, boolean> = {
  charts: true,
  results: true,
  matrices: false,
  perClass: false,
}

function getSortValue(row: Row, key: SortKey): number | string {
  switch (key) {
    case 'id':
      return row.experiment.id
    case 'model':
      return row.experiment.model
    case 'dataset':
      return row.experiment.dataset
    case 'accuracy':
      return row.experiment.test_accuracy
    case 'macroF1':
      return row.macroF1 ?? -1
    case 'testLoss':
      return row.experiment.test_loss
    case 'trainingTime':
      return row.experiment.training_time_seconds
    case 'params':
      return row.experiment.param_count
    case 'inferenceLatency':
      return row.experiment.inference_latency_ms
    case 'throughput':
      return row.experiment.training_throughput_images_per_sec
    case 'overfitGap':
      return row.overfitGap ?? 0
    case 'bestEpoch':
      return row.bestEpochIndex ?? -1
    case 'createdAt':
      return new Date(row.experiment.created_at).getTime()
  }
}

export function CompareSelectedPage() {
  const [searchParams] = useSearchParams()
  const ids = (searchParams.get('ids') ?? '')
    .split(',')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)

  const [results, setResults] = useState<ExperimentResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [excludedIds, setExcludedIds] = useState<Set<number>>(new Set())
  const [sortKey, setSortKey] = useState<SortKey>('accuracy')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(DEFAULT_OPEN_SECTIONS)

  useEffect(() => {
    if (ids.length === 0) {
      setResults(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    compareExistingExperiments({ ids })
      .then((data) => {
        if (!cancelled) setResults(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.detail : 'Could not compare selected experiments.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get('ids')])

  const colorByExperimentId = useMemo(() => {
    const map = new Map<number, string>()
    ;(results ?? []).forEach((experiment, index) => map.set(experiment.id, SERIES_COLORS[index % SERIES_COLORS.length]))
    return map
  }, [results])

  const rows: Row[] = useMemo(() => {
    if (!results) return []
    return results
      .filter((experiment) => !excludedIds.has(experiment.id))
      .map((experiment) => {
        const classLabels = DATASET_CLASS_LABELS[experiment.dataset]
        return {
          experiment,
          color: colorByExperimentId.get(experiment.id) ?? SERIES_COLORS[0],
          macroF1: macroAverage(computeMetrics(experiment.confusion_matrix, classLabels), 'f1'),
          overfitGap: computeOverfitGap(experiment.train_accuracy_per_epoch, experiment.val_accuracy_per_epoch),
          bestEpochIndex: computeBestEpoch(experiment.val_loss_per_epoch),
        }
      })
  }, [results, excludedIds, colorByExperimentId])

  const sortedRows = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      const av = getSortValue(a, sortKey)
      const bv = getSortValue(b, sortKey)
      const cmp = typeof av === 'string' || typeof bv === 'string' ? String(av).localeCompare(String(bv)) : av - bv
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [rows, sortKey, sortDir])

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(DEFAULT_DIR[key])
    }
  }

  function sortIndicator(key: SortKey) {
    if (key !== sortKey) return null
    return <span className="metrics-sort-arrow">{sortDir === 'asc' ? '▲' : '▼'}</span>
  }

  function headerButton(key: SortKey, label: string) {
    const direction = BETTER_DIRECTION[key]
    return (
      <button type="button" className="metrics-sort-button" onClick={() => handleSort(key)}>
        {label}
        {direction && (
          <span
            className="compare-better-hint"
            title={direction === 'higher' ? 'Higher is better' : 'Lower is better'}
          >
            {direction === 'higher' ? '↑' : '↓'}
          </span>
        )}
        {sortIndicator(key)}
      </button>
    )
  }

  function handleRemove(id: number) {
    setExcludedIds((prev) => new Set(prev).add(id))
  }

  function toggleSection(key: SectionKey) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function setAllSections(open: boolean) {
    setOpenSections(SECTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: open }), {} as Record<SectionKey, boolean>))
  }

  const allSectionsOpen = SECTION_KEYS.every((key) => openSections[key])

  function buildSummaryRows(): Record<string, unknown>[] {
    return sortedRows.map(({ experiment, macroF1, overfitGap, bestEpochIndex }) => ({
      ID: experiment.id,
      Model: MODEL_LABELS[experiment.model] ?? experiment.model,
      Dataset: DATASET_LABELS[experiment.dataset] ?? experiment.dataset,
      Epochs: experiment.epochs,
      'Batch size': experiment.batch_size,
      'Learning rate': experiment.learning_rate,
      'Accuracy (%)': (experiment.test_accuracy * 100).toFixed(2),
      'Macro F1 (%)': macroF1 !== null ? (macroF1 * 100).toFixed(2) : '',
      'Test loss': experiment.test_loss,
      'Training time (s)': experiment.training_time_seconds,
      Parameters: experiment.param_count,
      'Inference latency (ms)': experiment.inference_latency_ms,
      'Training throughput (img/s)': experiment.training_throughput_images_per_sec,
      'Overfitting gap (pp)': overfitGap !== null ? (overfitGap * 100).toFixed(2) : '',
      'Best epoch': bestEpochIndex !== null ? bestEpochIndex + 1 : '',
      Note: experiment.note ?? '',
      'Model ID': experiment.model_id,
      'Created at': experiment.created_at,
    }))
  }

  function buildPerEpochRows(
    key: 'train_loss_per_epoch' | 'val_loss_per_epoch' | 'train_accuracy_per_epoch' | 'val_accuracy_per_epoch',
    isPercent: boolean,
  ): Record<string, unknown>[] {
    const epochCount = Math.max(0, ...sortedRows.map((row) => row.experiment[key].length))
    return Array.from({ length: epochCount }, (_, index) => {
      const record: Record<string, unknown> = { Epoch: index + 1 }
      sortedRows.forEach((row) => {
        const value = row.experiment[key][index]
        record[seriesLabel(row.experiment)] = value === undefined ? '' : isPercent ? (value * 100).toFixed(2) : value
      })
      return record
    })
  }

  function buildConfusionMatrixRows(matrix: number[][], labels: string[]): Record<string, unknown>[] {
    return labels.map((actualLabel, row) => {
      const record: Record<string, unknown> = { 'Actual class': actualLabel }
      labels.forEach((predictedLabel, col) => {
        record[`Predicted: ${predictedLabel}`] = matrix[row]?.[col] ?? 0
      })
      return record
    })
  }

  function buildPerClassRows(matrix: number[][], labels: string[]): Record<string, unknown>[] {
    return computeMetrics(matrix, labels).map((metric) => ({
      Class: metric.label,
      'Precision (%)': metric.precision !== null ? (metric.precision * 100).toFixed(2) : '',
      'Recall (%)': metric.recall !== null ? (metric.recall * 100).toFixed(2) : '',
      'F1 (%)': metric.f1 !== null ? (metric.f1 * 100).toFixed(2) : '',
      Support: metric.support,
    }))
  }

  function buildConfusedPairsRows(matrix: number[][], labels: string[]): Record<string, unknown>[] {
    return computeConfusedPairs(matrix, labels).map((pair, index) => ({
      Rank: index + 1,
      'Actual class': pair.actual,
      'Predicted as': pair.predicted,
      Count: pair.count,
      'Share of actual (%)': (pair.shareOfActual * 100).toFixed(2),
    }))
  }

  function buildCalibrationRows(experiment: ExperimentResponse): Record<string, unknown>[] {
    return (experiment.calibration_curve ?? []).map((bin) => ({
      'Confidence min (%)': (bin.bin_min * 100).toFixed(0),
      'Confidence max (%)': (bin.bin_max * 100).toFixed(0),
      'Accuracy (%)': bin.accuracy !== null ? (bin.accuracy * 100).toFixed(2) : '',
      'Avg confidence (%)': bin.avg_confidence !== null ? (bin.avg_confidence * 100).toFixed(2) : '',
      Samples: bin.count,
    }))
  }

  function handleExportCsv() {
    const sections = [
      toCsvSection('Summary', buildSummaryRows()),
      toCsvSection('Training loss per epoch', buildPerEpochRows('train_loss_per_epoch', false)),
      toCsvSection('Validation loss per epoch', buildPerEpochRows('val_loss_per_epoch', false)),
      toCsvSection('Training accuracy per epoch', buildPerEpochRows('train_accuracy_per_epoch', true)),
      toCsvSection('Validation accuracy per epoch', buildPerEpochRows('val_accuracy_per_epoch', true)),
    ]

    sortedRows.forEach(({ experiment }) => {
      const classLabels = DATASET_CLASS_LABELS[experiment.dataset]
      const label = `${seriesLabel(experiment)} (${DATASET_LABELS[experiment.dataset] ?? experiment.dataset})`
      sections.push(toCsvSection(`Confusion matrix — ${label}`, buildConfusionMatrixRows(experiment.confusion_matrix, classLabels)))
      sections.push(toCsvSection(`Per-class metrics — ${label}`, buildPerClassRows(experiment.confusion_matrix, classLabels)))
      sections.push(toCsvSection(`Most confused pairs — ${label}`, buildConfusedPairsRows(experiment.confusion_matrix, classLabels)))
      sections.push(toCsvSection(`Calibration curve — ${label}`, buildCalibrationRows(experiment)))
    })

    downloadCsvText('compare-selected-experiments.csv', sections.join('\n\n'))
  }

  const getRowId = (r: Row) => r.experiment.id
  const accuracyBestWorst = bestWorstIds(rows, (r) => r.experiment.test_accuracy, getRowId, true)
  const macroF1BestWorst = bestWorstIds(rows, (r) => r.macroF1, getRowId, true)
  const testLossBestWorst = bestWorstIds(rows, (r) => r.experiment.test_loss, getRowId, false)
  const trainingTimeBestWorst = bestWorstIds(rows, (r) => r.experiment.training_time_seconds, getRowId, false)
  const paramsBestWorst = bestWorstIds(rows, (r) => r.experiment.param_count, getRowId, false)
  const latencyBestWorst = bestWorstIds(rows, (r) => r.experiment.inference_latency_ms, getRowId, false)
  const throughputBestWorst = bestWorstIds(rows, (r) => r.experiment.training_throughput_images_per_sec, getRowId, true)
  const overfitBestWorst = bestWorstIds(rows, (r) => r.overfitGap, getRowId, false)

  function cellClass(id: number, bw: BestWorst<number>): string {
    if (id === bw.bestId) return 'compare-cell-best'
    if (id === bw.worstId) return 'compare-cell-worst'
    return ''
  }

  function seriesLabel(experiment: ExperimentResponse): string {
    return `#${experiment.id} ${MODEL_LABELS[experiment.model] ?? experiment.model}`
  }

  const radarSeries = rows.map((row) => ({
    label: seriesLabel(row.experiment),
    color: row.color,
    values: [
      row.experiment.test_accuracy,
      1 / Math.max(row.experiment.test_loss, 0.0001),
      1 / Math.max(row.experiment.training_time_seconds, 1),
      1 / Math.max(row.experiment.inference_latency_ms, 0.01),
      1 / Math.max(row.experiment.param_count, 1),
    ],
    displayValues: [
      `${(row.experiment.test_accuracy * 100).toFixed(2)}%`,
      row.experiment.test_loss.toFixed(4),
      `${row.experiment.training_time_seconds.toFixed(1)}s`,
      `${row.experiment.inference_latency_ms.toFixed(1)} ms`,
      formatParamCount(row.experiment.param_count),
    ],
  }))

  const lossSeries = rows.map((row) => ({
    label: seriesLabel(row.experiment),
    color: row.color,
    values: row.experiment.val_loss_per_epoch,
  }))

  const accuracySeries = rows.map((row) => ({
    label: seriesLabel(row.experiment),
    color: row.color,
    values: row.experiment.val_accuracy_per_epoch,
  }))

  // Confusion matrices only make sense to compare within the same dataset — different
  // datasets have entirely different class labels, so group by dataset and only show
  // groups with at least two experiments (nothing to compare against otherwise).
  const matrixGroups = useMemo(() => {
    const byDataset = new Map<DatasetName, Row[]>()
    rows.forEach((row) => {
      const list = byDataset.get(row.experiment.dataset) ?? []
      list.push(row)
      byDataset.set(row.experiment.dataset, list)
    })
    return [...byDataset.entries()].filter(([, group]) => group.length >= 2)
  }, [rows])

  return (
    <div className="compare-selected-page">
      <div className="dashboard-header">
        <h1>Compare selected experiments</h1>
        {rows.length > 0 && (
          <div className="experiment-header-actions">
            <button type="button" className="btn-outline" onClick={handleExportCsv}>
              Export as CSV
            </button>
            <button type="button" className="btn-outline" onClick={() => setAllSections(!allSectionsOpen)}>
              {allSectionsOpen ? 'Collapse all' : 'Expand all'}
            </button>
          </div>
        )}
      </div>

      {ids.length === 0 && (
        <p>
          No experiments selected. Go to the <Link to="/dashboard">dashboard</Link>, select at least two experiments
          using the checkboxes, then click "Compare selected".
        </p>
      )}

      {loading && <p>Comparing experiments…</p>}
      {error && <p className="form-error">{error}</p>}

      {results && rows.length === 0 && ids.length > 0 && !loading && (
        <p>
          All experiments were removed from this comparison. <Link to="/dashboard">Back to the dashboard</Link> to
          select again.
        </p>
      )}

      {rows.length > 0 && (
        <>
          <CollapsibleSection title="Comparison charts" open={openSections.charts} onToggle={() => toggleSection('charts')}>
            <div className="compare-charts">
              <RadarChart
                axes={['Accuracy', 'Low loss', 'Training speed', 'Inference speed', 'Compact']}
                series={radarSeries}
              />
              <MultiLineChart title="Validation loss" yLabel="Loss" series={lossSeries} formatValue={(v) => v.toFixed(3)} />
              <MultiLineChart
                title="Validation accuracy"
                yLabel="Accuracy"
                series={accuracySeries}
                formatValue={(v) => `${(v * 100).toFixed(1)}%`}
              />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Results" open={openSections.results} onToggle={() => toggleSection('results')}>
            <table className="compare-selected-table">
              <thead>
                <tr>
                  <th>{headerButton('id', 'ID')}</th>
                  <th>{headerButton('model', 'Model')}</th>
                  <th>{headerButton('dataset', 'Dataset')}</th>
                  <th>{headerButton('accuracy', 'Accuracy')}</th>
                  <th>{headerButton('macroF1', 'Macro F1')}</th>
                  <th>{headerButton('testLoss', 'Test loss')}</th>
                  <th>{headerButton('trainingTime', 'Training time')}</th>
                  <th>{headerButton('params', 'Parameters')}</th>
                  <th>{headerButton('inferenceLatency', 'Inference latency')}</th>
                  <th>{headerButton('throughput', 'Throughput')}</th>
                  <th>{headerButton('overfitGap', 'Overfitting gap')}</th>
                  <th>{headerButton('bestEpoch', 'Best epoch')}</th>
                  <th>Note</th>
                  <th>{headerButton('createdAt', 'Created')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(({ experiment, macroF1, overfitGap, bestEpochIndex }) => (
                  <tr key={experiment.id}>
                    <td>#{experiment.id}</td>
                    <td>{MODEL_LABELS[experiment.model] ?? experiment.model}</td>
                    <td>{DATASET_LABELS[experiment.dataset] ?? experiment.dataset}</td>
                    <td className={cellClass(experiment.id, accuracyBestWorst)}>
                      {(experiment.test_accuracy * 100).toFixed(2)}%
                    </td>
                    <td className={cellClass(experiment.id, macroF1BestWorst)}>
                      {macroF1 === null ? '—' : `${(macroF1 * 100).toFixed(1)}%`}
                    </td>
                    <td className={cellClass(experiment.id, testLossBestWorst)}>{experiment.test_loss.toFixed(4)}</td>
                    <td className={cellClass(experiment.id, trainingTimeBestWorst)}>
                      {experiment.training_time_seconds.toFixed(1)}s
                    </td>
                    <td className={cellClass(experiment.id, paramsBestWorst)}>
                      {formatParamCount(experiment.param_count)}
                    </td>
                    <td className={cellClass(experiment.id, latencyBestWorst)}>
                      {experiment.inference_latency_ms.toFixed(1)} ms
                    </td>
                    <td className={cellClass(experiment.id, throughputBestWorst)}>
                      {experiment.training_throughput_images_per_sec.toFixed(0)} img/s
                    </td>
                    <td className={cellClass(experiment.id, overfitBestWorst)}>
                      {overfitGap === null ? '—' : `${overfitGap >= 0 ? '+' : ''}${(overfitGap * 100).toFixed(1)} pp`}
                    </td>
                    <td>
                      {bestEpochIndex === null ? '—' : `${bestEpochIndex + 1} / ${experiment.val_loss_per_epoch.length}`}
                    </td>
                    <td className="compare-note-cell" title={experiment.note || undefined}>
                      {experiment.note || '—'}
                    </td>
                    <td>{new Date(experiment.created_at).toLocaleDateString()}</td>
                    <td>
                      <Link to={`/dashboard/experiments/${experiment.id}`}>View</Link>
                      {' · '}
                      <button type="button" className="btn-link" onClick={() => handleRemove(experiment.id)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CollapsibleSection>

          {rows.length >= 2 && (
            <CollapsibleSection
              title="Confusion matrices"
              open={openSections.matrices}
              onToggle={() => toggleSection('matrices')}
            >
              {matrixGroups.length === 0 ? (
                <p className="text-muted">
                  No two selected experiments share the same dataset, so there's nothing to compare here —
                  confusion matrices from different datasets have different class labels.
                </p>
              ) : (
                <>
                  <p className="text-muted">Only experiments trained on the same dataset can be compared side by side.</p>
                  {matrixGroups.map(([dataset, group]) => (
                    <div key={dataset} className="stats-group">
                      <h3 className="stats-group-title">{DATASET_LABELS[dataset] ?? dataset}</h3>
                      <div className="compare-matrix-row">
                        {group.map((row) => (
                          <div key={row.experiment.id} className="compare-matrix-item">
                            <span className="compare-matrix-item-label">
                              <span className="chart-legend-swatch" style={{ background: row.color }} />
                              {seriesLabel(row.experiment)}
                            </span>
                            <ConfusionMatrix
                              matrix={row.experiment.confusion_matrix}
                              labels={DATASET_CLASS_LABELS[dataset]}
                              cellSize={20}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CollapsibleSection>
          )}

          {rows.length >= 2 && (
            <CollapsibleSection
              title="Per-class metrics"
              open={openSections.perClass}
              onToggle={() => toggleSection('perClass')}
            >
              {matrixGroups.length === 0 ? (
                <p className="text-muted">
                  No two selected experiments share the same dataset, so there's nothing to compare here —
                  per-class metrics from different datasets refer to different classes.
                </p>
              ) : (
                <>
                  <p className="text-muted">Only experiments trained on the same dataset can be compared side by side.</p>
                  {matrixGroups.map(([dataset, group]) => (
                    <div key={dataset} className="stats-group">
                      <h3 className="stats-group-title">{DATASET_LABELS[dataset] ?? dataset}</h3>
                      <div className="compare-matrix-row">
                        {group.map((row) => (
                          <div key={row.experiment.id} className="compare-matrix-item">
                            <span className="compare-matrix-item-label">
                              <span className="chart-legend-swatch" style={{ background: row.color }} />
                              {seriesLabel(row.experiment)}
                            </span>
                            <PerClassMetricsTable
                              matrix={row.experiment.confusion_matrix}
                              labels={DATASET_CLASS_LABELS[dataset]}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </CollapsibleSection>
          )}
        </>
      )}
    </div>
  )
}
