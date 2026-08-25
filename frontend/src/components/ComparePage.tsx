import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ApiError, getCompareJob, startCompareJob } from '../api/client'
import type { CompareJobStatus, CompareResponse, CompareResultItem, DatasetName, ModelName } from '../types/api'
import { AccuracyScatterChart } from './charts/AccuracyScatterChart'
import { CalibrationChart, computeECE } from './charts/CalibrationChart'
import { CollapsibleSection } from './CollapsibleSection'
import { ConfusionMatrix } from './charts/ConfusionMatrix'
import { computeConfusedPairs, MostConfusedPairs } from './charts/MostConfusedPairs'
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

const POLL_INTERVAL_MS = 5000
const JOB_ID_STORAGE_KEY = 'cnncomparator_compare_job_id'
// Bumped to v2 because CompareResultItem grew new required fields (param_count,
// train/val accuracy per epoch, ...) — a result cached under the old key from before
// that change would be missing them and crash the page on render (see incident where
// the page rendered blank after this evolved). Bump this again any time
// CompareResultItem's shape changes, so stale cached results get discarded instead of
// crashing.
const RESULT_STORAGE_KEY = 'cnncomparator_compare_result_v2'

// Extra guard on top of the key bump above: even a "v2" entry could be stale if we
// forget to bump the key next time. Reject anything missing fields the UI now depends
// on rather than let it throw mid-render.
function isValidStoredResult(value: unknown): value is CompareResponse {
  if (!value || typeof value !== 'object') return false
  const results = (value as { results?: unknown }).results
  if (!Array.isArray(results)) return false
  return results.every(
    (item: Partial<CompareResultItem>) =>
      Array.isArray(item.train_accuracy_per_epoch) &&
      Array.isArray(item.val_accuracy_per_epoch) &&
      typeof item.param_count === 'number' &&
      typeof item.inference_latency_ms === 'number' &&
      typeof item.training_throughput_images_per_sec === 'number',
  )
}

function loadStoredResult(): CompareResponse | null {
  const raw = localStorage.getItem(RESULT_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    return isValidStoredResult(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isTerminal(status: CompareJobStatus | null): boolean {
  return status === null || status.status === 'COMPLETED' || status.status === 'FAILED'
}

const MODEL_LABELS: Record<ModelName, string> = {
  simple_cnn: 'SimpleCNN',
  lenet5: 'LeNet-5',
  alexnet: 'AlexNet',
  vgg11: 'VGG11',
  resnet18: 'ResNet18',
  mobilenet: 'MobileNetV1',
}

const MODEL_COLORS: Record<ModelName, string> = {
  simple_cnn: '#4f8cff',
  lenet5: '#ff6b6b',
  alexnet: '#4caf50',
  vgg11: '#ffc107',
  resnet18: '#9c27b0',
  mobilenet: '#00bcd4',
}

const DATASET_LABELS: Record<DatasetName, string> = {
  mnist: 'MNIST',
  cifar10: 'CIFAR-10',
  fashion_mnist: 'Fashion-MNIST',
}

const DATASET_CLASS_LABELS: Record<DatasetName, string[]> = {
  mnist: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  cifar10: ['airplane', 'automobile', 'bird', 'cat', 'deer', 'dog', 'frog', 'horse', 'ship', 'truck'],
  fashion_mnist: ['T-shirt', 'Trouser', 'Pullover', 'Dress', 'Coat', 'Sandal', 'Shirt', 'Sneaker', 'Bag', 'Ankle boot'],
}

const DATASET_OPTIONS: { value: DatasetName; label: string }[] = [
  { value: 'mnist', label: 'MNIST' },
  { value: 'fashion_mnist', label: 'Fashion-MNIST' },
  { value: 'cifar10', label: 'CIFAR-10' },
]

interface Row {
  item: CompareResultItem
  color: string
  macroF1: number | null
  bestEpochIndex: number | null
  overfitGap: number | null
  ece: number | null
}

type SortKey =
  | 'model'
  | 'accuracy'
  | 'macroF1'
  | 'testLoss'
  | 'trainingTime'
  | 'params'
  | 'inferenceLatency'
  | 'throughput'
  | 'overfitGap'
  | 'bestEpoch'
  | 'ece'
type SortDir = 'asc' | 'desc'

const DEFAULT_DIR: Record<SortKey, SortDir> = {
  model: 'asc',
  accuracy: 'desc',
  macroF1: 'desc',
  testLoss: 'asc',
  trainingTime: 'asc',
  params: 'asc',
  inferenceLatency: 'asc',
  throughput: 'desc',
  overfitGap: 'asc',
  bestEpoch: 'asc',
  ece: 'asc',
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
  ece: 'lower',
}

function getSortValue(row: Row, key: SortKey): number | string {
  switch (key) {
    case 'model':
      return row.item.model
    case 'accuracy':
      return row.item.test_accuracy
    case 'macroF1':
      return row.macroF1 ?? -1
    case 'testLoss':
      return row.item.test_loss
    case 'trainingTime':
      return row.item.training_time_seconds
    case 'params':
      return row.item.param_count
    case 'inferenceLatency':
      return row.item.inference_latency_ms
    case 'throughput':
      return row.item.training_throughput_images_per_sec
    case 'overfitGap':
      return row.overfitGap ?? 0
    case 'bestEpoch':
      return row.bestEpochIndex ?? -1
    case 'ece':
      return row.ece ?? 1
  }
}

const SECTION_KEYS = ['charts', 'results', 'matrices', 'perClass', 'calibration', 'confusedPairs'] as const
type SectionKey = (typeof SECTION_KEYS)[number]

const DEFAULT_OPEN_SECTIONS: Record<SectionKey, boolean> = {
  charts: true,
  results: true,
  matrices: false,
  perClass: false,
  calibration: false,
  confusedPairs: false,
}

export function ComparePage() {
  const [dataset, setDataset] = useState<DatasetName>('mnist')
  const [epochs, setEpochs] = useState(5)
  const [batchSize, setBatchSize] = useState(64)
  const [learningRate, setLearningRate] = useState(0.001)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [jobStatus, setJobStatus] = useState<CompareJobStatus | null>(null)
  const [result, setResult] = useState<CompareResponse | null>(() => loadStoredResult())
  const [sortKey, setSortKey] = useState<SortKey>('accuracy')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(DEFAULT_OPEN_SECTIONS)
  const pollIntervalRef = useRef<number | null>(null)

  // Resume tracking a comparison that was already running when this page was last visited,
  // so leaving "Compare" and coming back still shows the same in-progress/finished comparison.
  useEffect(() => {
    const storedJobId = localStorage.getItem(JOB_ID_STORAGE_KEY)
    if (storedJobId) {
      setSubmitting(true)
      trackJob(storedJobId, true)
    }
    return () => stopPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopPolling() {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  async function checkJob(jobId: string, isResume: boolean): Promise<CompareJobStatus | null> {
    try {
      const status = await getCompareJob(jobId)
      setJobStatus(status)

      if (status.status === 'COMPLETED') {
        const finalResult = { dataset: status.dataset, epochs: status.epochs, results: status.results }
        setResult(finalResult)
        localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(finalResult))
        setSubmitting(false)
      } else if (status.status === 'FAILED') {
        setError(status.error ?? 'Comparison failed. Please try again.')
        setSubmitting(false)
      }

      return status
    } catch (err) {
      localStorage.removeItem(JOB_ID_STORAGE_KEY)
      setSubmitting(false)

      if (err instanceof ApiError && err.status === 404) {
        // A 404 means the server no longer knows this job (e.g. it restarted). When resuming
        // a job from a previous visit that's expected and not worth a scary error banner —
        // but when it happens right after the user just clicked "Run comparison", the progress
        // bar would otherwise just vanish with no explanation, so tell them what happened.
        if (!isResume) {
          setError('Lost track of this comparison — the server may have restarted. Please try again.')
        }
      } else {
        setError(err instanceof ApiError ? err.detail : 'Could not check comparison progress.')
      }
      return null
    }
  }

  async function trackJob(jobId: string, isResume: boolean) {
    localStorage.setItem(JOB_ID_STORAGE_KEY, jobId)
    const status = await checkJob(jobId, isResume)

    if (!isTerminal(status)) {
      pollIntervalRef.current = window.setInterval(async () => {
        const latest = await checkJob(jobId, isResume)
        if (isTerminal(latest)) stopPolling()
      }, POLL_INTERVAL_MS)
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    stopPolling()
    setError(null)
    setSubmitting(true)
    setResult(null)
    setJobStatus(null)
    localStorage.removeItem(RESULT_STORAGE_KEY)

    try {
      const { job_id: jobId } = await startCompareJob({
        dataset,
        training: { epochs, batch_size: batchSize, learning_rate: learningRate },
      })
      await trackJob(jobId, false)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Comparison failed. Please try again.')
      setSubmitting(false)
    }
  }

  const rows: Row[] = useMemo(() => {
    if (!result) return []
    const classLabels = DATASET_CLASS_LABELS[result.dataset]
    return result.results.map((item) => ({
      item,
      color: MODEL_COLORS[item.model],
      macroF1: macroAverage(computeMetrics(item.confusion_matrix, classLabels), 'f1'),
      bestEpochIndex: computeBestEpoch(item.val_loss_per_epoch),
      overfitGap: computeOverfitGap(item.train_accuracy_per_epoch, item.val_accuracy_per_epoch),
      ece: item.calibration_curve ? computeECE(item.calibration_curve) : null,
    }))
  }, [result])

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
          <span className="compare-better-hint" title={direction === 'higher' ? 'Higher is better' : 'Lower is better'}>
            {direction === 'higher' ? '↑' : '↓'}
          </span>
        )}
        {sortIndicator(key)}
      </button>
    )
  }

  function toggleSection(key: SectionKey) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function setAllSections(open: boolean) {
    setOpenSections(SECTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: open }), {} as Record<SectionKey, boolean>))
  }

  const allSectionsOpen = SECTION_KEYS.every((key) => openSections[key])

  const getRowId = (r: Row) => r.item.model
  const accuracyBestWorst = bestWorstIds(rows, (r) => r.item.test_accuracy, getRowId, true)
  const macroF1BestWorst = bestWorstIds(rows, (r) => r.macroF1, getRowId, true)
  const testLossBestWorst = bestWorstIds(rows, (r) => r.item.test_loss, getRowId, false)
  const trainingTimeBestWorst = bestWorstIds(rows, (r) => r.item.training_time_seconds, getRowId, false)
  const paramsBestWorst = bestWorstIds(rows, (r) => r.item.param_count, getRowId, false)
  const latencyBestWorst = bestWorstIds(rows, (r) => r.item.inference_latency_ms, getRowId, false)
  const throughputBestWorst = bestWorstIds(rows, (r) => r.item.training_throughput_images_per_sec, getRowId, true)
  const overfitBestWorst = bestWorstIds(rows, (r) => r.overfitGap, getRowId, false)
  const eceBestWorst = bestWorstIds(rows, (r) => r.ece, getRowId, false)

  function cellClass(model: ModelName, bw: BestWorst<ModelName>): string {
    if (model === bw.bestId) return 'compare-cell-best'
    if (model === bw.worstId) return 'compare-cell-worst'
    return ''
  }

  const radarSeries = rows.map((row) => ({
    label: MODEL_LABELS[row.item.model],
    color: row.color,
    values: [
      row.item.test_accuracy,
      1 / Math.max(row.item.test_loss, 0.0001),
      1 / Math.max(row.item.training_time_seconds, 1),
      1 / Math.max(row.item.inference_latency_ms, 0.01),
      1 / Math.max(row.item.param_count, 1),
    ],
    displayValues: [
      `${(row.item.test_accuracy * 100).toFixed(2)}%`,
      row.item.test_loss.toFixed(4),
      `${row.item.training_time_seconds.toFixed(1)}s`,
      `${row.item.inference_latency_ms.toFixed(1)} ms`,
      formatParamCount(row.item.param_count),
    ],
  }))

  const accuracyTimePoints = rows.map((row) => ({
    label: MODEL_LABELS[row.item.model],
    color: row.color,
    accuracy: row.item.test_accuracy,
    xValue: row.item.training_time_seconds,
  }))

  const accuracyParamsPoints = rows.map((row) => ({
    label: MODEL_LABELS[row.item.model],
    color: row.color,
    accuracy: row.item.test_accuracy,
    xValue: row.item.param_count,
  }))

  const lossSeries = rows.flatMap((row) => [
    {
      label: `${MODEL_LABELS[row.item.model]} (train)`,
      color: row.color,
      values: row.item.train_loss_per_epoch,
      dashed: true,
    },
    { label: MODEL_LABELS[row.item.model], color: row.color, values: row.item.val_loss_per_epoch },
  ])

  const accuracySeries = rows.flatMap((row) => [
    {
      label: `${MODEL_LABELS[row.item.model]} (train)`,
      color: row.color,
      values: row.item.train_accuracy_per_epoch,
      dashed: true,
    },
    { label: MODEL_LABELS[row.item.model], color: row.color, values: row.item.val_accuracy_per_epoch },
  ])

  function buildSummaryRows(): Record<string, unknown>[] {
    return sortedRows.map(({ item, macroF1, overfitGap, bestEpochIndex, ece }) => ({
      Model: MODEL_LABELS[item.model],
      Dataset: result ? DATASET_LABELS[result.dataset] : '',
      Epochs: result?.epochs ?? '',
      'Accuracy (%)': (item.test_accuracy * 100).toFixed(2),
      'Macro F1 (%)': macroF1 !== null ? (macroF1 * 100).toFixed(2) : '',
      'Test loss': item.test_loss,
      'Training time (s)': item.training_time_seconds,
      Parameters: item.param_count,
      'Inference latency (ms)': item.inference_latency_ms,
      'Training throughput (img/s)': item.training_throughput_images_per_sec,
      'Overfitting gap (pp)': overfitGap !== null ? (overfitGap * 100).toFixed(2) : '',
      'Best epoch': bestEpochIndex !== null ? bestEpochIndex + 1 : '',
      'ECE (%)': ece !== null ? (ece * 100).toFixed(2) : '',
    }))
  }

  function buildPerEpochRows(
    key: 'train_loss_per_epoch' | 'val_loss_per_epoch' | 'train_accuracy_per_epoch' | 'val_accuracy_per_epoch',
    isPercent: boolean,
  ): Record<string, unknown>[] {
    const epochCount = Math.max(0, ...sortedRows.map((row) => row.item[key].length))
    return Array.from({ length: epochCount }, (_, index) => {
      const record: Record<string, unknown> = { Epoch: index + 1 }
      sortedRows.forEach((row) => {
        const value = row.item[key][index]
        record[MODEL_LABELS[row.item.model]] = value === undefined ? '' : isPercent ? (value * 100).toFixed(2) : value
      })
      return record
    })
  }

  function buildConfusionMatrixRows(matrix: number[][], labels: string[]): Record<string, unknown>[] {
    return labels.map((actualLabel, rowIndex) => {
      const record: Record<string, unknown> = { 'Actual class': actualLabel }
      labels.forEach((predictedLabel, col) => {
        record[`Predicted: ${predictedLabel}`] = matrix[rowIndex]?.[col] ?? 0
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

  function buildCalibrationRows(item: CompareResultItem): Record<string, unknown>[] {
    return (item.calibration_curve ?? []).map((bin) => ({
      'Confidence min (%)': (bin.bin_min * 100).toFixed(0),
      'Confidence max (%)': (bin.bin_max * 100).toFixed(0),
      'Accuracy (%)': bin.accuracy !== null ? (bin.accuracy * 100).toFixed(2) : '',
      'Avg confidence (%)': bin.avg_confidence !== null ? (bin.avg_confidence * 100).toFixed(2) : '',
      Samples: bin.count,
    }))
  }

  function handleExportCsv() {
    if (!result) return
    const classLabels = DATASET_CLASS_LABELS[result.dataset]

    const sections = [
      toCsvSection('Summary', buildSummaryRows()),
      toCsvSection('Training loss per epoch', buildPerEpochRows('train_loss_per_epoch', false)),
      toCsvSection('Validation loss per epoch', buildPerEpochRows('val_loss_per_epoch', false)),
      toCsvSection('Training accuracy per epoch', buildPerEpochRows('train_accuracy_per_epoch', true)),
      toCsvSection('Validation accuracy per epoch', buildPerEpochRows('val_accuracy_per_epoch', true)),
    ]

    sortedRows.forEach(({ item }) => {
      const label = MODEL_LABELS[item.model]
      sections.push(toCsvSection(`Confusion matrix — ${label}`, buildConfusionMatrixRows(item.confusion_matrix, classLabels)))
      sections.push(toCsvSection(`Per-class metrics — ${label}`, buildPerClassRows(item.confusion_matrix, classLabels)))
      sections.push(toCsvSection(`Most confused pairs — ${label}`, buildConfusedPairsRows(item.confusion_matrix, classLabels)))
      sections.push(toCsvSection(`Calibration curve — ${label}`, buildCalibrationRows(item)))
    })

    downloadCsvText(`compare-architectures-${result.dataset}.csv`, sections.join('\n\n'))
  }

  return (
    <div className="compare-page">
      <div className="dashboard-header">
        <div>
          <h1>Compare architectures</h1>
          <p>Train all six CNN architectures on the same dataset and rank them by accuracy, loss and training time.</p>
        </div>
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

      <form onSubmit={handleSubmit} className="compare-form">
        <label className="form-field">
          <span>Dataset</span>
          <select value={dataset} onChange={(event) => setDataset(event.target.value as DatasetName)}>
            {DATASET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Epochs</span>
          <input
            type="number"
            min={1}
            max={100}
            value={epochs}
            onChange={(event) => setEpochs(Number(event.target.value))}
            required
          />
        </label>

        <label className="form-field">
          <span>Batch size</span>
          <input
            type="number"
            min={1}
            max={512}
            value={batchSize}
            onChange={(event) => setBatchSize(Number(event.target.value))}
            required
          />
        </label>

        <label className="form-field">
          <span>Learning rate</span>
          <input
            type="number"
            min={0.0001}
            max={1}
            step={0.0001}
            value={learningRate}
            onChange={(event) => setLearningRate(Number(event.target.value))}
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Training…' : 'Run comparison'}
        </button>
      </form>

      {submitting && (
        <div className="compare-progress">
          <div className="compare-progress-bar">
            <div
              className="compare-progress-bar-fill"
              style={{
                width: `${((jobStatus?.completed_models ?? 0) / (jobStatus?.total_models ?? 6)) * 100}%`,
              }}
            />
          </div>
          <p className="compare-progress-label">
            {jobStatus ? `${jobStatus.completed_models} of ${jobStatus.total_models} architectures trained` : 'Starting…'}
            {jobStatus?.current_model &&
              ` — currently training ${MODEL_LABELS[jobStatus.current_model] ?? jobStatus.current_model}…`}
          </p>
        </div>
      )}

      {result && rows.length > 0 && (
        <div className="compare-results">
          <p className="text-muted">
            Results for {DATASET_LABELS[result.dataset]}, {result.epochs} epoch{result.epochs === 1 ? '' : 's'}.
          </p>

          <CollapsibleSection title="Comparison charts" open={openSections.charts} onToggle={() => toggleSection('charts')}>
            <div className="compare-charts">
              <RadarChart
                axes={['Accuracy', 'Low loss', 'Training speed', 'Inference speed', 'Compact']}
                series={radarSeries}
              />
              <AccuracyScatterChart
                points={accuracyTimePoints}
                title="Accuracy vs. training time"
                xAxisLabel="Training time"
                formatXValue={(v) => `${v.toFixed(0)}s`}
              />
              <AccuracyScatterChart
                points={accuracyParamsPoints}
                title="Accuracy vs. parameters"
                xAxisLabel="Parameters"
                formatXValue={formatParamCount}
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
                  <th>{headerButton('model', 'Model')}</th>
                  <th>{headerButton('accuracy', 'Accuracy')}</th>
                  <th>{headerButton('macroF1', 'Macro F1')}</th>
                  <th>{headerButton('testLoss', 'Test loss')}</th>
                  <th>{headerButton('trainingTime', 'Training time')}</th>
                  <th>{headerButton('params', 'Parameters')}</th>
                  <th>{headerButton('inferenceLatency', 'Inference latency')}</th>
                  <th>{headerButton('throughput', 'Throughput')}</th>
                  <th>{headerButton('overfitGap', 'Overfitting gap')}</th>
                  <th>{headerButton('bestEpoch', 'Best epoch')}</th>
                  <th>{headerButton('ece', 'ECE')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(({ item, macroF1, overfitGap, bestEpochIndex, ece }) => (
                  <tr key={item.model}>
                    <td>{MODEL_LABELS[item.model]}</td>
                    <td className={cellClass(item.model, accuracyBestWorst)}>{(item.test_accuracy * 100).toFixed(2)}%</td>
                    <td className={cellClass(item.model, macroF1BestWorst)}>
                      {macroF1 === null ? '—' : `${(macroF1 * 100).toFixed(1)}%`}
                    </td>
                    <td className={cellClass(item.model, testLossBestWorst)}>{item.test_loss.toFixed(4)}</td>
                    <td className={cellClass(item.model, trainingTimeBestWorst)}>{item.training_time_seconds.toFixed(1)}s</td>
                    <td className={cellClass(item.model, paramsBestWorst)}>{formatParamCount(item.param_count)}</td>
                    <td className={cellClass(item.model, latencyBestWorst)}>{item.inference_latency_ms.toFixed(1)} ms</td>
                    <td className={cellClass(item.model, throughputBestWorst)}>
                      {item.training_throughput_images_per_sec.toFixed(0)} img/s
                    </td>
                    <td className={cellClass(item.model, overfitBestWorst)}>
                      {overfitGap === null ? '—' : `${overfitGap >= 0 ? '+' : ''}${(overfitGap * 100).toFixed(1)} pp`}
                    </td>
                    <td>
                      {bestEpochIndex === null ? '—' : `${bestEpochIndex + 1} / ${item.val_loss_per_epoch.length}`}
                    </td>
                    <td className={cellClass(item.model, eceBestWorst)}>
                      {ece === null ? '—' : `${(ece * 100).toFixed(1)}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CollapsibleSection>

          <CollapsibleSection
            title="Confusion matrices"
            open={openSections.matrices}
            onToggle={() => toggleSection('matrices')}
          >
            <div className="compare-matrix-row">
              {rows.map((row) => (
                <div key={row.item.model} className="compare-matrix-item">
                  <span className="compare-matrix-item-label">
                    <span className="chart-legend-swatch" style={{ background: row.color }} />
                    {MODEL_LABELS[row.item.model]}
                  </span>
                  <ConfusionMatrix
                    matrix={row.item.confusion_matrix}
                    labels={DATASET_CLASS_LABELS[result.dataset]}
                    cellSize={20}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Per-class metrics"
            open={openSections.perClass}
            onToggle={() => toggleSection('perClass')}
          >
            <div className="compare-matrix-row">
              {rows.map((row) => (
                <div key={row.item.model} className="compare-matrix-item">
                  <span className="compare-matrix-item-label">
                    <span className="chart-legend-swatch" style={{ background: row.color }} />
                    {MODEL_LABELS[row.item.model]}
                  </span>
                  <PerClassMetricsTable
                    matrix={row.item.confusion_matrix}
                    labels={DATASET_CLASS_LABELS[result.dataset]}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Calibration curves"
            open={openSections.calibration}
            onToggle={() => toggleSection('calibration')}
          >
            <div className="compare-matrix-row">
              {rows.map((row) =>
                row.item.calibration_curve && row.item.calibration_curve.length > 0 ? (
                  <div key={row.item.model} className="compare-matrix-item">
                    <span className="compare-matrix-item-label">
                      <span className="chart-legend-swatch" style={{ background: row.color }} />
                      {MODEL_LABELS[row.item.model]}
                    </span>
                    <CalibrationChart bins={row.item.calibration_curve} width={320} height={220} />
                  </div>
                ) : null,
              )}
            </div>
          </CollapsibleSection>

          <CollapsibleSection
            title="Most confused pairs"
            open={openSections.confusedPairs}
            onToggle={() => toggleSection('confusedPairs')}
          >
            <div className="compare-matrix-row">
              {rows.map((row) => (
                <div key={row.item.model} className="compare-matrix-item">
                  <span className="compare-matrix-item-label">
                    <span className="chart-legend-swatch" style={{ background: row.color }} />
                    {MODEL_LABELS[row.item.model]}
                  </span>
                  <MostConfusedPairs
                    matrix={row.item.confusion_matrix}
                    labels={DATASET_CLASS_LABELS[result.dataset]}
                  />
                </div>
              ))}
            </div>
          </CollapsibleSection>
        </div>
      )}
    </div>
  )
}
