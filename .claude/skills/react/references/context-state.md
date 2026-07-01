# Context & state architecture

## This repo's pattern: `AuthContext.tsx`

One Context per cross-cutting concern (here: auth), exported as a **provider component +
custom hook pair**, kept together in one module:
```tsx
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
  // ...state + effects...
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```
`createContext<AuthState | null>(null)` — typed with the real shape unioned with `null`,
default `null` — is the right pattern *because* it forces every consumer through
`useAuth()`, which throws immediately with a clear message if used outside `<AuthProvider>`,
rather than every call site needing its own `if (!ctx)` guard or silently working with a
wrong default value. Follow this exact shape for any new cross-cutting Context: typed
state interface, `| null` default, a throwing custom hook — don't export the raw Context
object for components to call `useContext` on directly.

`<AuthProvider>` wraps the whole app in `App.tsx` (inside `<BrowserRouter>`, outside
`<Routes>`) so every route/page can call `useAuth()`.

## When to reach for Context (and when not to)

Before adding a new Context, try — in order:
1. **Just pass props.** A handful of props through one or two levels is clearer than
   Context (data flow stays explicit, easier to trace).
2. **Restructure via `children`.** If a prop is threaded through several components that
   don't use it themselves (just forwarding it down), that's usually a sign to accept
   `children` instead and let the top-level component render the deeply-nested piece
   directly, cutting out the middle layers that were just passing it along.

Reach for Context when information is genuinely needed by many components at different
depths that don't have a close common ancestor worth threading props through — auth state
(this repo), theming, and app-wide routing state (which `react-router-dom` implements via
Context internally) are the canonical cases.

**Every value change on a Context re-renders every consumer**, no matter how deep. A
single `AuthContext` bundling `user` + `loading` + three functions means any consumer
reading only `logout` still re-renders when `user`/`loading` change. This repo's scale
doesn't make this a real problem, but if a new Context carries something that changes
frequently (e.g. a live counter) alongside something rarely-read, split them into two
separate Contexts rather than one bundled object, so a frequent update doesn't
re-render consumers that only care about the rarely-changing part.

## Lifting state up vs. Context

For state shared between a **small, nearby** set of components (e.g. a form's fields
shared between two sibling inputs), lift the state to their closest common parent and
pass it down as props — simpler to trace than Context, and the right first choice.
Context is for state needed by components with no reasonably-common nearby ancestor, or
genuinely global concerns (auth, theme). Don't reach for Context as a shortcut around
prop drilling for state that's actually local to one small subtree.

## Reducer + Context (only if state logic grows complex)

If a Context's state update logic grows into many related `setX` calls that must stay in
sync (this repo's `AuthContext` is still simple enough not to need this), combining
`useReducer` with Context centralizes the update logic into one reducer function instead
of scattering related state transitions across several `setState` calls in the provider.
Not currently needed here — `AuthContext.tsx`'s handful of independent `useState` calls
plus plain async functions is appropriately simple for its current scope. Don't introduce
a reducer preemptively; wait until the provider's `setState` calls actually become hard
to reason about together.
