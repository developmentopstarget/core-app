# Content detection & config setup (Tailwind v3)

Table of contents:
- [Full Vite install](#full-vite-install)
- [How class detection works](#how-class-detection-works)
- [The `content` option](#the-content-option)
- [`transform` and `extract`](#transform-and-extract)
- [Safelisting utilities](#safelisting-utilities)
- [Other top-level config options](#other-top-level-config-options)

## Full Vite install

```bash
npm create vite@latest my-project
cd my-project
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
The `-p` flag scaffolds `postcss.config.js` alongside `tailwind.config.js`:
```js
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```
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
Import `index.css` once from your app entry point, then run the existing dev script
(`npm run dev`). There is no Vite plugin for v3 — PostCSS does the work, which is why both
config files exist. (This matches `frontend/tailwind.config.js` and
`frontend/postcss.config.js` in this repo.)

## How class detection works

Tailwind treats every file matched by `content` as **plain text** — it does not parse it as
JS/TS/JSX. It scans for tokens that look like class names, generates CSS only for the ones
that map to real utilities, and discards the rest. This is also what makes arbitrary values
like `bg-[#316ff6]` work: the literal token is visible in the source text, so it can be
matched even though it's not part of the theme.

The direct consequence: **string interpolation defeats detection.** `` `text-${color}-600` ``
never appears as a literal token anywhere in the file, so Tailwind generates nothing for it
and the class does nothing at runtime — not an error, just silently missing CSS. Always
build a lookup table of complete class-name strings instead:
```tsx
const colorVariants = {
  blue: "bg-blue-600 hover:bg-blue-500 text-white",
  red: "bg-red-500 hover:bg-red-400 text-white",
}
return <button className={colorVariants[color]}>...</button>
```
This is the single most common "why isn't my class applying" root cause — check for
`${...}` or `+` concatenation building up part of a class name before looking anywhere
else.

## The `content` option

```js
// tailwind.config.js
export default {
  content: [
    './pages/**/*.{html,js}',
    './components/**/*.{html,js}',
  ],
  // ...
}
```
- Glob patterns are resolved relative to the project root (where `tailwind.config.js` lives).
- Be as broad as necessary but no broader — an overly wide glob (e.g. including
  `node_modules`) slows down builds since every matched file is read and scanned on every
  rebuild.
- Include every file type that can contain class names: `.html`, `.jsx`/`.tsx`, `.vue`,
  `.svelte`, markdown/MDX if classes appear there, etc.
- A `node_modules` UI library that ships pre-built-with-Tailwind source (rather than
  precompiled CSS) needs its own glob entry added to `content`, same as any other source
  directory.

## `transform` and `extract`

For advanced cases, `content` entries can be objects instead of plain glob strings:
```js
export default {
  content: {
    files: ['./src/**/*.{html,js}'],
    transform: {
      // Runs on file contents before class extraction — useful for template
      // languages (Pug, Haml, Markdown) that escape characters Tailwind needs to see.
      html: (content) => content.replace(/&quot;/g, '"'),
    },
  },
}
```
`extract` (rarely needed) overrides *how* class-like tokens are pulled out of a given file
extension, for file types whose syntax confuses the default extractor.

## Safelisting utilities

Force generation of classes that don't literally appear in any scanned file (dynamic class
names sourced from a CMS/API response, classes assembled by a third-party lib you don't
control, etc.) with the `safelist` config option — **this lives in `tailwind.config.js`,
not in CSS**:

```js
// tailwind.config.js
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  safelist: [
    'bg-red-500',
    'text-3xl',
    {
      pattern: /bg-(red|green|blue)-(100|200|300)/,
      variants: ['hover', 'focus'],
    },
  ],
}
```
- Plain strings safelist exact class names.
- `{ pattern: /.../ }` safelists every class matching a regex (e.g. a full color ramp used
  only via server-driven class names); add `variants: [...]` to also generate
  `hover:`/`focus:`/etc. forms of every matched class.
- Prefer a static lookup table in code (see above) over `safelist` whenever possible —
  `safelist` bypasses the whole point of content scanning (shipping only the CSS you use)
  and is easy to forget to prune later.

## Other top-level config options

These live alongside `content`/`theme`/`plugins` in `tailwind.config.js`:
- `darkMode: 'media' | 'class' | ['class', selector]` — see
  `references/variants-and-states.md`.
- `important: true` (or `important: '#app'`) — makes every utility `!important` (or scoped
  under a selector), useful when Tailwind's output has to override another framework's CSS.
- `prefix: 'tw-'` — prefixes every generated utility class (`tw-bg-red-500`) to avoid
  collisions when introducing Tailwind into an existing codebase with conflicting class
  names.
- `separator: '_'` — changes the character between a variant and the utility (default `:`),
  rarely needed outside templating languages where `:` is reserved syntax.
- `corePlugins: { preflight: false }` — disable specific built-in utility/base-style
  plugins, most commonly `preflight` (Tailwind's CSS reset) when integrating into a page
  that already has its own reset.
