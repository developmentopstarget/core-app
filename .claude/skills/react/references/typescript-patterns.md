# TypeScript with React

`frontend/tsconfig.json` has `strict: true` — no implicit `any`, strict null checks are
on. Every new component/hook must type-check cleanly under strict mode; don't add `as any`
or `@ts-ignore` to work around a type error without understanding it first (per
`CLAUDE.md`: "No `any` types unless unavoidable and explicitly noted").

## Typing props

Plain function components with an inline object type or a local `interface Props` (see
`components-jsx.md`) — not `React.FC<Props>`. For a component whose only prop is
`children`, the minimal form is fine:
```tsx
export default function Layout({ children }: { children: React.ReactNode }) {
```
For anything with more than one or two props, a named `interface Props` reads better and
gives better hover/error messages:
```tsx
interface Props {
  children: React.ReactNode
  requiredRole?: 'admin' | 'client'   // string literal unions for closed sets of values
}
```
Mirror the backend's `Literal["admin", "client"]`-style closed sets with a TypeScript
union type on the frontend (as `ProtectedRoute.tsx` does with `'admin' | 'client'`) rather
than a bare `string` — this catches typos in role checks at compile time instead of
silently failing at runtime.

## Typing event handlers

Inline handlers get their event type inferred automatically from the JSX element — no
annotation needed:
```tsx
<input onChange={(e) => setEmail(e.target.value)} />
```
An **extracted, named** handler function needs an explicit event type, since there's no
JSX context to infer it from:
```tsx
const handleSubmit = async (e: FormEvent) => { e.preventDefault(); ... }
function handleChange(event: React.ChangeEvent<HTMLInputElement>) { setValue(event.target.value) }
```
Common event types: `FormEvent` (form submit), `ChangeEvent<HTMLInputElement>` (input
change), `MouseEvent<HTMLButtonElement>` (click). When unsure which type a given handler
prop expects, hover it in the editor — the inferred type from React's own types is
authoritative. For an event type not in React's common list, `React.SyntheticEvent` is
the base type every specific event type extends.

## Typing children

`React.ReactNode` (used throughout this repo — `ProtectedRoute`, `AdminRoute`) is the
broad, correct type for "anything renderable as children," including strings, numbers,
elements, fragments, arrays of those, and `null`/`undefined`/`boolean` (which render as
nothing). Don't type `children` as `JSX.Element` — that's narrower than what's actually
valid JSX and rejects legitimate cases like conditionally rendering `null` or a text node.

## Domain types mirror backend schemas

`src/types/<feature>.ts` interfaces are hand-written to match the backend's `*Response`
Pydantic schemas field-for-field, including nullable fields as `T | null` (matching JSON
`null`, not `T | undefined`) and keeping the wire format's field names as-is (this repo's
backend uses snake_case, and the frontend types do too — see `src/types/project.ts`'s
`preview_url`, `owner_id`, not camelCase). If a backend schema changes (see the
`pydantic`/`fastapi` skills), the corresponding frontend type must be updated by hand —
there's no code generation wiring these together in this repo, so a schema and its
frontend type can silently drift; when changing a backend response shape, always update
the matching `src/types/*.ts` interface in the same change.

## `import type`

Use `import type { Project } from '../types/project'` for type-only imports (already the
convention throughout this repo) — this guarantees the import is erased at build time and
makes it visually clear at the import site that nothing runtime-relevant is being pulled
in, distinct from `import { api } from '../lib/api'` (a real runtime value).
