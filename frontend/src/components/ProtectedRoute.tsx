import { Navigate, Outlet } from 'react-router-dom'
import { getToken } from '../api/client'

export function ProtectedRoute() {
  if (!getToken()) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
