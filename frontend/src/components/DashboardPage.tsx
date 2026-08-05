import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError, deleteExperiment, listExperiments } from '../api/client'
import type { ExperimentSummaryResponse } from '../types/api'
import { NewExperimentModal } from './NewExperimentModal'

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

export function DashboardPage() {
  const navigate = useNavigate()
  const [experiments, setExperiments] = useState<ExperimentSummaryResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showNewExperiment, setShowNewExperiment] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingSelected, setDeletingSelected] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const loadExperiments = useCallback(async () => {
    setError(null)
    try {
      const data = await listExperiments()
      setExperiments(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Could not load experiments.')
    }
  }, [])

  useEffect(() => {
    loadExperiments()
  }, [loadExperiments])

  const experimentNumbers = useMemo(() => {
    const numbers = new Map<number, number>()
    if (!experiments) {
      return numbers
    }
    ;[...experiments]
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .forEach((experiment, index) => numbers.set(experiment.id, index + 1))
    return numbers
  }, [experiments])

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await deleteExperiment(id)
      setExperiments((prev) => prev?.filter((experiment) => experiment.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Could not delete experiment.')
    } finally {
      setDeletingId(null)
    }
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (experiments && prev.size === experiments.length) {
        return new Set()
      }
      return new Set(experiments?.map((experiment) => experiment.id) ?? [])
    })
  }

  function handleCompareSelected() {
    navigate(`/dashboard/compare-selected?ids=${[...selectedIds].join(',')}`)
  }

  async function handleDeleteSelected() {
    const ids = [...selectedIds]
    if (ids.length === 0) return

    setDeletingSelected(true)
    setError(null)

    const results = await Promise.allSettled(ids.map((id) => deleteExperiment(id)))
    const failedIds = new Set(ids.filter((_, index) => results[index].status === 'rejected'))

    setExperiments((prev) => prev?.filter((experiment) => !ids.includes(experiment.id) || failedIds.has(experiment.id)) ?? null)
    setSelectedIds(failedIds)

    if (failedIds.size > 0) {
      setError(
        `Could not delete ${failedIds.size} of ${ids.length} selected experiment${ids.length === 1 ? '' : 's'}.`,
      )
    }

    setDeletingSelected(false)
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Your experiments</h1>
        <button type="button" className="btn-primary" onClick={() => setShowNewExperiment(true)}>
          New experiment
        </button>
      </div>

      <p className="dashboard-intro-note">
        This is your experiment history — review results, compare several at once, or rerun a training.
      </p>

      {error && <p className="form-error">{error}</p>}

      {experiments === null && !error && <p>Loading experiments…</p>}

      {experiments?.length === 0 && <p>No experiments yet. Train your first model to get started.</p>}

      {experiments && experiments.length > 0 && (
        <>
          <div className="dashboard-compare-bar">
            <span>{selectedIds.size} selected</span>
            <button
              type="button"
              className="btn-primary"
              onClick={handleCompareSelected}
              disabled={selectedIds.size < 2}
            >
              {`Compare selected (${selectedIds.size})`}
            </button>
            <button
              type="button"
              className="btn-outline"
              onClick={handleDeleteSelected}
              disabled={selectedIds.size === 0 || deletingSelected}
            >
              {deletingSelected ? 'Deleting…' : `Delete selected (${selectedIds.size})`}
            </button>
          </div>

          <div className="experiment-list-header">
            <input
              type="checkbox"
              className="experiment-select-checkbox"
              checked={experiments.length > 0 && selectedIds.size === experiments.length}
              ref={(el) => {
                if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < experiments.length
              }}
              onChange={toggleSelectAll}
              aria-label="Select all experiments"
            />
            <span className="experiment-header-grid">
              <span>Nr</span>
              <span>ID</span>
              <span>Model</span>
              <span>Dataset</span>
              <span>Accuracy</span>
              <span>Date</span>
              <span>Note</span>
            </span>
            <button type="button" className="btn-outline experiment-list-header-spacer" tabIndex={-1} disabled aria-hidden="true">
              Delete
            </button>
          </div>

          <ul className="experiment-list">
            {experiments.map((experiment) => (
              <li key={experiment.id} className="card experiment-card">
                <input
                  type="checkbox"
                  className="experiment-select-checkbox"
                  checked={selectedIds.has(experiment.id)}
                  onChange={() => toggleSelected(experiment.id)}
                  aria-label={`Select ${MODEL_LABELS[experiment.model] ?? experiment.model} for comparison`}
                />
                <Link to={`/dashboard/experiments/${experiment.id}`} className="experiment-card-link">
                  <span className="experiment-number">{experimentNumbers.get(experiment.id)}</span>
                  <span className="experiment-id">#{experiment.id}</span>
                  <span className="experiment-model">{MODEL_LABELS[experiment.model] ?? experiment.model}</span>
                  <span className="experiment-dataset">{DATASET_LABELS[experiment.dataset] ?? experiment.dataset}</span>
                  <span className="experiment-accuracy">{(experiment.test_accuracy * 100).toFixed(2)}%</span>
                  <span className="experiment-date">{new Date(experiment.created_at).toLocaleString()}</span>
                  {experiment.note && <span className="experiment-note">{experiment.note}</span>}
                </Link>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => handleDelete(experiment.id)}
                  disabled={deletingId === experiment.id}
                >
                  {deletingId === experiment.id ? 'Deleting…' : 'Delete'}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {showNewExperiment && (
        <NewExperimentModal
          onClose={() => setShowNewExperiment(false)}
          onCreated={() => {
            setShowNewExperiment(false)
            loadExperiments()
          }}
        />
      )}
    </div>
  )
}
