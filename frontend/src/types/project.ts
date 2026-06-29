export interface Milestone {
  id: number
  title: string
  is_done: boolean
  sort_order: number
}

export interface Project {
  id: number
  title: string
  description: string | null
  status: string
  progress: number
  preview_url: string | null
  notes: string | null
  owner_id: number
  created_at: string
  updated_at: string
  milestones: Milestone[]
}
