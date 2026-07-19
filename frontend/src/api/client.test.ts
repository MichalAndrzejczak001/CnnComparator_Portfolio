import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, clearToken, deleteExperiment, getToken, listExperiments, login, setToken } from './client'

describe('token storage', () => {
  afterEach(() => {
    clearToken()
  })

  it('returns null when no token is stored', () => {
    expect(getToken()).toBeNull()
  })

  it('stores and retrieves a token', () => {
    setToken('abc123')
    expect(getToken()).toBe('abc123')
  })

  it('removes the token on clear', () => {
    setToken('abc123')
    clearToken()
    expect(getToken()).toBeNull()
  })
})

describe('request', () => {
  beforeEach(() => {
    clearToken()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('attaches an Authorization header when a token is stored', async () => {
    setToken('my-token')
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

    await listExperiments()

    const [, options] = vi.mocked(fetch).mock.calls[0]
    const headers = new Headers(options?.headers)
    expect(headers.get('Authorization')).toBe('Bearer my-token')
  })

  it('omits the Authorization header when no token is stored', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }))

    await listExperiments()

    const [, options] = vi.mocked(fetch).mock.calls[0]
    const headers = new Headers(options?.headers)
    expect(headers.has('Authorization')).toBe(false)
  })

  it('resolves with the parsed JSON body on success', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ token: 'jwt-value' }), { status: 200 }),
    )

    const result = await login({ username: 'michal', password: 'secret' })

    expect(result).toEqual({ token: 'jwt-value' })
  })

  it('resolves with undefined on a 204 response', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }))

    await expect(deleteExperiment(1)).resolves.toBeUndefined()
  })

  it('throws an ApiError with the problem detail on failure', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: 'Experiment not found' }), { status: 404 }),
    )

    await expect(deleteExperiment(1)).rejects.toMatchObject(
      new ApiError(404, 'Experiment not found'),
    )
  })

  it('falls back to the status text when the error body is not JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('not json', { status: 500, statusText: 'Server Error' }))

    await expect(deleteExperiment(1)).rejects.toMatchObject(new ApiError(500, 'Server Error'))
  })
})
