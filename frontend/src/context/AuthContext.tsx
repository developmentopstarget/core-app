import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { User } from '../types/auth'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const me = await api.get<User>('/auth/me')
      setUser(me)
    } catch {
      localStorage.removeItem('access_token')
      setUser(null)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      fetchMe().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [fetchMe])

  const login = async (email: string, password: string) => {
    const data = await api.post<{ access_token: string }>('/auth/login', { email, password })
    localStorage.setItem('access_token', data.access_token)
    await fetchMe()
  }

  const register = async (name: string, email: string, password: string) => {
    await api.post('/auth/register', { name, email, password })
    await login(email, password)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
