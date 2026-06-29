import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? 'text-indigo-600 font-medium'
      : 'text-gray-600 hover:text-gray-900 transition-colors'

  const portalHref = user?.role === 'admin' ? '/admin' : '/dashboard'

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold text-gray-900 tracking-tight">
            MZ<span className="text-indigo-600">.</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/" end className={linkClass}>Home</NavLink>
            <NavLink to="/services" className={linkClass}>Services</NavLink>
            <NavLink to="/projects" className={linkClass}>Projects</NavLink>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-gray-500">{user.name}</span>
                <Link
                  to={portalHref}
                  className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Portal
                </Link>
                <button
                  onClick={logout}
                  className="text-sm bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
          <NavLink to="/" end className={linkClass} onClick={() => setOpen(false)}>Home</NavLink>
          <br />
          <NavLink to="/services" className={linkClass} onClick={() => setOpen(false)}>Services</NavLink>
          <br />
          <NavLink to="/projects" className={linkClass} onClick={() => setOpen(false)}>Projects</NavLink>
          <div className="pt-2 border-t border-gray-100 flex gap-3 flex-wrap">
            {user ? (
              <>
                <Link to={portalHref} className="text-sm text-gray-700 font-medium" onClick={() => setOpen(false)}>
                  Portal
                </Link>
                <button onClick={() => { logout(); setOpen(false) }} className="text-sm text-gray-600 font-medium">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm text-gray-600 font-medium" onClick={() => setOpen(false)}>Login</Link>
                <Link
                  to="/register"
                  className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium"
                  onClick={() => setOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
