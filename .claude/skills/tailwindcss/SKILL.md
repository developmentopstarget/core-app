---
name: tailwindcss
description: |
  Style UI with Tailwind CSS v3 utility classes, variants (hover/focus/dark/responsive),
  and JS-based theme customization via tailwind.config.js. Use when writing or reviewing
  className/class attributes, debugging classes that "aren't applying", picking colors/
  spacing, customizing the color palette/fonts/breakpoints, writing reusable class patterns,
  or setting up/troubleshooting Tailwind with Vite. Covers Tailwind v3 (JS config +
  tailwind.config.js + PostCSS) — not the v4 CSS-first model. This repo is pinned to
  Tailwind v3.4.4; do not introduce v4 syntax.
---

# Tailwind CSS v3

This repo runs **Tailwind v3.4.4**: `frontend/tailwind.config.js` (JS config with
`content`/`theme.extend`), `frontend/src/index.css` with `@tailwind base; @tailwind
components; @tailwind utilities;`, and PostCSS (`frontend/postcss.config.js`). Stay on this
setup — do not introduce Tailwind v4 syntax (`@theme`, `@utility`, `@import "tailwindcss"`,
`@custom-variant`, `@tailwindcss/vite`) into this repo. Tailwind v4 should only be evaluated
in a separate, new project, not here.

## Quick start (v3 + Vite, matches this repo)

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
This generates `tailwind.config.js` and `postcss.config.js`. Point `content` at every file
that contains class names:
```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```
```css
/* src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```
Import that CSS file once (`main.tsx`), then `npm run dev`. No Vite plugin is needed — v3
runs through the standard PostCSS pipeline (`postcss.config.js` above).

## The mental model

Utility classes are single-purpose and composed directly in markup instead of writing
custom CSS classes:

```html
<div class="mx-auto flex max-w-sm items-center gap-x-4 rounded-xl bg-white p-6 shadow-lg dark:bg-slate-800">
```

**Variants are prefixes that make a utility conditional** — a class like `hover:bg-sky-700`
does *nothing* unless hovered; it never carries both the default and hover styles the way a
hand-written CSS class would. Variants stack: `dark:md:hover:bg-fuchsia-600`.

- **State**: `hover:`, `focus:`, `active:`, `disabled:`, `first:`, `has-[...]:` → see
  `references/variants-and-states.md`
- **Responsive (mobile-first)**: unprefixed = all sizes, `md:*` = "at `md` breakpoint and
  up," not "on medium screens only." Style mobile with unprefixed classes first, then layer
  `sm:`/`md:`/`lg:` overrides — this matches the mobile-first convention already in this
  repo's CLAUDE.md. `md:max-lg:*` targets a range. Full breakpoint table in
  `references/variants-and-states.md`.
- **Dark mode**: default strategy follows `prefers-color-scheme` automatically. Toggling via
  a class (`<html class="dark">`) requires setting `darkMode: 'class'` in
  `tailwind.config.js` — see `references/variants-and-states.md`.

## Arbitrary values and composition

One-off values that don't belong in the theme use square brackets: `bg-[#316ff6]`,
`top-[117px]`, `grid-cols-[24rem_2.5rem_minmax(0,1fr)]`. Multiple classes can compose onto
one CSS property (e.g. `blur-sm grayscale` both feed the `filter` property) — this is how
Tailwind avoids one utility per property combination. Full arbitrary-value syntax and
whitespace escaping in `references/custom-utilities-and-directives.md`.

## The #1 bug: dynamically constructed class names

Tailwind scans source files as **plain text** looking for complete class-name tokens — it
does not evaluate template literals or string concatenation. This means:

```tsx
// BROKEN: `bg-${color}-600` is never a literal token Tailwind can see, so no CSS is
// generated for it and the class silently does nothing at runtime.
function Button({ color }: { color: string }) {
  return <button className={`bg-${color}-600 hover:bg-${color}-500`}>...</button>
}
```

```tsx
// CORRECT: map to complete, statically-greppable class names.
function Button({ color }: { color: 'blue' | 'red' }) {
  const variants = {
    blue: 'bg-blue-600 hover:bg-blue-500',
    red: 'bg-red-600 hover:bg-red-500',
  }
  return <button className={variants[color]}>...</button>
}
```

If a class you expect to exist isn't in the compiled CSS, this is the first thing to check
— search the component for any `${...}` or `+` building up part of a class name. Details on
the `content` glob, `safelist`, and how scanning works in
`references/content-detection-and-setup.md`.

## Conflicting classes

When two classes target the same CSS property (`class="grid flex"`), whichever rule appears
later in Tailwind's generated stylesheet wins — not whichever appears later in the `class`
attribute. Never rely on ordering; use conditional logic to only emit one of them. To force
a single utility regardless of specificity, append `!` (e.g. `bg-red-500!` — v3.4+) or set
`important: true` in `tailwind.config.js` to make every utility `!important`.

## Navigation

- **Theme & design tokens**: `theme.extend` vs. overriding a key vs. fully replacing the
  default theme, colors, spacing, `fontFamily`, `screens`, the `theme()` function →
  [references/theme-and-customization.md](references/theme-and-customization.md)
- **Variants & states**: full pseudo-class/pseudo-element list, `group`/`peer` (incl. named
  and arbitrary), `has-*`, responsive breakpoints and ranges, dark-mode strategies →
  [references/variants-and-states.md](references/variants-and-states.md)
- **Reusing styles & directives**: `@apply`, `@layer`, extracting components vs. `@apply`,
  the `plugin()` API for custom utilities/components, `@config`, `theme()`/`screen()`
  functions, arbitrary values/properties/variants →
  [references/custom-utilities-and-directives.md](references/custom-utilities-and-directives.md)
- **Content detection & config setup**: full `content` glob syntax, how class scanning
  works, `safelist`, `transform`/`extract`, `darkMode`/`prefix`/`separator`/`important`
  config options →
  [references/content-detection-and-setup.md](references/content-detection-and-setup.md)
