import type {
  AuthResponse,
  CompareRequest,
  CompareResponse,
  ExperimentRequest,
  ExperimentResponse,
  ExperimentSummaryResponse,
  GradCamResponse,
  LoginRequest,
  PredictResponse,
  ProblemDetail,
  RegisterRequest,
} from '../types/api'

const TOKEN_STORAGE_KEY = 'cnncomparator_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(path, { ...options, headers })

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as ProblemDetail | null
    throw new ApiError(response.status, problem?.detail ?? response.statusText)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function register(payload: RegisterRequest): Promise<AuthResponse> {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) })
}

export function login(payload: LoginRequest): Promise<AuthResponse> {
  return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) })
}

export function createExperiment(payload: ExperimentRequest): Promise<ExperimentResponse> {
  return request('/experiments', { method: 'POST', body: JSON.stringify(payload) })
}

export function listExperiments(): Promise<ExperimentSummaryResponse[]> {
  return request('/experiments')
}

export function getExperiment(id: number): Promise<ExperimentResponse> {
  return request(`/experiments/${id}`)
}

export function deleteExperiment(id: number): Promise<void> {
  return request(`/experiments/${id}`, { method: 'DELETE' })
}

export function compareModels(payload: CompareRequest): Promise<CompareResponse> {
  return request('/experiments/compare', { method: 'POST', body: JSON.stringify(payload) })
}

export function predict(experimentId: number, file: File): Promise<PredictResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return request(`/experiments/${experimentId}/predict`, { method: 'POST', body: formData })
}

export function generateGradCam(experimentId: number, file: File): Promise<GradCamResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return request(`/experiments/${experimentId}/gradcam`, { method: 'POST', body: formData })
}
