---
name: react
description: |
  Build React function components with TypeScript: hooks (useState, useEffect, useContext,
  custom hooks), component composition, Context-based state, React Router routing with
  protected routes, data fetching, forms, and TypeScript typing conventions. Use when
  adding or modifying React components, pages, hooks, routing, or frontend state in a
  React + TypeScript + Vite project.
---

# React + TypeScript

React 19 function components with hooks, TypeScript strict mode, Tailwind for styling,
`react-router-dom` v7 in **declarative mode** (`BrowserRouter`/`Routes`/`Route` — not the
v7 data-router/framework mode; don't introduce `createBrowserRouter`/`RouterProvider`
here without discussing it first, since it's a different routing model).

## This repo's conventions

- Pages live in `frontend/src/pages/<Name>.tsx`, one route each, registered in `src/App.tsx`.
- Shared UI lives in `frontend/src/components/`.
- **All API calls go through `frontend/src/lib/api.ts`** (per `CLAUDE.md`) — never call
  `fetch()` directly in a component. `api.get/post/put/patch/delete` handle the auth
  header, base URL, and error translation.
- Global auth state is one `AuthContext` (`src/context/AuthContext.tsx`) exposing `{ user,
  loading, login, register, logout }` via a `useAuth()` hook — see `references/context-state.md`.
- Route guards are wrapper components (`ProtectedRoute`, `AdminRoute` in `src/components/`)
  that read `useAuth()` and render `<Navigate>` or the children — see
  `references/routing-architecture.md`.
- Data-fetching pages follow one recurring shape: `useState` for the data +
  `loading`/`error` state, `useEffect` to fetch on mount (or on a route param change),
  `api.get(...).then(setData).catch(...).finally(() => setLoading(false))` — see
  `references/data-fetching-forms.md`.
- Props are typed with an inline object type or `interface Props`, not `React.FC`. Event
  handlers use React's typed event types (`FormEvent`, `ChangeEvent<HTMLInputElement>`).

## Quick start: a new page

```tsx
// src/pages/WidgetList.tsx
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Widget } from '../types/widget'

export default function WidgetList() {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get<Widget[]>('/widgets/')
      .then(setWidgets)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-gray-400 text-sm">Loading...</p>
  if (error) return <p className="text-red-500 text-sm">{error}</p>

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {widgets.map((w) => <div key={w.id}>{w.name}</div>)}
    </div>
  )
}
```
Register it in `App.tsx` inside `<Routes>`, wrapped in `<ProtectedRoute>` if it needs auth.

## Navigation

- **Components, props, JSX**: composition, typing props/children, conditional rendering,
  lists/keys → [references/components-jsx.md](references/components-jsx.md)
- **Hooks & effects**: `useState`, `useEffect` (deps array, cleanup, the stale-response
  race condition), `useContext`, custom hooks, `useCallback`/`useMemo`/`useRef` →
  [references/hooks-effects.md](references/hooks-effects.md)
- **Context & state architecture**: Context API patterns grounded in `AuthContext.tsx`,
  lifting state up, when Context is (and isn't) the right tool →
  [references/context-state.md](references/context-state.md)
- **Routing**: `react-router-dom` v7 declarative mode, this repo's `ProtectedRoute`/
  `AdminRoute` pattern, route-level pages, navigation →
  [references/routing-architecture.md](references/routing-architecture.md)
- **Data fetching & forms**: this repo's `api.ts` + `useEffect` + loading/error pattern,
  controlled form inputs, submit handling → [references/data-fetching-forms.md](references/data-fetching-forms.md)
- **TypeScript with React**: typing props/events/children this repo's way, strict-mode
  patterns → [references/typescript-patterns.md](references/typescript-patterns.md)

## Non-obvious gotchas worth knowing up front

- **Side effects during render are a real bug, not just a lint nit.** `LoginPage.tsx`
  currently calls `navigate(...)` directly in the component body (not inside an event
  handler or `useEffect`) when a logged-in user hits `/login`. React's render function
  must be pure — calling an imperative side effect during render can double-fire under
  Strict Mode/concurrent rendering and is fragile. The correct fix is either a `useEffect`
  guarding the redirect, or (preferably here) rendering `<Navigate to="..." replace />`
  directly instead of calling the imperative `navigate()` function.
- **Effects that fetch based on a changing dependency need a stale-response guard.**
  `ProjectDetail.tsx`'s `useEffect(() => { ... }, [id])` has no `ignore` flag — if `id`
  changes quickly (fast client-side navigation between two project detail pages), an
  older, slower request could resolve after a newer one and overwrite it with stale data.
  React's own docs call this out explicitly as "a race condition" with the standard fix
  (`let ignore = false` + cleanup function setting it `true`, checked before `setState`).
  See `references/hooks-effects.md`.
- **`react-router-dom` is a separate package from React** — its docs live at
  reactrouter.com, not react.dev. This repo uses v7 in **declarative mode**; don't mix in
  v7's data-router APIs (`createBrowserRouter`, loaders/actions, `useLoaderData`) without
  discussing the migration — they're a different routing model, not a drop-in addition.
