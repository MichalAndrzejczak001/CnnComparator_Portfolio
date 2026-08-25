import { describe, expect, it } from 'vitest'
import type { ExperimentResponse } from '../types/api'
import { buildExperimentCsv } from './experimentCsvExport'

function makeExperiment(overrides: Partial<ExperimentResponse> = {}): ExperimentResponse {
  return {
    id: 42,
    model: 'simple_cnn',
    dataset: 'mnist',
    epochs: 2,
    batch_size: 32,
    learning_rate: 0.001,
    train_loss_per_epoch: [0.9, 0.5],
    val_loss_per_epoch: [0.8, 0.4],
    train_accuracy_per_epoch: [0.6, 0.8],
    val_accuracy_per_epoch: [0.65, 0.91],
    test_loss: 0.4,
    test_accuracy: 0.91,
    training_time_seconds: 12.3,
    confusion_matrix: [
      [5, 0],
      [1, 4],
    ],
    note: 'a test note',
    model_id: 'model-123',
    created_at: '2026-01-01T00:00:00',
    sample_gradcams: [
      { true_label: '0', predicted_label: '0', confidence: 0.98, gradcam_image: 'base64...' },
      { true_label: '1', predicted_label: '0', confidence: 0.55, gradcam_image: 'base64...' },
    ],
    param_count: 62006,
    inference_latency_ms: 3.4,
    training_throughput_images_per_sec: 850.5,
    calibration_curve: [{ bin_min: 0.9, bin_max: 1.0, avg_confidence: 0.95, accuracy: 0.91, count: 15 }],
    ...overrides,
  }
}

describe('buildExperimentCsv', () => {
  it('includes every section header', () => {
    const csv = buildExperimentCsv(makeExperiment(), ['0', '1'], {
      macroF1: 0.85,
      overfitGap: 0.05,
      bestEpochIndex: 1,
      ece: 0.032,
    })

    expect(csv).toContain('Summary')
    expect(csv).toContain('Per-epoch metrics')
    expect(csv).toContain('Confusion matrix')
    expect(csv).toContain('Per-class metrics')
    expect(csv).toContain('Most confused pairs')
    expect(csv).toContain('Calibration curve')
    expect(csv).toContain('Sample predictions')
  })

  it('includes headline stats in the summary section', () => {
    const csv = buildExperimentCsv(makeExperiment(), ['0', '1'], {
      macroF1: 0.85,
      overfitGap: 0.05,
      bestEpochIndex: 1,
      ece: 0.032,
    })

    expect(csv).toContain('Experiment ID,42')
    expect(csv).toContain('Model,simple_cnn')
    expect(csv).toContain('Test accuracy (%),91.00')
    expect(csv).toContain('Macro F1 (%),85.00')
    expect(csv).toContain('Parameters,62006')
    expect(csv).toContain('Expected Calibration Error (%),3.20')
  })

  it('does not leak the base64 gradcam image into the sample predictions section', () => {
    const csv = buildExperimentCsv(makeExperiment(), ['0', '1'], {
      macroF1: null,
      overfitGap: null,
      bestEpochIndex: null,
      ece: null,
    })

    expect(csv).not.toContain('base64...')
  })

  it('falls back to "(no data)" for a missing calibration curve', () => {
    const csv = buildExperimentCsv(makeExperiment({ calibration_curve: null }), ['0', '1'], {
      macroF1: null,
      overfitGap: null,
      bestEpochIndex: null,
      ece: null,
    })

    expect(csv).toContain('Calibration curve\n(no data)')
  })
})
