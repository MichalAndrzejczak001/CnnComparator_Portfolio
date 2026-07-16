import { useState, type FormEvent } from 'react'
import { ApiError, compareModels } from '../api/client'
import type { CompareResponse, DatasetName, ModelName } from '../types/api'
import { AccuracyTimeChart } from './charts/AccuracyTimeChart'
import { RadarChart } from './charts/RadarChart'

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
  const [result, setResult] = useState<CompareResponse | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    setResult(null)

    try {
      const response = await compareModels({
        dataset,
        training: { epochs, batch_size: batchSize, learning_rate: learningRate },
      })
      setResult(response)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Comparison failed. Please try again.')
    } finally {
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
            min={0.00001}
            max={1}
            step={0.0001}
            value={learningRate}
            onChange={(event) => setLearningRate(Number(event.target.value))}
            required
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <button type="submit" className="btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Training all 6 models… this can take a while' : 'Run comparison'}
        </button>
      </form>

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
