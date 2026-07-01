# Components, props & JSX

## Component & props shape (this repo's style)

Function components, `export default function ComponentName(...)`, props typed inline or
via a local `interface Props` (see `ProtectedRoute.tsx`'s `interface Props { children:
React.ReactNode; requiredRole?: 'admin' | 'client' }`). Not `React.FC<Props>` — plain
function typing is preferred (avoids `React.FC`'s implicit `children` typing quirks and
extra generic ceremony).

```tsx
interface Props {
  title: string
  onSelect?: (id: number) => void   // optional callback prop
  children: React.ReactNode
}

export default function Card({ title, onSelect, children }: Props) {
  return <div onClick={() => onSelect?.(1)}>{title}{children}</div>
}
```

Domain types (`Project`, `Milestone`, `User`) live in `frontend/src/types/<feature>.ts`
as plain `interface`s mirroring the backend's `*Response` Pydantic schemas field-for-field
(including `snake_case` names and `string | null` for nullable fields, matching JSON over
the wire exactly — see `src/types/project.ts`). Import with `import type { Project } from
'../types/project'` (type-only import) to keep it erased at build time.

## Conditional rendering

Ternary for either/or, `&&` for show/hide, early `return` for a whole different view (see
`ProtectedRoute.tsx`'s `if (loading) return <Spinner />`):
```tsx
{user ? <LoggedInMenu /> : <LoginLink />}
{error && <p className="text-red-500">{error}</p>}
```
Careful with `&&` on a falsy-but-not-boolean left side — `{count && <Badge count={count} />}`
renders the literal `0` to the DOM when `count` is `0` (React renders numbers, unlike
`false`/`null`/`undefined` which render nothing). Use `{count > 0 && <Badge .../>}` or
`{Boolean(count) && ...}` instead whenever the left side isn't already a real boolean.

## Lists & keys

`key` must be stable and unique among siblings — use a real ID (`project.id`), never the
array index, whenever the list can be reordered/filtered/have items inserted/removed (an
index key causes React to misattribute state to the wrong item across re-renders — a
classic source of "the wrong row's input lost focus" bugs). This repo already does this
correctly: `projects.map((project) => <Link key={project.id} ...>)`.

```tsx
{projects.map((project) => (
  <Link key={project.id} to={`/dashboard/projects/${project.id}`}>
    {project.title}
  </Link>
))}
```
`key` is not accessible as a prop inside the component it's set on — if the child needs
the same value, pass it again as a named prop.

## Composition & children

Prefer passing components as `children`/props over deeply nested conditional JSX inside
one component — this is how `ProtectedRoute`/`AdminRoute` wrap page components in
`App.tsx` (`<ProtectedRoute><ClientDashboard /></ProtectedRoute>`), keeping the
auth-gating logic in one small reusable component rather than duplicated inside every
page. When a component only conditionally renders its children based on some check
(auth, feature flag, permissions), that "wrapper that decides whether to render children"
shape is the pattern to reach for — don't inline the same check into every page instead.

## Fragments

`<>...</>` (shorthand for `<React.Fragment>`) groups multiple elements without adding an
extra DOM node — used throughout `Navbar.tsx` for the logged-in vs logged-out button
groups. Use the explicit `<React.Fragment key={...}>` form (not `<>`) only when you need
to put a `key` on the fragment itself (e.g. fragments returned from a `.map()`).

## Keeping render pure

A component's render body (everything before the `return`, and the JSX itself) must be a
pure calculation of its props/state — no mutating variables that existed before this
render, no side effects (network calls, `localStorage` writes, imperative navigation).
Side effects belong in **event handlers** (the common case — user clicked something) or,
as a last resort, `useEffect` (see `references/hooks-effects.md`) for things that must
happen because the component was *displayed*, not because of a specific interaction. This
repo has one violation worth knowing about as a pattern to avoid: `LoginPage.tsx` calls
`navigate(...)` directly in the component body on a specific condition — that's a side
effect during render and should be either a `useEffect` or, better, an early-return
`<Navigate to="..." replace />` element instead of the imperative `navigate()` call.
