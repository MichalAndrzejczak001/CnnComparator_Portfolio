import { computeConfusedPairs } from '../components/charts/MostConfusedPairs'
import { computeMetrics } from '../components/charts/PerClassMetricsTable'
import type { ExperimentResponse } from '../types/api'
import { toCsvSection } from './csv'

interface SummaryExtras {
  macroF1: number | null
  overfitGap: number | null
  bestEpochIndex: number | null
}

function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : (value * 100).toFixed(2)
}

function buildSummaryRows(experiment: ExperimentResponse, extras: SummaryExtras): Record<string, unknown>[] {
  return [
    { Metric: 'Experiment ID', Value: experiment.id },
    { Metric: 'Model', Value: experiment.model },
    { Metric: 'Dataset', Value: experiment.dataset },
    { Metric: 'Epochs', Value: experiment.epochs },
    { Metric: 'Batch size', Value: experiment.batch_size },
    { Metric: 'Learning rate', Value: experiment.learning_rate },
    { Metric: 'Test accuracy (%)', Value: formatPercent(experiment.test_accuracy) },
    { Metric: 'Macro F1 (%)', Value: formatPercent(extras.macroF1) },
    { Metric: 'Test loss', Value: experiment.test_loss },
    { Metric: 'Training time (s)', Value: experiment.training_time_seconds },
    { Metric: 'Parameters', Value: experiment.param_count },
    { Metric: 'Inference latency (ms)', Value: experiment.inference_latency_ms },
    { Metric: 'Training throughput (img/s)', Value: experiment.training_throughput_images_per_sec },
    { Metric: 'Overfitting gap (pp)', Value: formatPercent(extras.overfitGap) },
    { Metric: 'Best epoch (val loss)', Value: extras.bestEpochIndex !== null ? extras.bestEpochIndex + 1 : '' },
    { Metric: 'Note', Value: experiment.note ?? '' },
    { Metric: 'Model ID', Value: experiment.model_id },
    { Metric: 'Created at', Value: experiment.created_at },
  ]
}

function buildPerEpochRows(experiment: ExperimentResponse): Record<string, unknown>[] {
  const epochCount = Math.max(
    experiment.train_loss_per_epoch.length,
    experiment.val_loss_per_epoch.length,
    experiment.train_accuracy_per_epoch.length,
    experiment.val_accuracy_per_epoch.length,
  )

  return Array.from({ length: epochCount }, (_, index) => ({
    Epoch: index + 1,
    'Train Loss': experiment.train_loss_per_epoch[index] ?? '',
    'Val Loss': experiment.val_loss_per_epoch[index] ?? '',
    'Train Accuracy (%)': formatPercent(experiment.train_accuracy_per_epoch[index]),
    'Val Accuracy (%)': formatPercent(experiment.val_accuracy_per_epoch[index]),
  }))
}

function buildConfusionMatrixRows(matrix: number[][], labels: string[]): Record<string, unknown>[] {
  return labels.map((actualLabel, row) => {
    const record: Record<string, unknown> = { 'Actual class': actualLabel }
    labels.forEach((predictedLabel, col) => {
      record[`Predicted: ${predictedLabel}`] = matrix[row]?.[col] ?? 0
    })
    return record
  })
}

function buildPerClassRows(matrix: number[][], labels: string[]): Record<string, unknown>[] {
  return computeMetrics(matrix, labels).map((metric) => ({
    Class: metric.label,
    'Precision (%)': formatPercent(metric.precision),
    'Recall (%)': formatPercent(metric.recall),
    'F1 (%)': formatPercent(metric.f1),
    Support: metric.support,
  }))
}

function buildConfusedPairsRows(matrix: number[][], labels: string[]): Record<string, unknown>[] {
  return computeConfusedPairs(matrix, labels).map((pair, index) => ({
    Rank: index + 1,
    'Actual class': pair.actual,
    'Predicted as': pair.predicted,
    Count: pair.count,
    'Share of actual (%)': formatPercent(pair.shareOfActual),
  }))
}

function buildCalibrationRows(experiment: ExperimentResponse): Record<string, unknown>[] {
  return (experiment.calibration_curve ?? []).map((bin) => ({
    'Confidence min (%)': (bin.bin_min * 100).toFixed(0),
    'Confidence max (%)': (bin.bin_max * 100).toFixed(0),
    'Accuracy (%)': formatPercent(bin.accuracy),
    'Avg confidence (%)': formatPercent(bin.avg_confidence),
    Samples: bin.count,
  }))
}

function buildSamplePredictionsRows(experiment: ExperimentResponse): Record<string, unknown>[] {
  return experiment.sample_gradcams.map((sample, index) => ({
    '#': index + 1,
    'True label': sample.true_label,
    'Predicted label': sample.predicted_label,
    'Confidence (%)': formatPercent(sample.confidence),
    Correct: sample.true_label === sample.predicted_label ? 'Yes' : 'No',
  }))
}

export function buildExperimentCsv(
  experiment: ExperimentResponse,
  classLabels: string[],
  extras: SummaryExtras,
): string {
  const sections = [
    toCsvSection('Summary', buildSummaryRows(experiment, extras)),
    toCsvSection('Per-epoch metrics', buildPerEpochRows(experiment)),
    toCsvSection('Confusion matrix', buildConfusionMatrixRows(experiment.confusion_matrix, classLabels)),
    toCsvSection('Per-class metrics', buildPerClassRows(experiment.confusion_matrix, classLabels)),
    toCsvSection('Most confused pairs', buildConfusedPairsRows(experiment.confusion_matrix, classLabels)),
    toCsvSection('Calibration curve', buildCalibrationRows(experiment)),
    toCsvSection('Sample predictions', buildSamplePredictionsRows(experiment)),
  ]

  return sections.join('\n\n')
}
