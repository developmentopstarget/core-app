# Routing (react-router-dom v7, declarative mode)

This repo uses v7's **declarative mode** (`BrowserRouter`/`Routes`/`Route`, plain
component tree) — not the newer data-router/framework mode (`createBrowserRouter`,
`RouterProvider`, route `loader`/`action` functions). `react-router-dom`'s docs live at
reactrouter.com (a separate project from react.dev) and cover all three modes — when
looking something up, prefer the "Declarative" mode examples/APIs over "Framework"/"Data"
ones, since loaders/actions don't apply to this app's routing setup.

## This repo's route tree (`App.tsx`)

```tsx
<BrowserRouter>
  <AuthProvider>
    <Navbar />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AuthProvider>
</BrowserRouter>
```
`<AuthProvider>` wraps `<Routes>` so every page can call `useAuth()`. A catch-all
`path="*"` redirects unknown URLs — always keep this last (route matching is order- and
specificity-based, but a catch-all should still be the final fallback route).

## Route guards: `ProtectedRoute` / `AdminRoute`

Both are thin wrapper components, not custom hooks or route-config properties — they
read auth state and either render `<Navigate>` (redirect, no history entry added when
`replace` is set) or the children:
```tsx
export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
```
The `loading` check matters: on a hard refresh, `AuthContext` doesn't know yet whether
the stored token is valid (it's mid-fetch to `/auth/me`) — rendering the guard's
redirect-or-children decision before that resolves would incorrectly bounce a genuinely
logged-in user to `/login` for a flash before the auth check completes. Always gate on
the same `loading` flag `AuthContext` exposes, not just `!user`, in any new route guard.

For a new role-gated route, follow the existing two-component pattern (`ProtectedRoute`
for "any authenticated user", `AdminRoute` for "admin only") rather than growing
`ProtectedRoute`'s `requiredRole` prop into a general-purpose permission system — add a
new dedicated wrapper component if a genuinely new access pattern is needed.

## Navigation

- **Declarative**: `<Link to="/path">` / `<NavLink to="/path">` (adds `active` styling
  hooks via a className/style callback receiving `{ isActive }` — see `Navbar.tsx`'s
  `linkClass` function) for anything the user clicks.
- **Imperative**: `useNavigate()` for programmatic redirects **triggered by an event
  handler or effect** — e.g. after a successful form submit, or in an auth guard's
  effect. `navigate(to, { replace: true })` swaps the current history entry instead of
  pushing a new one (used throughout this repo's redirects so "back" doesn't return to a
  redirect page that will just redirect again).

**Don't call `useNavigate()`'s returned function during render.** It's meant for use
"in response to user interactions or effects," per react-router's own docs — calling it
directly in a component body (as `LoginPage.tsx` currently does for its already-logged-in
redirect) is a side-effect-during-render bug (see `references/components-jsx.md`). Prefer
rendering `<Navigate to="..." replace />` directly from the render body instead — it's a
component, not an imperative call, so it's safe to return from render:
```tsx
// Prefer this over calling navigate() in the component body:
if (user) return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />
```

## Route params & query strings

`useParams<{ id: string }>()` reads dynamic segments (`:id` in the route path) — always
`string | undefined` even for a numeric-looking ID, since it comes from the URL; parse
with `Number(id)` and validate before using it as a number (`ProjectDetail.tsx` currently
passes the string `id` straight into the API URL template, which is fine for a path
segment, but don't assume it's already a valid number without checking if you need to do
numeric comparisons on it). `useSearchParams()` (not currently used in this repo) reads
`?key=value` query strings reactively, returning a `URLSearchParams`-like object plus a
setter.
