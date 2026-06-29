export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'client'
  created_at: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}
