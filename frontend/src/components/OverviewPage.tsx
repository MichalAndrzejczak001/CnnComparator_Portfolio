import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, listExperiments } from '../api/client'
import type { DatasetName, ExperimentSummaryResponse, ModelName } from '../types/api'

const MODEL_LABELS: Record<ModelName, string> = {
  simple_cnn: 'SimpleCNN',
  lenet5: 'LeNet-5',
  alexnet: 'AlexNet',
  vgg11: 'VGG11',
  resnet18: 'ResNet18',
  mobilenet: 'MobileNetV1',
}

const DATASET_LABELS: Record<DatasetName, string> = {
  mnist: 'MNIST',
  cifar10: 'CIFAR-10',
  fashion_mnist: 'Fashion-MNIST',
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.round(diffMs / 60000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`

  const diffHours = Math.round(diffMin / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return new Date(iso).toLocaleDateString()
}

function countBy<T extends string>(items: T[]): Map<T, number> {
  const counts = new Map<T, number>()
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1)
  }
  return counts
}

function topEntry<T>(counts: Map<T, number>): [T, number] | null {
  let best: [T, number] | null = null
  for (const entry of counts) {
    if (!best || entry[1] > best[1]) best = entry
  }
  return best
}

function sortedEntries<T>(counts: Map<T, number>): [T, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1])
}

export function OverviewPage() {
  const [experiments, setExperiments] = useState<ExperimentSummaryResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Aggregate stats need the full history in one shot, not one paginated page — request a
    // page large enough to cover realistic usage.
    listExperiments({ size: 1000 })
      .then((data) => setExperiments(data.content))
      .catch((err) => setError(err instanceof ApiError ? err.detail : 'Could not load overview.'))
  }, [])

  if (error) {
    return <p className="form-error">{error}</p>
  }

  if (experiments === null) {
    return <p>Loading overview…</p>
  }

  if (experiments.length === 0) {
    return (
      <div className="overview-page">
        <h1>Overview</h1>
        <p className="overview-empty">
          No experiments yet. <Link to="/dashboard">Go to the dashboard</Link> and train your first model to see
          your stats here.
        </p>
      </div>
    )
  }

  const totalCount = experiments.length
  const best = experiments.reduce((a, b) => (b.test_accuracy > a.test_accuracy ? b : a))
  const worst = experiments.reduce((a, b) => (b.test_accuracy < a.test_accuracy ? b : a))
  const averageAccuracy = experiments.reduce((sum, e) => sum + e.test_accuracy, 0) / totalCount

  const byRecency = [...experiments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  const lastExperiment = byRecency[0]
  const firstExperiment = byRecency[byRecency.length - 1]
  const recent = byRecency.slice(0, 5)

  const notesCount = experiments.filter((e) => e.note).length

  const modelCounts = countBy(experiments.map((e) => e.model))
  const datasetCounts = countBy(experiments.map((e) => e.dataset))
  const topModel = topEntry(modelCounts)
  const topDataset = topEntry(datasetCounts)
  const maxModelCount = Math.max(...modelCounts.values())
  const maxDatasetCount = Math.max(...datasetCounts.values())

  return (
    <div className="overview-page">
      <h1>Overview</h1>
      <p className="dashboard-intro-note">A quick summary of everything you've trained so far.</p>

      <div className="experiment-summary-section">
        <h2>At a glance</h2>
        <div className="experiment-stats">
          <div className="card">
            <span>Total experiments</span>
            <strong>{totalCount}</strong>
          </div>
          <div className="card">
            <span>Best accuracy</span>
            <strong>{(best.test_accuracy * 100).toFixed(2)}%</strong>
            <small>
              {MODEL_LABELS[best.model]} on {DATASET_LABELS[best.dataset]}
            </small>
          </div>
          <div className="card">
            <span>Average accuracy</span>
            <strong>{(averageAccuracy * 100).toFixed(2)}%</strong>
          </div>
          <div className="card">
            <span>Most used model</span>
            <strong>{topModel ? MODEL_LABELS[topModel[0]] : '—'}</strong>
            {topModel && <small>{topModel[1]} experiment{topModel[1] === 1 ? '' : 's'}</small>}
          </div>
          <div className="card">
            <span>Most used dataset</span>
            <strong>{topDataset ? DATASET_LABELS[topDataset[0]] : '—'}</strong>
            {topDataset && <small>{topDataset[1]} experiment{topDataset[1] === 1 ? '' : 's'}</small>}
          </div>
          <div className="card">
            <span>Last experiment</span>
            <strong>{formatRelativeTime(lastExperiment.created_at)}</strong>
            <small>
              <Link to={`/dashboard/experiments/${lastExperiment.id}`}>
                {MODEL_LABELS[lastExperiment.model]} on {DATASET_LABELS[lastExperiment.dataset]}
              </Link>
            </small>
          </div>
          <div className="card">
            <span>Lowest accuracy</span>
            <strong>{(worst.test_accuracy * 100).toFixed(2)}%</strong>
            <small>
              {MODEL_LABELS[worst.model]} on {DATASET_LABELS[worst.dataset]}
            </small>
          </div>
          <div className="card">
            <span>Experiments with notes</span>
            <strong>{notesCount}</strong>
            <small>out of {totalCount}</small>
          </div>
          <div className="card">
            <span>First experiment</span>
            <strong>{formatRelativeTime(firstExperiment.created_at)}</strong>
          </div>
        </div>
      </div>

      <div className="experiment-summary-section">
        <h2>Usage breakdown</h2>
        <div className="overview-breakdown">
          <div className="chart-block">
            <div className="chart-header">
              <h3 className="chart-title">Models used</h3>
            </div>
            <ul className="overview-bar-list">
              {sortedEntries(modelCounts).map(([model, count]) => (
                <li key={model}>
                  <Link to={`/dashboard?model=${model}`} className="overview-bar-row overview-bar-row-link">
                    <span className="overview-bar-label">{MODEL_LABELS[model]}</span>
                    <div className="metric-bar">
                      <div className="metric-bar-fill" style={{ width: `${(count / maxModelCount) * 100}%` }} />
                    </div>
                    <span className="overview-bar-value">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="chart-block">
            <div className="chart-header">
              <h3 className="chart-title">Datasets used</h3>
            </div>
            <ul className="overview-bar-list">
              {sortedEntries(datasetCounts).map(([dataset, count]) => (
                <li key={dataset}>
                  <Link to={`/dashboard?dataset=${dataset}`} className="overview-bar-row overview-bar-row-link">
                    <span className="overview-bar-label">{DATASET_LABELS[dataset]}</span>
                    <div className="metric-bar">
                      <div className="metric-bar-fill" style={{ width: `${(count / maxDatasetCount) * 100}%` }} />
                    </div>
                    <span className="overview-bar-value">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="experiment-summary-section">
        <h2>Recent experiments</h2>
        <ul className="overview-recent-list">
          {recent.map((experiment) => (
            <li key={experiment.id} className="card overview-recent-item">
              <Link to={`/dashboard/experiments/${experiment.id}`} className="overview-recent-link">
                <span className="overview-recent-model">{MODEL_LABELS[experiment.model]}</span>
                <span className="overview-recent-dataset">{DATASET_LABELS[experiment.dataset]}</span>
                <span className="overview-recent-accuracy">{(experiment.test_accuracy * 100).toFixed(2)}%</span>
                <span className="overview-recent-date">{formatRelativeTime(experiment.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
