# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

RIDER — a browser-based idle/incremental game (React + TypeScript + Vite), deployed to GitHub Pages, with Capacitor scaffolding for a future iOS/Android app-store release. No backend; all game state lives in `localStorage`.

**Before making game design or balance changes, read [`GAME_DESIGN.md`](GAME_DESIGN.md)** — it's the source of truth for what the game's systems and numbers should be, and documents architecture conventions (pure `engine.ts`, data-driven content in `data.ts`, save-schema evolution pattern, UI layout-jank rules, number-formatting rules) that this codebase depends on. **For what's actually built vs. still planned, read [`ROADMAP.md`](ROADMAP.md)**, which also has a running log of notable past bugs and fixes worth knowing before touching layout or `formatNumber` again.

## Commands

```
npm run dev            # start Vite dev server
npm run build           # typecheck (tsc -b) + production build to dist/
npm run build:pages     # same, but with VITE_BASE_PATH=/rider/ (what CI uses for GitHub Pages)
npm run preview          # serve the last build locally
npm run lint             # oxlint
npm run cap:sync         # build + sync web assets into ios/ and android/
npm run cap:ios           # build + sync + open the iOS project in Xcode
npm run cap:android       # build + sync + open the Android project in Android Studio
```

No test suite exists yet (see `ROADMAP.md`).

## Architecture

```
src/game/
  types.ts        — GameState and all content-definition interfaces
  data.ts         — all tunable numbers/content (rackets, member tiers, legacy upgrades,
                    chapters). Edit here for balance/content changes, not in engine.ts.
  engine.ts        — pure functions only: (state, ...) -> new state. No side effects,
                    no React. This purity is what lets the game loop, offline-progress
                    calc, and save migration all reuse identical math.
  format.ts        — number/cash/duration formatting
  save.ts          — localStorage load/save + save-version migration
  useGameState.ts  — the only stateful/React file in game/: game loop
                    (requestAnimationFrame, throttled to 4/s — do not remove the
                    throttle, see GAME_DESIGN.md), autosave, offline progress on load,
                    wraps every engine.ts action as a component-facing callback
  useDevMode.ts    — hidden dev-tools toggle (tap the header logo 7x), stored under
                    its own localStorage key, separate from the save

src/components/
  App.tsx (at src root) — tab shell wiring useGameState to the active tab
  Header.tsx, TabNav.tsx, WelcomeBackModal.tsx — chrome shared across tabs
  RacketsTab.tsx, RecruitsTab.tsx, ChaptersTab.tsx, LegacyTab.tsx — one per tab,
    each maps over an array from data.ts rather than hardcoding items
  DevPanel.tsx       — hidden 5th tab (see useDevMode.ts above): skip time, grant
                        cash/Legend Points, for testing pacing without waiting
  icons.tsx          — every icon in the game, hand-coded flat-vector SVG
                        (viewBox 0 0 48 48, stroke=currentColor, no external assets)
```

New game content (a racket, a member tier, a legacy upgrade, a chapter) is added as a new entry in the relevant array in `data.ts` — the tab components and engine functions are written to be driven by these arrays, not to special-case individual items.

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`, which builds with `npm run build:pages` and deploys to GitHub Pages via `actions/deploy-pages`. `vite.config.ts`'s base path is controlled by the `VITE_BASE_PATH` env var so the same codebase serves correctly under `/rider/` on Pages and under `/` for local dev and Capacitor builds.
