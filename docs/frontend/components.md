# Frontend Components

Components are grouped by domain under `Frontend/components/`.

## Directory guide

| Folder | Contents |
|---|---|
| `ui/` | shadcn/ui primitives (button, card, dialog, slider, tabs, resizable, …). Generated; avoid hand-editing beyond theming |
| `home/` | Landing page: `navbar`, `hero-section`, `features-section`, `how-it-works-section`, `cta-section`, `footer`, `living-graph-background` |
| `auth/` | `login-form`, `signup-form`, `forgot-password-form`, `reset-password-form`, `logout-button` — thin forms over `hooks/auth/*` |
| `problems/` | `ProblemsList`, `ProblemCard`, `SearchBar`, `DifficultyFilter`, `ProblemDetail` |
| `workspace/` | The shared two-pane solving UI: `WorkspaceShell`, `ProblemPanel`, `EditorPane` |
| `editor/` | `CodeEditor` (Monaco), `LanguageSelector`, `RunSubmitButtons`, `OutputConsole`, `SolverWorkspace` (practice submit logic) |
| `battle/` | `BattleRoomClient`, `BattleWorkspace`, `BattleTimer` |
| root | Dashboard widgets: `navbar` (profile-aware), `stats-card`, `leaderboard-preview`, `recent-battles`, `start-battle-card`; `theme-provider`, `theme-toggle` |

## The workspace system (practice vs battle)

Both solving experiences compose the same shell so the UI stays identical:

```
WorkspaceShell(topBar, left, right)
├── left:  ProblemPanel (description, examples, constraints)
└── right:
    ├── practice: SolverWorkspace ──HTTP──▶ POST /api/submit
    └── battle:   BattleWorkspace ──WS───▶ battle_submit
```

- **`EditorPane`** owns the editor state: language (starter code from
  `lib/starter-code/`), code, custom stdin, Run (→ `/api/execute`) vs Submit
  (delegated up via `onSubmit`), and renders the verdict/`SubmissionView`
  (verdict, pass count, runtime/memory, compile output, gated stderr,
  failing-testcase index).
- **`SolverWorkspace`** (practice) POSTs to `/api/submit` and maps the JSON
  verdict into `SubmissionView`.
- **`BattleWorkspace`** receives `submit` from `useBattleSocket` — same
  signature, different transport. `BattleRoomClient` adds the battle chrome:
  live-connection dot, `BattleTimer` (from `battles.started_at`), opponent
  badge, and the `ResultStrip` state machine (in-progress → opponent-submitted
  → won/lost with rating delta → revisiting-ended-battle).

Editor note: `CodeEditor` imports `@monaco-editor/react` directly inside a
`"use client"` component (the library self-guards against SSR; the project's
own `.github/non-negotiable.md` prefers an explicit `dynamic(..., ssr: false)`
wrapper).

## Living Graph background

`components/home/living-graph-background.tsx` +
`lib/living-graph/engine.ts` — the animated landing-page backdrop.

- Pure Canvas 2D, zero dependencies. All tunables in the exported
  `GRAPH_CONFIG` object (node density, packet counts, search cadence,
  parallax factors).
- Six layers, back to front: ambient gradient light → far mesh → living graph
  (spring-driven nodes, distance-based edges recomputed per frame) → data
  packets riding edges → **search choreography** (a real BFS runs on the live
  graph; frontier rings pulse level-by-level, then the found path ignites;
  every 3rd event is a dual orange-vs-blue race) → depth dust.
- Reads theme colors from the CSS custom properties (`--primary`, `--accent`,
  `--foreground`) at runtime — resolved via a 1×1 canvas pixel readback so
  `oklch()` values work everywhere — and re-reads on theme flip.
- Built-in: DPR-aware sizing (capped at 2×), FPS-adaptive quality (drops far
  mesh + packet count under ~42 fps), pause on hidden tab,
  `prefers-reduced-motion` → single static frame, full listener cleanup on
  unmount.
- The React wrapper mounts it `fixed inset-0 -z-10` on the landing page only.

## Theming components

- `theme-provider.tsx` — re-export of `next-themes`' provider (configured in
  `app/layout.tsx`).
- `theme-toggle.tsx` — sun/moon icon button; renders a stable placeholder until
  mounted to avoid hydration mismatch. Present in the home navbar (desktop +
  mobile) and the dashboard navbar.

## Conventions

- Domain components: PascalCase filenames in feature folders (`ProblemCard.tsx`);
  home/dashboard components use kebab-case (`hero-section.tsx`) — both styles
  exist; match the folder you're in.
- Client components declare `"use client"` at the top; server components fetch
  data and pass plain serializable props.
- Icons come from `lucide-react` exclusively.
