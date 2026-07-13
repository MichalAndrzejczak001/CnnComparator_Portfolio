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
