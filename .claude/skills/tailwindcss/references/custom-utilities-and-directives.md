# Reusing styles & directives (Tailwind v3)

Table of contents:
- [Directives reference](#directives-reference)
- [Arbitrary values, properties, and variants](#arbitrary-values-properties-and-variants)
- [Reusing styles](#reusing-styles)
- [`@layer` and `@apply`](#layer-and-apply)
- [Adding custom utilities with `plugin()`](#adding-custom-utilities-with-plugin)
- [`@config`](#config)
- [Functions: `theme()` and `screen()`](#functions-theme-and-screen)

## Directives reference

| Directive | Purpose |
| --- | --- |
| `@tailwind base;` / `@tailwind components;` / `@tailwind utilities;` | Injects Tailwind's own CSS at each of the three injection points. All three go in your main CSS file, in this order. |
| `@layer base \| components \| utilities { ... }` | Adds hand-written CSS into one of Tailwind's layers, so ordering/specificity stays correct and (for `utilities`) so variants like `hover:`/`lg:` can be generated for your custom class. |
| `@apply utility-a utility-b;` | Inline existing utilities into a custom CSS class. |
| `@config "path/to/config.js";` | Point a specific CSS file at a non-default config file (monorepos, multiple sites sharing one build). |

## Arbitrary values, properties, and variants

- **Arbitrary value**: `top-[117px]`, `bg-[#bada55]`, `text-[22px]`,
  `before:content-['Festivus']`. Combines with modifiers: `top-[117px] lg:top-[344px]`.
- **CSS variable shorthand**: `fill-[var(--my-brand-color)]`.
- **Arbitrary property** (no existing utility covers this CSS property at all):
  `[mask-type:luminance]`, combinable with modifiers: `hover:[mask-type:alpha]`, or for
  ad-hoc CSS variables: `[--scroll-offset:56px] lg:[--scroll-offset:44px]`.
- **Arbitrary variant** (one-off selector modification, like a custom `hover:`/`md:`):
  `` lg:[&:nth-child(-n+3)]:hover:underline ``.
- **Whitespace in arbitrary values**: use `_` instead of a literal space —
  `grid-cols-[1fr_500px_2fr]`. Tailwind preserves underscores where a space would be
  invalid anyway (e.g. inside URLs: `bg-[url('/what_a_rush.png')]`). To force a literal
  underscore where a space is otherwise valid, escape it: `before:content-['hello\_world']`
  — and in JSX, wrap with `String.raw` since JSX strips the backslash:
  `` className={String.raw`before:content-['hello\_world']`} ``.
- **Resolving ambiguous namespaces**: `text-lg` (font-size) vs. `text-black` (color) share
  a namespace but Tailwind infers the right one from the value shape. Hint the type when a
  CSS variable is genuinely ambiguous: `text-[length:var(--my-var)]` vs.
  `text-[color:var(--my-var)]`.

## Reusing styles

When the same utility combination repeats across markup, Tailwind's own docs recommend
(in this order):

1. **A framework component/partial first** — a React component (`<Btn variant="primary" />`
   in `src/components/`) co-locates the class string with the one place it's defined and
   keeps markup and behavior together. This is the default choice in this repo (see
   CLAUDE.md — new frontend pages/components already live under `src/`).
2. **Editor tooling** (multi-cursor select, find-and-replace) for one-off repeated patterns
   that don't justify a component.
3. **`@apply`** (below) only for styling markup you don't control the JSX/template for
   (third-party widget output, CMS-rendered HTML, a `.select2-dropdown` from a JS plugin) —
   not as a general substitute for step 1. Overusing `@apply` re-creates hand-written CSS
   with an extra build step and loses the co-location benefit that makes utility classes
   easy to review in the first place.

## `@layer` and `@apply`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary {
    @apply rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500;
  }
}
```
- Putting custom CSS inside `@layer components` (rather than appending it after the
  `@tailwind` directives) lets Tailwind's own utilities still override it later in the
  cascade if you add a one-off utility class alongside `btn-primary` in markup — undoing
  that requires no `!important` hacks.
- Classes defined inside `@layer utilities` get variant support for free — Tailwind will
  generate `hover:`/`lg:`/etc. forms of them the same way it does for its own utilities:
  ```css
  @layer utilities {
    .content-auto {
      content-visibility: auto;
    }
  }
  ```
  This makes `lg:content-auto` and `hover:content-auto` valid without any extra config.
- `@apply` works with modifiers directly when applied inside a nested selector:
  ```css
  .btn-primary {
    @apply bg-blue-600;
    &:hover {
      @apply bg-blue-500;
    }
  }
  ```
  though in practice writing `hover:bg-blue-500` straight into the `@apply` line (as in the
  first example above) is simpler and equivalent.

## Adding custom utilities with `plugin()`

For utilities that need to accept dynamic values, respond to the theme, or ship as a
reusable package, register them in `tailwind.config.js` via the plugin API instead of CSS:

```js
// tailwind.config.js
import plugin from 'tailwindcss/plugin'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [
    plugin(function ({ addUtilities, addComponents, theme }) {
      addUtilities({
        '.content-auto': { 'content-visibility': 'auto' },
      })
      addComponents({
        '.card': {
          borderRadius: theme('borderRadius.lg'),
          padding: theme('spacing.6'),
          boxShadow: theme('boxShadow.md'),
        },
      })
    }),
  ],
}
```
- `addUtilities` — low-specificity, single-purpose classes meant to be combined (the
  utility-class philosophy). Prefer `@layer utilities` in CSS instead unless the utility
  needs `theme()` values computed in JS or ships as a shareable plugin.
- `addComponents` — higher-level, opinionated classes (like `.btn`, `.card`) meant to be
  used more like traditional CSS components; equivalent to `@layer components`.
- `matchUtilities` — for utilities that take an arbitrary value (`tab-2`, `tab-[10px]`),
  the plugin-API equivalent of a functional utility; needed only when packaging something
  as a reusable plugin rather than one-off project CSS.

## `@config`

```css
/* admin.css */
@config "../../tailwind.admin.config.js";
@tailwind base;
@tailwind components;
@tailwind utilities;
```
Points a specific CSS entry point at a non-default config file — useful only when a single
build processes multiple CSS files that each need a different `tailwind.config.js` (e.g. a
monorepo with separate marketing-site and admin-panel configs). Not needed for a project
with a single `tailwind.config.js`, like this repo.

## Functions: `theme()` and `screen()`

```css
.custom-card {
  margin-top: theme('spacing.24');
  color: theme('colors.gray.700');
}

@media screen(md) {
  .custom-card {
    margin-top: theme('spacing.32');
  }
}
```
- `theme('path.to.value')` — dot-notation lookup into `tailwind.config.js`'s `theme` object,
  usable in `@layer` blocks or any plain CSS. Append `/ <alpha>` for color opacity:
  `theme('colors.blue.500 / 75%')`.
- `screen('md')` — resolves a breakpoint name from `theme.screens` into the equivalent
  `(min-width: ...)` string, for use inside a raw `@media` at-rule when you need a media
  query that isn't a per-class variant (e.g. wrapping several rules at once).
