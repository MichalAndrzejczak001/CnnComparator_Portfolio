import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, deleteExperiment, getExperiment, rerunExperiment, updateExperimentNote } from '../api/client'
import type { DatasetName, ExperimentResponse } from '../types/api'
import { AugmentModal } from './AugmentModal'
import { ClassifyImageModal } from './ClassifyImageModal'
import { ConfusionMatrix } from './charts/ConfusionMatrix'
import { DrawDigitModal } from './DrawDigitModal'
import { GradCamModal } from './GradCamModal'
import { LossChart } from './charts/LossChart'
import { MostConfusedPairs } from './charts/MostConfusedPairs'
import { PerClassMetricsTable } from './charts/PerClassMetricsTable'
import { SamplePredictionsGallery } from './SamplePredictionsGallery'

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
  const [rerunning, setRerunning] = useState(false)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingNote, setSavingNote] = useState(false)

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

  async function handleRerun() {
    setRerunning(true)
    setError(null)
    try {
      const rerun = await rerunExperiment(experimentId)
      navigate(`/dashboard/experiments/${rerun.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Could not rerun experiment.')
      setRerunning(false)
    }
  }

  function startEditingNote() {
    setNoteDraft(experiment?.note ?? '')
    setEditingNote(true)
  }

  async function handleSaveNote() {
    setSavingNote(true)
    try {
      const updated = await updateExperimentNote(experimentId, { note: noteDraft })
      setExperiment(updated)
      setEditingNote(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Could not update note.')
    } finally {
      setSavingNote(false)
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
          {editingNote ? (
            <div className="note-editor">
              <input
                type="text"
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Add a note…"
              />
              <button type="button" className="btn-primary" onClick={handleSaveNote} disabled={savingNote}>
                {savingNote ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setEditingNote(false)} disabled={savingNote}>
                Cancel
              </button>
            </div>
          ) : (
            <p className="note-display">
              {experiment.note || 'No note yet.'}{' '}
              <button type="button" className="btn-link" onClick={startEditingNote}>
                Edit note
              </button>
            </p>
          )}
        </div>
        <div className="experiment-header-actions">
          <button type="button" className="btn-outline" onClick={handleRerun} disabled={rerunning}>
            {rerunning ? 'Rerunning…' : 'Rerun experiment'}
          </button>
          <button type="button" className="btn-outline" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete experiment'}
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="experiment-summary-section">
        <h2>Experiment results</h2>
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
        </div>
      </div>

      <div className="experiment-summary-section">
        <h2>Experiment parameters</h2>
        <div className="experiment-stats">
          <div className="card">
            <span>Model</span>
            <strong>{MODEL_LABELS[experiment.model] ?? experiment.model}</strong>
          </div>
          <div className="card">
            <span>Dataset</span>
            <strong>{DATASET_LABELS[experiment.dataset] ?? experiment.dataset}</strong>
          </div>
          <div className="card">
            <span>Epochs</span>
            <strong>{experiment.epochs}</strong>
          </div>
          <div className="card">
            <span>Batch size</span>
            <strong>{experiment.batch_size}</strong>
          </div>
          <div className="card">
            <span>Learning rate</span>
            <strong>{experiment.learning_rate}</strong>
          </div>
        </div>
      </div>

      <div className="experiment-summary-section">
        <h2>Training charts</h2>
        <div className="experiment-charts">
          <LossChart trainLoss={experiment.train_loss_per_epoch} testLoss={experiment.test_loss_per_epoch} />
          <ConfusionMatrix matrix={experiment.confusion_matrix} labels={classLabels} />
        </div>
      </div>

      <div className="experiment-summary-section">
        <h2>Per-class metrics</h2>
        <PerClassMetricsTable matrix={experiment.confusion_matrix} labels={classLabels} />
      </div>

      <div className="experiment-summary-section">
        <h2>Most confused pairs</h2>
        <MostConfusedPairs matrix={experiment.confusion_matrix} labels={classLabels} />
      </div>

      <div className="experiment-summary-section">
        <h2>Try it out</h2>
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
      </div>

      {experiment.sample_gradcams.length > 0 && (
        <div className="experiment-summary-section gradcam-gallery">
          <h2>Sample predictions</h2>
          <SamplePredictionsGallery samples={experiment.sample_gradcams} />
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
