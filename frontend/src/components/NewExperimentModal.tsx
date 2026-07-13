import { useState, type FormEvent } from 'react'
import { ApiError, createExperiment } from '../api/client'
import type { DatasetName, ModelName } from '../types/api'

interface NewExperimentModalProps {
  onClose: () => void
  onCreated: () => void
}

const MODEL_OPTIONS: { value: ModelName; label: string }[] = [
  { value: 'simple_cnn', label: 'SimpleCNN' },
  { value: 'lenet5', label: 'LeNet-5' },
  { value: 'alexnet', label: 'AlexNet' },
  { value: 'vgg11', label: 'VGG11' },
  { value: 'resnet18', label: 'ResNet18' },
  { value: 'mobilenet', label: 'MobileNetV1' },
]

const DATASET_OPTIONS: { value: DatasetName; label: string }[] = [
  { value: 'mnist', label: 'MNIST' },
  { value: 'fashion_mnist', label: 'Fashion-MNIST' },
  { value: 'cifar10', label: 'CIFAR-10' },
]

export function NewExperimentModal({ onClose, onCreated }: NewExperimentModalProps) {
  const [model, setModel] = useState<ModelName>('simple_cnn')
  const [dataset, setDataset] = useState<DatasetName>('mnist')
  const [epochs, setEpochs] = useState(5)
  const [batchSize, setBatchSize] = useState(64)
  const [learningRate, setLearningRate] = useState(0.001)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await createExperiment({
        model,
        dataset,
        training: { epochs, batch_size: batchSize, learning_rate: learningRate },
        note: note.trim() || undefined,
      })
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Training failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={submitting ? undefined : onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close" disabled={submitting}>
          ×
        </button>

        <h2>New experiment</h2>

        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Model</span>
            <select value={model} onChange={(event) => setModel(event.target.value as ModelName)}>
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

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

          <label className="form-field">
            <span>Note (optional)</span>
            <input type="text" value={note} onChange={(event) => setNote(event.target.value)} />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Training… this can take a few minutes' : 'Start training'}
          </button>
        </form>
      </div>
    </div>
  )
}
