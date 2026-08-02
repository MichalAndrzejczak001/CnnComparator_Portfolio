import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, compareExistingExperiments } from '../api/client'
import type { ExperimentResponse } from '../types/api'

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

export function CompareSelectedPage() {
  const [searchParams] = useSearchParams()
  const ids = (searchParams.get('ids') ?? '')
    .split(',')
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0)

  const [results, setResults] = useState<ExperimentResponse[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  return (
    <div className="compare-selected-page">
      <h1>Compare selected experiments</h1>

      {ids.length === 0 && (
        <p>
          No experiments selected. Go to the <Link to="/dashboard">dashboard</Link>, select at least two experiments
          using the checkboxes, then click "Compare selected".
        </p>
      )}

      {loading && <p>Comparing experiments…</p>}
      {error && <p className="form-error">{error}</p>}

      {results && (
        <div className="card compare-selected-results">
          <table className="compare-selected-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Model</th>
                <th>Dataset</th>
                <th>Accuracy</th>
                <th>Test loss</th>
                <th>Training time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {results.map((result) => (
                <tr key={result.id}>
                  <td>#{result.id}</td>
                  <td>{MODEL_LABELS[result.model] ?? result.model}</td>
                  <td>{DATASET_LABELS[result.dataset] ?? result.dataset}</td>
                  <td>{(result.test_accuracy * 100).toFixed(2)}%</td>
                  <td>{result.test_loss.toFixed(4)}</td>
                  <td>{result.training_time_seconds.toFixed(1)}s</td>
                  <td>
                    <Link to={`/dashboard/experiments/${result.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
