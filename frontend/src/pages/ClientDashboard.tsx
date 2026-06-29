import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import type { Project } from '../types/project'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function ClientDashboard() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Project[]>('/projects/')
      .then(setProjects)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load projects'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your projects</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name}.</p>
        </div>

        {loading && <p className="text-gray-400 text-sm">Loading projects...</p>}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {!loading && !error && projects.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">No projects yet. Your assigned projects will appear here.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/dashboard/projects/${project.id}`}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow block"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-semibold text-gray-900">{project.title}</h2>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {project.status}
                </span>
              </div>

              {project.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
              )}

              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{project.progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {project.milestones.length > 0 && (
                <p className="text-xs text-gray-400">
                  {project.milestones.filter((m) => m.is_done).length}/{project.milestones.length} milestones complete
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
