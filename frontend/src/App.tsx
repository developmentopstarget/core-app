import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AdminRoute from './components/AdminRoute'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import AdminDashboard from './pages/AdminDashboard'
import ClientDashboard from './pages/ClientDashboard'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import ProjectDetail from './pages/ProjectDetail'
import ProjectForm from './pages/ProjectForm'
import RegisterPage from './pages/RegisterPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Navbar />
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Client */}
          <Route
            path="/dashboard"
            element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>}
          />
          <Route
            path="/dashboard/projects/:id"
            element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>}
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={<AdminRoute><AdminDashboard /></AdminRoute>}
          />
          <Route
            path="/admin/projects/new"
            element={<AdminRoute><ProjectForm /></AdminRoute>}
          />
          <Route
            path="/admin/projects/:id/edit"
            element={<AdminRoute><ProjectForm /></AdminRoute>}
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
