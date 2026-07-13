import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { getToken } from './api/client'
import { DashboardPage } from './components/DashboardPage'
import { LandingPage } from './components/LandingPage'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import './App.css'

function LandingRoute() {
  const navigate = useNavigate()

  if (getToken()) {
    return <Navigate to="/dashboard" replace />
  }

  return <LandingPage onAuthenticated={() => navigate('/dashboard')} />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
