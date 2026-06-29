import type { User } from './auth'
import type { Project } from './project'

export type { User, Project }

export interface ProjectCreatePayload {
  title: string
  description?: string
  status: string
  progress: number
  preview_url?: string
  notes?: string
  owner_id: number
  milestones: { title: string; is_done: boolean; sort_order: number }[]
}

export interface ProjectUpdatePayload {
  title?: string
  description?: string
  status?: string
  progress?: number
  preview_url?: string
  notes?: string
  owner_id?: number
}
