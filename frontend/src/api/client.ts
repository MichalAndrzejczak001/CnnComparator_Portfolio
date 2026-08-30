import type {
  AuthResponse,
  CompareExistingRequest,
  CompareJobStartedResponse,
  CompareJobStatus,
  CompareRequest,
  CompareResponse,
  ExperimentRequest,
  ExperimentResponse,
  ExperimentSummaryResponse,
  GradCamResponse,
  LoginRequest,
  NoteRequest,
  PageResponse,
  PredictResponse,
  ProblemDetail,
  RegisterRequest,
} from '../types/api'

const TOKEN_STORAGE_KEY = 'cnncomparator_token'
const SESSION_EXPIRED_KEY = 'cnncomparator_session_expired'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
}

// Set right before the hard redirect below, so the landing page can show a message
// explaining why the user was suddenly logged out instead of leaving them guessing.
export function consumeSessionExpiredFlag(): boolean {
  const wasSet = sessionStorage.getItem(SESSION_EXPIRED_KEY) === '1'
  sessionStorage.removeItem(SESSION_EXPIRED_KEY)
  return wasSet
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

    // A 401/403 with no JSON body means Spring Security rejected the request before it ever
    // reached a controller: the token is missing, invalid, or expired. A legitimate
    // per-resource authorization failure comes back with a ProblemDetail body instead (e.g.
    // "you don't own this compare job"). Treat the former as a dead session — without this,
    // an expired token makes every action on the page silently fail forever, since
    // ProtectedRoute only checks that a token is present, not that it's still valid.
    if ((response.status === 401 || response.status === 403) && problem === null && getToken()) {
      clearToken()
      sessionStorage.setItem(SESSION_EXPIRED_KEY, '1')
      window.location.assign('/')
    }

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

export interface ListExperimentsParams {
  page?: number
  size?: number
  model?: string
  dataset?: string
}

export function listExperiments(
  params: ListExperimentsParams = {},
): Promise<PageResponse<ExperimentSummaryResponse>> {
  const query = new URLSearchParams()
  if (params.page !== undefined) query.set('page', String(params.page))
  if (params.size !== undefined) query.set('size', String(params.size))
  if (params.model) query.set('model', params.model)
  if (params.dataset) query.set('dataset', params.dataset)

  const queryString = query.toString()
  return request(`/experiments${queryString ? `?${queryString}` : ''}`)
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

export function startCompareJob(payload: CompareRequest): Promise<CompareJobStartedResponse> {
  return request('/experiments/compare/jobs', { method: 'POST', body: JSON.stringify(payload) })
}

export function getCompareJob(jobId: string): Promise<CompareJobStatus> {
  return request(`/experiments/compare/jobs/${jobId}`)
}

export function compareExistingExperiments(payload: CompareExistingRequest): Promise<ExperimentResponse[]> {
  return request('/experiments/compare-existing', { method: 'POST', body: JSON.stringify(payload) })
}

export function rerunExperiment(id: number): Promise<ExperimentResponse> {
  return request(`/experiments/${id}/rerun`, { method: 'POST' })
}

export function updateExperimentNote(id: number, payload: NoteRequest): Promise<ExperimentResponse> {
  return request(`/experiments/${id}/note`, { method: 'PATCH', body: JSON.stringify(payload) })
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
