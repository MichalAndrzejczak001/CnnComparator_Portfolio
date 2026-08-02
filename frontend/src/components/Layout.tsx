import { Link, Outlet, useNavigate } from 'react-router-dom'
import { clearToken } from '../api/client'

export function Layout() {
  const navigate = useNavigate()

  function handleLogout() {
    clearToken()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link to="/dashboard" className="app-logo">
          CnnComparator
        </Link>
        <nav className="app-nav">
          <Link to="/dashboard/overview">Overview</Link>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/dashboard/compare">Compare</Link>
          <Link to="/dashboard/compare-selected">Compare selected</Link>
          <Link to="/dashboard/models">Models</Link>
          <Link to="/dashboard/datasets">Datasets</Link>
        </nav>
        <button type="button" className="btn-outline" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  )
}
