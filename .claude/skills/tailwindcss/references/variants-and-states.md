# Variants & states (Tailwind v3)

Table of contents:
- [Pseudo-classes](#pseudo-classes)
- [`group` and `peer`](#group-and-peer)
- [`has-*`](#has-)
- [Pseudo-elements](#pseudo-elements)
- [Responsive breakpoints](#responsive-breakpoints)
- [Dark mode](#dark-mode)
- [Accessibility states](#accessibility-states)

Every utility class can be made conditional by prefixing it with a variant:
`hover:bg-sky-700`. A variant-prefixed class does nothing outside its condition — it's not
a modification of a base rule, it's a separate rule that only ever applies under that
condition. Variants stack in any combination: `dark:md:hover:bg-fuchsia-600`.

## Pseudo-classes

- **Interaction**: `hover`, `focus`, `active`, plus `visited`, `focus-within`,
  `focus-visible`.
- **Structural position**: `first`, `last`, `odd`, `even`, `only-child`, `first-of-type`,
  `empty`. Numeric position: `nth-3`, `nth-last-5`, `nth-of-type-4`, `nth-last-of-type-6`,
  or arbitrary expressions like `nth-[2n+1_of_li]`.
- **Forms**: `required`, `invalid`, `disabled`, `read-only`, `indeterminate`, `checked`,
  `placeholder-shown`, `autofill`.
- **Target**: `target` (matches `:target`), `open` (matches `<details>`/`<dialog>` in the
  open state).

## `group` and `peer`

**`group`** — style an element based on a *parent's* state. Mark the parent `group`, use
`group-*` on the descendant:
```html
<a href="#" class="group ...">
  <h3 class="text-gray-900 group-hover:text-white ...">New project</h3>
</a>
```
Works with any pseudo-class (`group-focus`, `group-active`, `group-odd`).

For nested groups, name them to disambiguate: `group/item` on the parent,
`group-hover/item:visible` on the descendant. Arbitrary one-off group selectors:
`group-[.is-published]:block`.

**`peer`** — style an element based on a *sibling's* state (mark the sibling `peer`, target
with `peer-*` on a *later* sibling only — the underlying CSS subsequent-sibling combinator
can't select backwards):
```html
<input type="email" class="peer ..." />
<p class="invisible peer-invalid:visible ...">Please provide a valid email address.</p>
```
Named peers (`peer/draft`, `peer-checked/draft:text-sky-500`) and arbitrary peer selectors
work the same way as groups.

## `has-*`

Style an element based on descendant state or presence (v3.4+), without JS:
```html
<label class="has-[:checked]:bg-indigo-50 ...">
  <input type="checkbox" class="..." />
  ...
</label>
```
`has-[img]`, `has-checked`, and the combined forms `group-has-*`/`peer-has-*` (style based
on whether the *group*/*peer* element contains a match) work the same way.

## Pseudo-elements

- `before`/`after` — Tailwind auto-adds `content: ''` unless you set
  `before:content-['*']` explicitly. Prefer a real element (`<span>`) over `before`/`after`
  whenever the content needs to be selectable/in the DOM — reserve these for decoration only.
- `placeholder` — `placeholder:text-gray-500 placeholder:italic`.
- `file` — styles the button part of `<input type="file">`: `file:mr-4 file:rounded-full
  file:bg-violet-50 hover:file:bg-violet-100`.
- `marker` — list bullets/counters, inheritable so it can be set once on a parent `<ul>`.
- `selection` — active text selection color, inheritable; commonly set once on `<body>`.
- `first-line` / `first-letter`.
- `backdrop` — styles the backdrop of a native `<dialog>`.

## Responsive breakpoints

Mobile-first: unprefixed utilities apply everywhere; `md:*` applies **at `md` and above**,
not "only at medium." Style the mobile layout with unprefixed classes, then layer
`sm:`/`md:`/`lg:`/`xl:`/`2xl:` on top for larger screens — never reach for `sm:` to target
mobile. This matches the mobile-first convention in this repo's CLAUDE.md.

| Prefix | Min width | CSS |
| --- | --- | --- |
| `sm` | 640px | `@media (min-width: 640px)` |
| `md` | 768px | `@media (min-width: 768px)` |
| `lg` | 1024px | `@media (min-width: 1024px)` |
| `xl` | 1280px | `@media (min-width: 1280px)` |
| `2xl` | 1536px | `@media (min-width: 1536px)` |

- **Range**: stack a breakpoint with `max-*` to cap it — `md:max-xl:flex` only applies
  between `md` and `xl`. Each breakpoint has a corresponding `max-*` variant
  (`max-sm`…`max-2xl`) using `<` instead of `>=`.
- **Single breakpoint**: `md:max-lg:flex` — the range trick with the *next* breakpoint's
  `max-*`.
- **Custom breakpoints**: add to `theme.extend.screens` in `tailwind.config.js` (see
  `references/theme-and-customization.md`); replacing `theme.screens` directly removes the
  defaults entirely.
- **One-off breakpoint**: `min-[320px]:text-center`, `max-[600px]:bg-sky-300`.

## Dark mode

Default (`darkMode: 'media'`, or simply omitting the option): `dark:bg-gray-800` follows the
OS-level `prefers-color-scheme` media query — no markup changes required.

**Manual toggling** (a button the user clicks) requires switching the strategy in
`tailwind.config.js`:
```js
// tailwind.config.js
export default {
  darkMode: 'class',
  // ...
}
```
```html
<html class="dark">
  <body><div class="bg-white dark:bg-black">...</div></body>
</html>
```
Toggle the `dark` class on `<html>` from JS to flip themes.

**Custom selector** (e.g. a `data-` attribute instead of a class, v3.4.1+):
```js
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
}
```

For a light/dark/system three-way toggle, combine `darkMode: 'class'` with
`window.matchMedia('(prefers-color-scheme: dark)')` to detect system preference and
`localStorage` to persist an explicit user choice — sync it inline in `<head>` (before
paint) to avoid a flash of the wrong theme:

```js
document.documentElement.classList.toggle(
  "dark",
  localStorage.theme === "dark" ||
    (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches),
)
```

## Accessibility states

Prefer real semantics over ARIA-by-hand where possible, then layer variants on top:
- `focus-visible:` — ring/outline styles that only show for keyboard navigation, not mouse
  clicks (pairs well with `focus:outline-none focus-visible:ring-2` on custom buttons/links).
- `disabled:` — `disabled:opacity-50 disabled:cursor-not-allowed` on native
  `<button disabled>`/`<input disabled>` elements.
- `aria-*` arbitrary variants for ARIA-state-driven styling on components that manage their
  own open/selected/expanded state: `aria-expanded:rotate-180`,
  `aria-selected:bg-blue-100`, `aria-[current=page]:font-bold`.
- `sr-only` / `not-sr-only` — visually hide content while keeping it in the accessibility
  tree (skip links, form labels for icon-only inputs), and reveal it again at a breakpoint
  if needed (`sr-only md:not-sr-only`).
