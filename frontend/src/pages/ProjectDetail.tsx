import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { Project } from '../types/project'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-red-100 text-red-700',
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api
      .get<Project>(`/projects/${id}`)
      .then(setProject)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load project'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-red-500 text-sm">{error || 'Project not found'}</p>
          <Link to="/dashboard" className="text-indigo-600 text-sm hover:underline mt-2 inline-block">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    )
  }

  const doneMilestones = project.milestones.filter((m) => m.is_done).length

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link to="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            ← All projects
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <span
              className={`text-sm px-3 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[project.status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {project.status}
            </span>
          </div>

          {project.description && (
            <p className="text-gray-600 text-sm mb-4 leading-relaxed">{project.description}</p>
          )}

          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-2">
              <span>Overall progress</span>
              <span className="font-semibold text-gray-900">{project.progress}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>

          {project.preview_url && (
            <a
              href={project.preview_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:underline font-medium"
            >
              View preview
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* Milestones */}
        {project.milestones.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Milestones</h2>
              <span className="text-sm text-gray-400">{doneMilestones}/{project.milestones.length} done</span>
            </div>
            <ul className="space-y-3">
              {project.milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-3">
                  <span
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      m.is_done ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300'
                    }`}
                  >
                    {m.is_done && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className={`text-sm ${m.is_done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {m.title}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Notes */}
        {project.notes && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Notes</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}

        <p className="text-xs text-gray-400 text-right">
          Last updated {new Date(project.updated_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}
