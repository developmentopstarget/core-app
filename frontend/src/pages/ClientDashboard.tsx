import { useAuth } from '../context/AuthContext'

export default function ClientDashboard() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome, {user?.name}</h1>
        <p className="text-gray-500 text-sm">Your projects will appear here.</p>
      </div>
    </div>
  )
}
