import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ApiError, deleteExperiment, listExperiments } from '../api/client'
import type { ExperimentSummaryResponse, PageResponse } from '../types/api'
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

const PAGE_SIZE = 20

export function DashboardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Set by the "Models used" / "Datasets used" bars on the Overview page, so clicking one
  // lands here already narrowed down instead of dumping the user into the full list.
  const modelFilter = searchParams.get('model')
  const datasetFilter = searchParams.get('dataset')
  const [pageData, setPageData] = useState<PageResponse<ExperimentSummaryResponse> | null>(null)
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [showNewExperiment, setShowNewExperiment] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingSelected, setDeletingSelected] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // A new filter may not have a page 2 at all — start back at the first page rather than
  // risking an out-of-range request.
  useEffect(() => {
    setPage(0)
  }, [modelFilter, datasetFilter])

  const loadExperiments = useCallback(
    async (targetPage: number) => {
      setError(null)
      try {
        const data = await listExperiments({
          page: targetPage,
          size: PAGE_SIZE,
          model: modelFilter ?? undefined,
          dataset: datasetFilter ?? undefined,
        })
        // Deleting the last item(s) on a page can leave it empty even though earlier pages
        // still have results — step back instead of showing a dead end.
        if (data.content.length === 0 && targetPage > 0) {
          setPage(targetPage - 1)
          return
        }
        setPageData(data)
        setSelectedIds(new Set())
      } catch (err) {
        setError(err instanceof ApiError ? err.detail : 'Could not load experiments.')
      }
    },
    [modelFilter, datasetFilter],
  )

  useEffect(() => {
    loadExperiments(page)
  }, [loadExperiments, page])

  const experiments = pageData?.content ?? null
  const isFiltered = Boolean(modelFilter || datasetFilter)

  async function handleDelete(id: number) {
    setDeletingId(id)
    try {
      await deleteExperiment(id)
      await loadExperiments(page)
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

    await loadExperiments(page)
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

      {isFiltered && (
        <p className="dashboard-filter-note">
          <span>Filtered by</span>{' '}
          {modelFilter && <strong>{MODEL_LABELS[modelFilter] ?? modelFilter}</strong>}
          {modelFilter && datasetFilter && ' · '}
          {datasetFilter && <strong>{DATASET_LABELS[datasetFilter] ?? datasetFilter}</strong>}
          {' — '}
          <Link to="/dashboard">Clear filter</Link>
        </p>
      )}

      {error && <p className="form-error">{error}</p>}

      {pageData === null && !error && <p>Loading experiments…</p>}

      {pageData && pageData.total_elements === 0 && !isFiltered && (
        <p>No experiments yet. Train your first model to get started.</p>
      )}

      {pageData && pageData.total_elements === 0 && isFiltered && (
        <p>
          <span>No experiments match this filter.</span> <Link to="/dashboard">Clear filter</Link> to see all
          experiments.
        </p>
      )}

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
              aria-label="Select all experiments on this page"
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
            {experiments.map((experiment, index) => (
              <li key={experiment.id} className="card experiment-card">
                <input
                  type="checkbox"
                  className="experiment-select-checkbox"
                  checked={selectedIds.has(experiment.id)}
                  onChange={() => toggleSelected(experiment.id)}
                  aria-label={`Select ${MODEL_LABELS[experiment.model] ?? experiment.model} for comparison`}
                />
                <Link to={`/dashboard/experiments/${experiment.id}`} className="experiment-card-link">
                  <span className="experiment-number">{(pageData?.page ?? 0) * (pageData?.size ?? PAGE_SIZE) + index + 1}</span>
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

          {pageData && pageData.total_pages > 1 && (
            <div className="dashboard-pagination">
              <button
                type="button"
                className="btn-outline"
                onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                disabled={pageData.page === 0}
              >
                Previous
              </button>
              <span>
                Page {pageData.page + 1} of {pageData.total_pages} ({pageData.total_elements} experiment
                {pageData.total_elements === 1 ? '' : 's'})
              </span>
              <button
                type="button"
                className="btn-outline"
                onClick={() => setPage((prev) => prev + 1)}
                disabled={pageData.last}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {showNewExperiment && (
        <NewExperimentModal
          onClose={() => setShowNewExperiment(false)}
          onCreated={() => {
            setShowNewExperiment(false)
            setPage(0)
            loadExperiments(0)
          }}
        />
      )}
    </div>
  )
}
