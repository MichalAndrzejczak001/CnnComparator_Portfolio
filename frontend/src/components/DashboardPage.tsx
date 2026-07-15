import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  const [experiments, setExperiments] = useState<ExperimentSummaryResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showNewExperiment, setShowNewExperiment] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

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

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Your experiments</h1>
        <button type="button" className="btn-primary" onClick={() => setShowNewExperiment(true)}>
          New experiment
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {experiments === null && !error && <p>Loading experiments…</p>}

      {experiments?.length === 0 && <p>No experiments yet. Train your first model to get started.</p>}

      {experiments && experiments.length > 0 && (
        <ul className="experiment-list">
          {experiments.map((experiment) => (
            <li key={experiment.id} className="card experiment-card">
              <Link to={`/dashboard/experiments/${experiment.id}`} className="experiment-card-link">
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
