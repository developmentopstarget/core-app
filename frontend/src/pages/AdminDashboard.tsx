import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Project } from '../types/project'
import type { User } from '../types/auth'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = () => {
    setError('')
    Promise.all([
      api.get<Project[]>('/admin/projects'),
      api.get<User[]>('/admin/users'),
    ])
      .then(([p, u]) => { setProjects(p); setUsers(u) })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load admin data')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const deleteProject = async (id: number) => {
    if (!window.confirm('Delete this project?')) return
    setDeleting(id)
    setError('')
    try {
      await api.delete(`/admin/projects/${id}`)
      setProjects((prev) => prev.filter((p) => p.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    } finally {
      setDeleting(null)
    }
  }

  const ownerName = (id: number) => users.find((u) => u.id === id)?.name ?? `#${id}`

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">{projects.length} projects · {users.length} users</p>
          </div>
          <Link
            to="/admin/projects/new"
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            + New project
          </Link>
        </div>

        {loading && <p className="text-gray-400 text-sm">Loading...</p>}
        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400 text-sm">No projects yet.</p>
          </div>
        )}

        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 flex-wrap"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h2 className="font-semibold text-gray-900 truncate">{project.title}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Owner: {ownerName(project.owner_id)} · {project.progress}% · {project.milestones.length} milestones
                </p>
              </div>

              <div className="w-32">
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${project.progress}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  to={`/admin/projects/${project.id}/edit`}
                  className="text-sm text-gray-600 hover:text-gray-900 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteProject(project.id)}
                  disabled={deleting === project.id}
                  className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deleting === project.id ? '...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Users section */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Users</h2>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                  {u.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
