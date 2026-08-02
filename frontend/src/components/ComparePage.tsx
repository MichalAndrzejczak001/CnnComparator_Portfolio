import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, getCompareJob, startCompareJob } from '../api/client'
import type { CompareJobStatus, CompareResponse, DatasetName, ModelName } from '../types/api'
import { AccuracyTimeChart } from './charts/AccuracyTimeChart'
import { RadarChart } from './charts/RadarChart'

const POLL_INTERVAL_MS = 5000
const JOB_ID_STORAGE_KEY = 'cnncomparator_compare_job_id'
const RESULT_STORAGE_KEY = 'cnncomparator_compare_result'

function loadStoredResult(): CompareResponse | null {
  const raw = localStorage.getItem(RESULT_STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as CompareResponse
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

const DATASET_OPTIONS: { value: DatasetName; label: string }[] = [
  { value: 'mnist', label: 'MNIST' },
  { value: 'fashion_mnist', label: 'Fashion-MNIST' },
  { value: 'cifar10', label: 'CIFAR-10' },
]

export function ComparePage() {
  const [dataset, setDataset] = useState<DatasetName>('mnist')
  const [epochs, setEpochs] = useState(5)
  const [batchSize, setBatchSize] = useState(64)
  const [learningRate, setLearningRate] = useState(0.001)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [jobStatus, setJobStatus] = useState<CompareJobStatus | null>(null)
  const [result, setResult] = useState<CompareResponse | null>(() => loadStoredResult())
  const pollIntervalRef = useRef<number | null>(null)

  // Resume tracking a comparison that was already running when this page was last visited,
  // so leaving "Compare" and coming back still shows the same in-progress/finished comparison.
  useEffect(() => {
    const storedJobId = localStorage.getItem(JOB_ID_STORAGE_KEY)
    if (storedJobId) {
      setSubmitting(true)
      trackJob(storedJobId)
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

  async function checkJob(jobId: string): Promise<CompareJobStatus | null> {
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

      // A 404 just means the server no longer knows this job (e.g. it restarted) — keep
      // showing any cached result instead of scaring the user with an error banner.
      if (!(err instanceof ApiError && err.status === 404)) {
        setError(err instanceof ApiError ? err.detail : 'Could not check comparison progress.')
      }
      return null
    }
  }

  async function trackJob(jobId: string) {
    localStorage.setItem(JOB_ID_STORAGE_KEY, jobId)
    const status = await checkJob(jobId)

    if (!isTerminal(status)) {
      pollIntervalRef.current = window.setInterval(async () => {
        const latest = await checkJob(jobId)
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
      await trackJob(jobId)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Comparison failed. Please try again.')
      setSubmitting(false)
    }
  }

  const radarSeries =
    result?.results.map((item) => ({
      label: MODEL_LABELS[item.model],
      color: MODEL_COLORS[item.model],
      values: [
        item.test_accuracy,
        1 / Math.max(item.training_time_seconds, 1),
        1 / Math.max(item.test_loss, 0.0001),
      ],
    })) ?? []

  const accuracyTimePoints =
    result?.results.map((item) => ({
      label: MODEL_LABELS[item.model],
      accuracy: item.test_accuracy,
      trainingTimeSeconds: item.training_time_seconds,
    })) ?? []

  return (
    <div className="compare-page">
      <h1>Compare architectures</h1>
      <p>Train all six CNN architectures on the same dataset and rank them by accuracy, loss and training time.</p>

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

      {result && (
        <div className="compare-results">
          <div className="compare-charts">
            <RadarChart axes={['Accuracy', 'Speed', 'Low loss']} series={radarSeries} />
            <AccuracyTimeChart points={accuracyTimePoints} />
          </div>

          <table className="compare-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Accuracy</th>
                <th>Test loss</th>
                <th>Training time</th>
              </tr>
            </thead>
            <tbody>
              {result.results.map((item) => (
                <tr key={item.model}>
                  <td>{MODEL_LABELS[item.model]}</td>
                  <td>{(item.test_accuracy * 100).toFixed(2)}%</td>
                  <td>{item.test_loss.toFixed(4)}</td>
                  <td>{item.training_time_seconds.toFixed(1)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
