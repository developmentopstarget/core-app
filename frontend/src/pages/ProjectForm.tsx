import { FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { User } from '../types/auth'
import type { Project, Milestone } from '../types/project'

interface MilestoneField {
  id?: number
  title: string
  is_done: boolean
  sort_order: number
}

export default function ProjectForm() {
  const { id } = useParams<{ id?: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()

  const [users, setUsers] = useState<User[]>([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('active')
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [ownerId, setOwnerId] = useState<number | ''>('')
  const [milestones, setMilestones] = useState<MilestoneField[]>([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api.get<User[]>('/admin/users').then(setUsers)
    if (isEdit && id) {
      api.get<Project>(`/projects/${id}`).then((p) => {
        setTitle(p.title)
        setDescription(p.description ?? '')
        setStatus(p.status)
        setProgress(p.progress)
        setPreviewUrl(p.preview_url ?? '')
        setNotes(p.notes ?? '')
        setOwnerId(p.owner_id)
        setMilestones(p.milestones.map((m: Milestone) => ({ id: m.id, title: m.title, is_done: m.is_done, sort_order: m.sort_order })))
      })
    }
  }, [id, isEdit])

  const addMilestone = () =>
    setMilestones((prev) => [...prev, { title: '', is_done: false, sort_order: prev.length }])

  const removeMilestone = (index: number) =>
    setMilestones((prev) => prev.filter((_, i) => i !== index))

  const updateMilestone = (index: number, field: keyof MilestoneField, value: string | boolean | number) =>
    setMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (ownerId === '') { setError('Please select an owner'); return }
    setError('')
    setSubmitting(true)
    try {
      if (isEdit) {
        await api.patch(`/admin/projects/${id}`, {
          title, description: description || null, status, progress,
          preview_url: previewUrl || null, notes: notes || null, owner_id: ownerId,
        })
      } else {
        await api.post('/admin/projects', {
          title, description: description || null, status, progress,
          preview_url: previewUrl || null, notes: notes || null,
          owner_id: ownerId,
          milestones: milestones.map((m, i) => ({ title: m.title, is_done: m.is_done, sort_order: i })),
        })
      }
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save project')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{isEdit ? 'Edit project' : 'New project'}</h1>

        <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Owner</label>
            <select value={ownerId} onChange={(e) => setOwnerId(Number(e.target.value))} required className={inputClass}>
              <option value="">Select a client...</option>
              {users.filter((u) => u.role === 'client').map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                {['active', 'paused', 'completed', 'cancelled'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Progress ({progress}%)</label>
              <input type="range" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="w-full mt-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Preview URL</label>
            <input type="url" value={previewUrl} onChange={(e) => setPreviewUrl(e.target.value)} className={inputClass} placeholder="https://..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputClass} />
          </div>

          {!isEdit && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Milestones</label>
                <button type="button" onClick={addMilestone} className="text-xs text-indigo-600 font-medium hover:underline">+ Add</button>
              </div>
              <div className="space-y-2">
                {milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={m.title}
                      onChange={(e) => updateMilestone(i, 'title', e.target.value)}
                      placeholder={`Milestone ${i + 1}`}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <input
                      type="checkbox"
                      checked={m.is_done}
                      onChange={(e) => updateMilestone(i, 'is_done', e.target.checked)}
                      className="w-4 h-4 accent-indigo-600"
                      title="Mark as done"
                    />
                    <button type="button" onClick={() => removeMilestone(i)} className="text-red-400 hover:text-red-600 text-sm px-1">✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create project'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
