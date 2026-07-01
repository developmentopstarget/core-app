# Theme & customization (Tailwind v3)

Table of contents:
- [What the theme object is](#what-the-theme-object-is)
- [Key sections](#key-sections)
- [Extending the default theme](#extending-the-default-theme)
- [Overriding part of the theme](#overriding-part-of-the-theme)
- [Referencing other theme values](#referencing-other-theme-values)
- [The `theme()` function](#the-theme-function)
- [Colors](#colors)

## What the theme object is

All design tokens live in the `theme` key of `tailwind.config.js` — a plain JS object, not
CSS:

```js
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mint: {
          500: '#3ab795',
        },
      },
    },
  },
  plugins: [],
}
```
This makes `bg-mint-500`, `text-mint-500`, `fill-mint-500`, etc. available immediately —
every color-consuming utility is generated from whatever keys exist under `theme.colors`.

## Key sections

| Key | Utility/variant classes |
| --- | --- |
| `colors` | `bg-red-500`, `text-sky-300`, etc. |
| `fontFamily` | `font-sans` |
| `fontSize` | `text-xl` |
| `fontWeight` | `font-bold` |
| `letterSpacing` | `tracking-wide` |
| `lineHeight` | `leading-tight` |
| `screens` | `sm:*`/`md:*`/etc. responsive variants |
| `spacing` | `px-4`, `max-h-16`, and the whole spacing scale |
| `borderRadius` | `rounded-sm` |
| `boxShadow` | `shadow-md` |
| `blur` | `blur-md` |
| `aspectRatio` | `aspect-video` |
| `transitionTimingFunction` | `ease-out` |
| `keyframes` / `animation` | `animate-spin` |

`screens` drives **variants**, not utility classes directly — see
`references/variants-and-states.md`.

## Extending the default theme

Nest new keys under `theme.extend` — this is additive, existing utilities are untouched:

```js
export default {
  theme: {
    extend: {
      fontFamily: {
        script: ['Great Vibes', 'cursive'],
      },
    },
  },
}
```
```html
<p class="font-script">...</p>
```
This is the right place for almost all customization — reach for top-level `theme.xxx`
(below) only when the entire default set for that key should disappear.

## Overriding part of the theme

Setting a key directly under `theme` (not `theme.extend`) **replaces the entire default
value for that key**, not just adds to it:

```js
export default {
  theme: {
    // Replaces Tailwind's whole default screens object — sm/md/lg/xl/2xl are all gone
    // unless redefined here.
    screens: {
      tablet: '640px',
      desktop: '1024px',
    },
    extend: {
      // Safe: adds to the existing color palette without removing anything.
      colors: {
        brand: '#5865f2',
      },
    },
  },
}
```
To override just one existing key of an object (e.g. redefine `md` without losing `sm`/
`lg`/etc.), do it inside `theme.extend` instead — it deep-merges:
```js
export default {
  theme: {
    extend: {
      screens: {
        md: '30rem', // overrides only `md`, other breakpoints untouched
      },
    },
  },
}
```

## Referencing other theme values

Any theme value can be a function that receives a `theme()` helper, letting one section
reference another (e.g. box shadows referencing the color palette):

```js
export default {
  theme: {
    extend: {
      boxShadow: {
        brand: (theme) => `0 4px 14px 0 ${theme('colors.blue.500')}33`,
      },
    },
  },
}
```

## The `theme()` function

Access theme values from custom CSS (in `@layer` blocks or plain CSS) with dot notation:

```css
.custom-card {
  margin-top: theme('spacing.24');
  color: theme('colors.gray.700');
  box-shadow: theme('boxShadow.lg');
}
```
For opacity-aware color lookups, append `/ <alpha>`: `theme('colors.blue.500 / 75%')`.
`theme()` does **not** work for breakpoints inside a bare `@media` block — use the
`screen()` function for that (see `references/custom-utilities-and-directives.md`).

## Colors

The default palette (slate, gray, zinc, neutral, stone, red, orange, amber, yellow, lime,
green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose) ships
with 11 steps each (50 lightest → 900/950 darkest), usable across every color-consuming
utility: `bg-*`, `text-*`, `decoration-*`, `border-*`, `outline-*`, `shadow-*`, `ring-*`,
`accent-*`, `caret-*`, `fill-*`, `stroke-*`.

- **Opacity**: `bg-black/75` (alpha channel to 75%); also `bg-pink-500/[71.37%]` for
  arbitrary alpha, or reference a CSS variable: `bg-cyan-400/[var(--my-alpha-value)]`.
- **Dark mode**: `dark:bg-gray-800` (see `references/variants-and-states.md`).
- **In custom CSS**: use the `theme()` function — `color: theme('colors.blue.500');` works
  anywhere, including nested `&:hover` inside `@layer components`.
- Full palette values live in `tailwindcss/colors` if you need to import them directly in
  JS (e.g. for a chart library): `import colors from 'tailwindcss/colors'`.
