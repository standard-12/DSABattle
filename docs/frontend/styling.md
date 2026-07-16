# Frontend Styling

Tailwind CSS **v4** (CSS-first config — there is no `tailwind.config.*`).
Everything lives in [`Frontend/app/globals.css`](../../Frontend/app/globals.css).

## Token system

Design tokens are CSS custom properties in `oklch()`, mapped into Tailwind
via `@theme inline`:

```css
:root      { /* light theme */  --background: oklch(0.975 0.004 260); --primary: oklch(0.62 0.19 41); ... }
.dark      { /* dark theme  */  --background: oklch(0.12 0.01 260);  --primary: oklch(0.72 0.19 41); ... }

@theme inline {
  --color-background: var(--background);
  --color-primary: var(--primary);
  /* → enables bg-background, text-primary, border-border, ... */
}
```

Palette identity:

| Token | Role | Dark | Light |
|---|---|---|---|
| `--primary` | Ember orange — brand, CTAs, wins | `oklch(0.72 0.19 41)` | `oklch(0.62 0.19 41)` |
| `--accent` | Electric blue — secondary glow | `oklch(0.65 0.2 250)` | `oklch(0.55 0.18 250)` |
| `--background` | Near-black blue-tinted / off-white | `oklch(0.12 0.01 260)` | `oklch(0.975 0.004 260)` |

Chart and sidebar token sets exist for shadcn compatibility. `--radius:
0.625rem` drives `rounded-*` sizes.

## Dark / light mode

- `next-themes` with `attribute="class"`, `defaultTheme="dark"`,
  `enableSystem` — dark is the brand default; light and system-follow are
  opt-in via the navbar `ThemeToggle`.
- The dark variant is class-based:
  `@custom-variant dark (&:is(.dark *));`
- **Write components against tokens only** (`bg-background`, `text-foreground`,
  `text-muted-foreground`, `border-border`) — never hard-coded colors — and
  both themes work for free. The Living Graph canvas follows the same rule by
  reading the custom properties at runtime.
- Known exception: the Monaco editor uses its own theme and does not follow
  the site theme yet.

## Fonts

Loaded in `app/layout.tsx` via `next/font/google`:

- **Inter** → `--font-sans` (UI)
- **JetBrains Mono** → `--font-mono` (code, ratings, ids)

## Conventions

- Utility-first; component classes composed with `cn()`
  (`lib/utils.ts` — clsx + tailwind-merge) inside shadcn primitives.
- Translucent card surfaces (`bg-card/50` + `backdrop-blur-sm`) are used on
  the landing page so the animated canvas shows through.
- Base layer applies `border-border outline-ring/50` to `*` and
  `bg-background text-foreground` to `body`.
- `tw-animate-css` provides the animation utilities shadcn expects.
- A legacy `styles/globals.css` exists but the app imports `app/globals.css`;
  treat `styles/` as dead (see [../code-quality.md](../code-quality.md)).
