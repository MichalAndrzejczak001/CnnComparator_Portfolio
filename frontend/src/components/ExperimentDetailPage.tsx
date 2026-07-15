import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, deleteExperiment, getExperiment } from '../api/client'
import type { DatasetName, ExperimentResponse } from '../types/api'
import { AugmentModal } from './AugmentModal'
import { ClassifyImageModal } from './ClassifyImageModal'
import { ConfusionMatrix } from './charts/ConfusionMatrix'
import { DrawDigitModal } from './DrawDigitModal'
import { GradCamModal } from './GradCamModal'
import { LossChart } from './charts/LossChart'

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

type ActiveModal = 'classify' | 'gradcam' | 'draw' | 'augment' | null

export function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const experimentId = Number(id)

  const [experiment, setExperiment] = useState<ExperimentResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)

  const loadExperiment = useCallback(async () => {
    setError(null)
    setNotFound(false)

    try {
      const data = await getExperiment(experimentId)
      setExperiment(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true)
      } else {
        setError(err instanceof ApiError ? err.detail : 'Could not load this experiment.')
      }
    }
  }, [experimentId])

  useEffect(() => {
    loadExperiment()
  }, [loadExperiment])

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteExperiment(experimentId)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Could not delete experiment.')
      setDeleting(false)
    }
  }

  if (notFound) {
    return (
      <div>
        <h1>Experiment not found</h1>
        <p>
          <Link to="/dashboard">Back to dashboard</Link>
        </p>
      </div>
    )
  }

  if (error && !experiment) {
    return <p className="form-error">{error}</p>
  }

  if (!experiment) {
    return <p>Loading experiment…</p>
  }

  const classLabels = DATASET_CLASS_LABELS[experiment.dataset]

  return (
    <div className="experiment-detail">
      <div className="dashboard-header">
        <div>
          <h1>
            {MODEL_LABELS[experiment.model] ?? experiment.model} on {DATASET_LABELS[experiment.dataset] ?? experiment.dataset}
          </h1>
          {experiment.note && <p>{experiment.note}</p>}
        </div>
        <button type="button" className="btn-outline" onClick={handleDelete} disabled={deleting}>
          {deleting ? 'Deleting…' : 'Delete experiment'}
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="experiment-stats">
        <div className="card">
          <span>Test accuracy</span>
          <strong>{(experiment.test_accuracy * 100).toFixed(2)}%</strong>
        </div>
        <div className="card">
          <span>Test loss</span>
          <strong>{experiment.test_loss.toFixed(4)}</strong>
        </div>
        <div className="card">
          <span>Training time</span>
          <strong>{experiment.training_time_seconds.toFixed(1)}s</strong>
        </div>
        <div className="card">
          <span>Epochs</span>
          <strong>{experiment.epochs}</strong>
        </div>
      </div>

      <div className="experiment-charts">
        <LossChart trainLoss={experiment.train_loss_per_epoch} testLoss={experiment.test_loss_per_epoch} />
        <ConfusionMatrix matrix={experiment.confusion_matrix} labels={classLabels} />
      </div>

      <div className="experiment-actions">
        <button type="button" className="btn-primary" onClick={() => setActiveModal('classify')}>
          Classify image
        </button>
        <button type="button" className="btn-primary" onClick={() => setActiveModal('gradcam')}>
          Grad-CAM
        </button>
        <button type="button" className="btn-primary" onClick={() => setActiveModal('draw')}>
          Draw a digit
        </button>
        <button type="button" className="btn-outline" onClick={() => setActiveModal('augment')}>
          Augment image
        </button>
      </div>

      {experiment.sample_gradcams.length > 0 && (
        <div className="gradcam-gallery">
          <h2>Sample predictions</h2>
          <div className="gradcam-gallery-grid">
            {experiment.sample_gradcams.map((sample, index) => (
              <div className="card gradcam-gallery-item" key={index}>
                <img src={`data:image/png;base64,${sample.gradcam_image}`} alt={`Grad-CAM sample ${index + 1}`} />
                <p>
                  True: <strong>{sample.true_label}</strong> · Predicted: <strong>{sample.predicted_label}</strong>
                </p>
                <p>{(sample.confidence * 100).toFixed(1)}% confidence</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeModal === 'classify' && (
        <ClassifyImageModal experimentId={experimentId} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'gradcam' && <GradCamModal experimentId={experimentId} onClose={() => setActiveModal(null)} />}
      {activeModal === 'draw' && <DrawDigitModal experimentId={experimentId} onClose={() => setActiveModal(null)} />}
      {activeModal === 'augment' && <AugmentModal onClose={() => setActiveModal(null)} />}
    </div>
  )
}
