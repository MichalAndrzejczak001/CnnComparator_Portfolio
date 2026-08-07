export type ModelName = 'simple_cnn' | 'lenet5' | 'alexnet' | 'vgg11' | 'resnet18' | 'mobilenet'
export type DatasetName = 'mnist' | 'cifar10' | 'fashion_mnist'

export interface RegisterRequest {
  username: string
  password: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface AuthResponse {
  token: string
}

export interface TrainingConfig {
  epochs: number
  batch_size: number
  learning_rate: number
}

export interface ExperimentRequest {
  model: ModelName
  dataset: DatasetName
  training: TrainingConfig
  note?: string
}

export interface SampleGradCam {
  true_label: string
  predicted_label: string
  confidence: number
  gradcam_image: string
}

export interface CalibrationBin {
  bin_min: number
  bin_max: number
  avg_confidence: number | null
  accuracy: number | null
  count: number
}

export interface ExperimentResponse {
  id: number
  model: ModelName
  dataset: DatasetName
  epochs: number
  batch_size: number
  learning_rate: number
  train_loss_per_epoch: number[]
  val_loss_per_epoch: number[]
  train_accuracy_per_epoch: number[]
  val_accuracy_per_epoch: number[]
  test_loss: number
  test_accuracy: number
  training_time_seconds: number
  confusion_matrix: number[][]
  note: string | null
  model_id: string
  created_at: string
  sample_gradcams: SampleGradCam[]
  param_count: number
  inference_latency_ms: number
  training_throughput_images_per_sec: number
  calibration_curve: CalibrationBin[] | null
}

export interface ExperimentSummaryResponse {
  id: number
  model: ModelName
  dataset: DatasetName
  test_accuracy: number
  created_at: string
  note: string | null
}

export interface CompareRequest {
  dataset: DatasetName
  training: TrainingConfig
}

export interface CompareExistingRequest {
  ids: number[]
}

export interface NoteRequest {
  note: string
}

export interface CompareResultItem {
  model: ModelName
  train_loss_per_epoch: number[]
  val_loss_per_epoch: number[]
  train_accuracy_per_epoch: number[]
  val_accuracy_per_epoch: number[]
  test_loss: number
  test_accuracy: number
  training_time_seconds: number
  confusion_matrix: number[][]
  param_count: number
  inference_latency_ms: number
  training_throughput_images_per_sec: number
  calibration_curve: CalibrationBin[] | null
}

export interface CompareResponse {
  dataset: DatasetName
  epochs: number
  results: CompareResultItem[]
}

export interface CompareJobStartedResponse {
  job_id: string
}

export type CompareJobState = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export interface CompareJobStatus {
  job_id: string
  status: CompareJobState
  dataset: DatasetName
  epochs: number
  total_models: number
  completed_models: number
  current_model: ModelName | null
  results: CompareResultItem[]
  error: string | null
}

export interface ClassConfidence {
  label: string
  confidence: number
}

export interface PredictResponse {
  predicted_class: string
  predicted_index: number
  confidences: ClassConfidence[]
}

export interface GradCamResponse {
  predicted_class: string
  predicted_index: number
  confidences: ClassConfidence[]
  gradcam_image: string
}

export interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
}
