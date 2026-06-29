import { useState, useEffect } from 'react'
import { api } from './lib/api'

type HealthStatus = 'checking' | 'ok' | 'error'

export default function App() {
  const [health, setHealth] = useState<HealthStatus>('checking')

  useEffect(() => {
    api.get<{ status: string }>('/health')
      .then(() => setHealth('ok'))
      .catch(() => setHealth('error'))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-screen-md mx-auto">
          <h1 className="text-lg font-semibold text-gray-900">core-app</h1>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-screen-md mx-auto space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-medium text-gray-700 mb-3">Backend Status</h2>
            <ApiStatus status={health} />
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-base font-medium text-gray-700 mb-2">Stack</h2>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Frontend — React + TypeScript + Vite + Tailwind</li>
              <li>Backend — FastAPI + Python</li>
              <li>API — REST JSON</li>
              <li>Database — PostgreSQL (future)</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}

function ApiStatus({ status }: { status: HealthStatus }) {
  if (status === 'checking') {
    return <p className="text-sm text-gray-400">Checking...</p>
  }
  if (status === 'ok') {
    return (
      <p className="text-sm font-medium text-green-600 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
        API reachable
      </p>
    )
  }
  return (
    <p className="text-sm font-medium text-red-500 flex items-center gap-1.5">
      <span className="inline-block w-2 h-2 rounded-full bg-red-400" />
      API not reachable — is the backend running?
    </p>
  )
}
