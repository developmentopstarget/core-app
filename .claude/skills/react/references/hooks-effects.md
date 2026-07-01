# Hooks & effects

## `useState`

State updates are **asynchronous relative to the code that triggered them** — reading the
state variable immediately after calling its setter still gives the old value (the update
is scheduled, not applied in place). If a new state value depends on the previous one,
use the updater-function form, not the current variable:
```tsx
setCount((prev) => prev + 1)   // safe even if called multiple times before a re-render
setCount(count + 1)            // reads a possibly-stale `count` if called multiple times in one tick
```
React batches multiple `setState` calls within one event handler into a single re-render
— don't rely on intermediate renders happening between them.

## `useEffect` — this repo's most common hook after `useState`

Effects synchronize a component with something **outside** React (a network request,
`localStorage`, a subscription, `window` event listeners) — not for calculating derived
values (do that directly in the render body) and not for responding to a specific user
interaction (that's an event handler). This repo's two `AuthContext.tsx` effects are
correct examples: one syncs with `localStorage`/the API on mount, the other subscribes to
a `window` event and cleans up the listener.

**Dependency array rules**: list every reactive value (props, state, and anything derived
from them) that the effect body reads. Omitting one doesn't stop the bug, it just makes
the effect use a stale closure over the old value — this repo's `.eslintrc.cjs` enables
`plugin:react-hooks/recommended`, so the `exhaustive-deps` rule catches this; don't
disable it to silence a warning without understanding why the value is missing.

```tsx
useEffect(() => {
  if (!id) return
  api.get<Project>(`/projects/${id}`).then(setProject)...
}, [id])   // re-runs whenever `id` changes — correct, since the fetch depends on it
```

### The stale-response race condition (a real gap in this repo)

`ProjectDetail.tsx`'s effect fetches based on the `id` route param but has no guard
against out-of-order responses. If a user navigates quickly between two project detail
pages, the network response for the *first* `id` can resolve *after* the response for the
*second* `id` — overwriting the correct, newer data with stale data from the abandoned
request. React's own docs call this out by name ("race condition") with the standard fix:
```tsx
useEffect(() => {
  let ignore = false
  api.get<Project>(`/projects/${id}`).then((data) => {
    if (!ignore) setProject(data)
  })
  return () => { ignore = true }   // cleanup marks this effect's request as stale
}, [id])
```
Apply this pattern (or an `AbortController` passed into `fetch`) to any effect that fetches
based on a dependency that can change quickly — every page in this repo following the
"fetch in `useEffect` keyed on a route param" shape (`ProjectDetail.tsx`, and similar
future pages) is a candidate for this fix.

### Cleanup functions & Strict Mode double-invoke

In development, React (in `<StrictMode>`, enabled in this repo's `main.tsx`)
intentionally mounts every component **twice** — running setup, cleanup, then setup again
— specifically to surface effects that don't clean up properly. This is not a bug in
your code showing up as "the effect runs twice"; it's Strict Mode working as intended.
**Don't** reach for a `useRef` guard flag to suppress the double-run — that just hides the
underlying missing-cleanup bug in production too, where cleanup timing issues (double
subscriptions, double API calls that aren't idempotent) genuinely happen (e.g. rapid
mount/unmount from fast navigation). Fix the effect to be safe when repeated instead —
usually this means adding a proper cleanup function, which is exactly what the second
`AuthContext.tsx` effect does (`return () => window.removeEventListener(...)`).

## `useContext`

See `references/context-state.md` for the full pattern (`AuthContext.tsx`). The one hook
rule that bites here: `useContext` (like all hooks) must be called unconditionally at the
top of a component/hook — never inside an `if`, loop, or after an early `return`.

## Custom hooks

A function starting with `use` that calls other hooks — the mechanism for extracting
reusable stateful logic across components. `useAuth()` in this repo is the canonical
example: it wraps `useContext(AuthContext)` plus a null-check that throws a clear error
if called outside `<AuthProvider>`, rather than letting every call site silently receive
`null` and require its own guard:
```tsx
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```
If this repo's repeated `useState` + `useEffect(fetch)` + loading/error triplet (seen in
`ClientDashboard.tsx`, `ProjectDetail.tsx`) grows to more pages, extracting a shared
`useFetch<T>(path: string)` custom hook is a reasonable refactor — it centralizes the
stale-response fix above in one place instead of requiring every page to remember it.

## `useCallback` / `useMemo`

Both memoize a value/function across re-renders **as long as the dependency array is
unchanged** — not a performance guarantee by default, a correctness tool first: if a
function is passed as a prop to a memoized child (`memo(...)`) or into another hook's
dependency array (like `AuthContext.tsx`'s `fetchMe` being a dependency of its `useEffect`),
recreating it every render defeats memoization downstream or causes effects to re-run
every render. `AuthContext.tsx`'s use of `useCallback` for `fetchMe` (referenced in the
mount effect's dependency array) is exactly this pattern — without it, the effect would
see a "new" `fetchMe` function every render and re-run unnecessarily.

Don't reach for `useMemo`/`useCallback` reflexively on every value "for performance" —
only where a dependent effect/memoized child actually needs referential stability, or a
computation is measurably expensive. Overusing them adds complexity without benefit (and
with React 19's compiler becoming standard, much of this may be handled automatically —
check whether this project has the React Compiler enabled before assuming manual
memoization is still necessary for new code).

## `useRef`

For values that need to persist across renders **without** triggering a re-render when
changed (a DOM node reference, a mutable "instance variable" like a timer ID). Unlike
`useState`, mutating `.current` doesn't schedule a re-render — don't use `useRef` for
anything that should show up in the UI.
