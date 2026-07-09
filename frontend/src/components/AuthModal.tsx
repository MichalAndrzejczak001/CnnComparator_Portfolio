import { useState, type FormEvent } from 'react'
import { ApiError, login, register, setToken } from '../api/client'

export type AuthMode = 'login' | 'register'

interface AuthModalProps {
  mode: AuthMode
  onClose: () => void
  onAuthenticated: () => void
}

export function AuthModal({ mode: initialMode, onClose, onAuthenticated }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isRegister = mode === 'register'

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setError(null)
    setSubmitting(true)

    try {
      const response = isRegister
        ? await register({ username, password })
        : await login({ username, password })
      setToken(response.token)
      onAuthenticated()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function switchMode() {
    setMode(isRegister ? 'login' : 'register')
    setError(null)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>{isRegister ? 'Create an account' : 'Welcome back'}</h2>

        <form onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />
          </label>

          <label className="form-field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              minLength={isRegister ? 8 : undefined}
              required
            />
          </label>

          {isRegister && (
            <label className="form-field">
              <span>Confirm password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Sign up' : 'Log in'}
          </button>
        </form>

        <p className="modal-switch">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" className="link-button" onClick={switchMode}>
            {isRegister ? 'Log in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}
