import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from './api'

describe('api client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('accepts successful responses without a body', async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) })
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))

    await expect(api.delete('/admin/projects/1')).resolves.toBeUndefined()
  })

  it('returns JSON for successful responses', async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ status: 'ok' }, { status: 200 })),
    )

    await expect(api.get<{ status: string }>('/health')).resolves.toEqual({ status: 'ok' })
  })

  it('surfaces API error details', async () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn(() => null) })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ detail: 'Not found' }, { status: 404 })),
    )

    await expect(api.get('/missing')).rejects.toThrow('Not found')
  })
})
