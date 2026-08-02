import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { getToken } from './api/client'
import { ComparePage } from './components/ComparePage'
import { CompareSelectedPage } from './components/CompareSelectedPage'
import { DashboardPage } from './components/DashboardPage'
import { DatasetsPage } from './components/DatasetsPage'
import { ExperimentDetailPage } from './components/ExperimentDetailPage'
import { LandingPage } from './components/LandingPage'
import { Layout } from './components/Layout'
import { ModelsPage } from './components/ModelsPage'
import { OverviewPage } from './components/OverviewPage'
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
            <Route path="/dashboard/overview" element={<OverviewPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/experiments/:id" element={<ExperimentDetailPage />} />
            <Route path="/dashboard/compare" element={<ComparePage />} />
            <Route path="/dashboard/compare-selected" element={<CompareSelectedPage />} />
            <Route path="/dashboard/models" element={<ModelsPage />} />
            <Route path="/dashboard/datasets" element={<DatasetsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
