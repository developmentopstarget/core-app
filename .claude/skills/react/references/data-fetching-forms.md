# Data fetching & forms

## This repo's data-fetching shape

Every page that loads data from the API follows the same triplet: `data` state (typed to
the API response shape from `src/types/`), `loading` (starts `true`, `false` in a
`.finally()`), `error` (starts `''`, set from a caught error's message):
```tsx
const [projects, setProjects] = useState<Project[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

useEffect(() => {
  api
    .get<Project[]>('/projects/')
    .then(setProjects)
    .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load projects'))
    .finally(() => setLoading(false))
}, [])
```
`catch((e: unknown) => ...)` with the `e instanceof Error` narrowing is the repo-wide
convention for turning a caught error into a display string — `api.ts`'s `request()`
always throws a real `Error` with a `.message` already extracted from the API's error
body, so this pattern reliably gets a useful message.

**For an effect keyed on something that can change quickly (a route param, a search
query), add the stale-response guard** described in `references/hooks-effects.md` — don't
copy the plain (unguarded) mount-only version of this pattern onto an effect with a
non-empty dependency array without also adding the `ignore` flag.

## Loading multiple requests together

`ProjectForm.tsx`'s edit mode needs both the current user list and (if editing) the
existing project before rendering the form — collect the promises and `Promise.all()`
them rather than nesting `.then()` chains or firing a second effect that depends on the
first's result:
```tsx
useEffect(() => {
  const requests: Promise<unknown>[] = [api.get<User[]>('/admin/users').then(setUsers)]
  if (isEdit && id) {
    requests.push(api.get<Project>(`/projects/${id}`).then((p) => { /* populate fields */ }))
  }
  Promise.all(requests)
    .catch((err: unknown) => setError(...))
    .finally(() => setLoading(false))
}, [id, isEdit])
```
This keeps a single `loading`/`error` pair covering the whole page instead of juggling
one per request.

## Forms: controlled inputs

Every input is controlled — its `value` comes from state, `onChange` updates that state:
```tsx
<input
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  className="..."
/>
```
`onChange`'s event is inferred by TypeScript from the JSX element type; no need to
annotate it explicitly on inline handlers like this (only needed when extracting the
handler to a named function — see `references/typescript-patterns.md`).

## Form submission

```tsx
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  setError('')
  setSubmitting(true)
  try {
    await login(email, password)
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Login failed')
  } finally {
    setSubmitting(false)
  }
}
```
`e.preventDefault()` first (stop the browser's native form-submit navigation), a
`submitting` boolean disabling the submit button + swapping its label — prevents
double-submission from an impatient double-click and gives the user feedback. Follow this
exact shape (`preventDefault` → clear previous error → set submitting → try/catch/finally)
for every new form in this repo.

## Dynamic list fields (repeatable form sections)

`ProjectForm.tsx`'s milestone list demonstrates the pattern for an add/remove-able array
of sub-fields within one form — always update via the functional `setState` form to avoid
stale-closure bugs when adding based on the previous array's length:
```tsx
const addMilestone = () =>
  setMilestones((prev) => [...prev, { title: '', is_done: false, sort_order: prev.length }])

const removeMilestone = (index: number) =>
  setMilestones((prev) => prev.filter((_, i) => i !== index))

const updateMilestone = (index: number, patch: Partial<MilestoneField>) =>
  setMilestones((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)))
```
Never mutate the array/objects in place (`milestones[i].title = ...; setMilestones(milestones)`)
— React compares state by reference to decide whether to re-render, and won't detect an
in-place mutation as a change.

## Error boundaries

None of this repo's pages currently use a React error boundary — thrown errors inside a
component's render (as opposed to caught promise rejections, which this repo already
handles via the `try/catch`/`.catch()` patterns above) would currently crash to a blank
white screen. If a page renders data in a way that can throw synchronously (e.g. calling
a method on a value that turned out to be `null` despite the type saying otherwise), wrap
the route tree (or a specific risky subtree) in an error boundary component to show a
fallback UI instead of a blank crash — React itself doesn't provide a built-in error
boundary component/hook, it must be a class component implementing
`static getDerivedStateFromError`/`componentDidCatch`, or a small well-maintained library
(e.g. `react-error-boundary`) wrapping that pattern.
