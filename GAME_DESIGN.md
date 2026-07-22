# RIDER — Game Design

Source of truth for what the game **should be**: systems, formulas, target numbers, architecture conventions, and visual design. If a number here and the number in `src/game/data.ts` disagree, that's a bug — fix the code to match this doc, or update this doc if the design intentionally changed.

For what's actually **built vs. still planned**, see [`ROADMAP.md`](ROADMAP.md).

## Pitch

Browser-based idle/incremental game. You start a motorcycle club in a garage and build it into a legendary MC empire — recruit members, run rackets, charter chapters across the country, and prestige ("Go Legendary") to compound power across runs. Sons of Anarchy meets Adventure Capitalist. Mobile-first, with infrastructure in place to ship to the iOS/Android app stores later.

Default club name: "Iron Vultures MC" (player-editable). Game title: "RIDER — Idle MC Empire". Repo/live site: `esalavat/rider`, deployed to `https://esalavat.github.io/rider/`.

## Tech stack

- React 19 + TypeScript + Vite, no backend — all state lives in `localStorage`
- [Capacitor](https://capacitorjs.com/) for the future iOS/Android app-store path (native project shells generated under `ios/` and `android/`)
- GitHub Actions deploys `main` to GitHub Pages automatically (`.github/workflows/deploy.yml`)
- No external UI/icon libraries — every icon in `src/components/icons.tsx` is a hand-coded flat-vector SVG (viewBox `0 0 48 48`, `stroke=currentColor`, `strokeWidth 2.5`, `fill: none` by default) to keep the art style consistent and dependency-free

## Architecture

```
src/game/
  types.ts        — all TypeScript interfaces/types for game content and GameState
  data.ts         — ALL tunable numbers and content live here (rackets, member tiers,
                    legacy upgrades, chapters, misc constants). This is the file to
                    edit for balance changes or new content.
  engine.ts        — pure functions only: cost curves, income calc, buy/unlock actions,
                    prestige math. No side effects, no React, easy to reason about and
                    test in isolation. Takes GameState in, returns new GameState out.
  format.ts        — number/cash/duration formatting (handles the full range from "12"
                    to scientific notation to "∞")
  save.ts          — localStorage load/save + save-version migration
  useGameState.ts  — the only stateful/React-y file in game/: owns the game loop
                    (requestAnimationFrame, throttled), autosave, offline-progress-on-load,
                    and wraps every engine.ts action as a callback for components

src/components/
  App.tsx (at src root) — tab shell, wires useGameState's state+actions to the active tab
  Header.tsx        — sticky top bar: club name (editable), rank, cash/income, members, legend points
  RacketsTab.tsx, RecruitsTab.tsx, ChaptersTab.tsx, LegacyTab.tsx — one component per tab
  TabNav.tsx         — bottom tab bar (mobile-first)
  WelcomeBackModal.tsx — offline-progress report shown on return
  icons.tsx          — every hand-coded SVG icon in the game
```

### Conventions to preserve

**Keep `engine.ts` pure.** Every action (`buyRacket`, `unlockChapter`, `prestige`, etc.) takes `(state, ...)` and returns a new `GameState`; it never mutates and never touches `localStorage`/DOM/timers. `useGameState.ts` is the only place side effects (timers, storage, React state) happen. This split is what makes offline-progress calculation, the game loop, and save migration all reuse the exact same math without drift.

**Data-driven content.** New rackets/tiers/upgrades/chapters are added as new entries in the arrays in `data.ts`, not as new code paths. UI components map over these arrays. This is what keeps the four content tabs (Rackets/Recruits/Chapters/Legacy) each ~100 lines despite having 5-8 items apiece.

**Save schema evolution.** To add a new persisted field: add it to `GameState` in `types.ts`, initialize it in `createNewGame()` in `engine.ts`, add a merge line in `loadGame()` in `save.ts` (`newField: { ...fresh.newField, ...(parsed.newField ?? {}) }`), and bump `SAVE_VERSION`. Only write a real migration (reshaping old data, like converting the old flat `members` count into `memberTiers.prospect`) when defaulting isn't enough.

**UI elements must reserve layout space, not conditionally mount.** Anything that appears/disappears based on game state (a newly-affordable button, a milestone indicator) should always render and toggle `visibility: hidden` rather than being conditionally mounted (`{cond && <x/>}`). Conditional mounting changes element height, which shifts everything below it — this caused a real, visible layout-jank bug (see `ROADMAP.md`). Stat/number displays should also use `font-variant-numeric: tabular-nums` and a fixed `min-width` where the digit count can change.

**Numbers must degrade gracefully at arbitrary magnitude.** This is an idle game — values can exceed `Number.MAX_VALUE` after enough sustained play. `formatNumber` (in `format.ts`) must switch to scientific notation before doing any division-based suffix math, and must render true `Infinity` as `"∞"`, never silently as `"0"`. Test any change to `formatNumber` against values in the 1e300+ range, not just "big" (1e6–1e15) ones.

**Testing approach.** No automated test suite yet — `engine.ts`'s purity makes one easy to add later if desired. Verification during development is manual, via the `chrome-devtools` MCP tools against a local `vite preview` server: take snapshots/screenshots at mobile viewport sizes (390×844 typical), check `list_console_messages` for errors, and to test specific game states without waiting for real progression, use `evaluate_script` to read/modify the `rider-mc-save-v1` localStorage key directly, then reload. Gotcha: the running page's own autosave will overwrite a manual localStorage edit if the same tab is still open — monkey-patch `localStorage.setItem` to a no-op in that tab after writing, or open a fresh tab to read the injected state cleanly.

## Core systems

### Rackets (idle income)

8 rackets, unlocked in a chain (each requires the previous one owned ≥1): Scrap Yard → Chop Shop → Custom Paint Booth → The Rusty Chain (bar) → Ink & Iron Tattoo → Back Room Poker → Border Runs (smuggling) → Underground Speedway.

- Cost of the Nth unit: `baseCost * costGrowth^owned` (growth ranges 1.14–1.16 across rackets, rising with tier)
- Income: linear, `owned * baseIncome`, before multipliers
- "Buy Max" purchases as many as affordable in one tap (capped at 1000/click)
- **Milestone upgrades**: at 10/25/50/100/200 owned, a one-time cash purchase (10× the cost of that Nth unit) permanently doubles that racket's output (stacks multiplicatively to x32 at all 5 bought). **Milestones persist across prestige** — stored separately from racket ownership, which resets.

### Members (producer chain)

Recruits tab is a tiered auto-producing chain, not a flat counter. Each tier is bought with cash; once you own ≥1 of a tier, it auto-recruits the tier below it at a rate of 0.1 units/sec per unit owned, accumulated via a fractional progress counter so partial production isn't lost between ticks.

| Tier | Weight | Base cost | Cost growth | Requires |
|---|---|---|---|---|
| Prospect | 1 | 50 | 1.13 | — |
| Patched Member | 20 | 2,000 | 1.14 | Prospect |
| Road Captain | 400 | 100,000 | 1.15 | Patched Member |
| Sergeant at Arms | 8,000 | 6,000,000 | 1.16 | Road Captain |
| Vice President | 160,000 | 400,000,000 | 1.17 | Sergeant at Arms |
| Chapter President | 3,200,000 | 32,000,000,000 | 1.18 | Vice President |
| National President | 64,000,000 | 3,000,000,000,000 | 1.19 | Chapter President |

Global income bonus from members = `1 + (Σ owned_i × weight_i) × 0.02`. Weights make higher tiers matter far more than raw headcount — deliberate, so the auto-chain doesn't trivialize the multiplier via sheer Prospect volume.

Club "rank" shown in the header = the name of the highest tier with ≥1 owned. Not gated by a headcount threshold — tied to which tier you've started.

Because production compounds (higher tiers continuously feed lower ones), owned counts for low tiers are expected to reach tens of thousands after long sustained/idle play — this is intended lategame scale, not something to "fix" by capping.

### Legacy / Prestige ("Go Legendary")

- Legend Points earned on prestige: `floor(sqrt(cashEarnedThisRun / 1_000_000))`
- Prestige resets: cash, cash earned this run, racket ownership counts, member tier ownership/progress
- Prestige does **not** reset: Legend Points (they accumulate), racket milestones, legacy upgrade levels, unlocked chapters, prestige count
- Starting cash after a reset = `nest_egg` legacy upgrade level × 2500

Legacy upgrades (bought with Legend Points, cost = `baseCost * costGrowth^level`):

| Upgrade | Effect | Value/level | Base cost | Growth | Max level |
|---|---|---|---|---|---|
| Chrome Plating | +income | 10% | 1 | 1.35 | 50 |
| Street Reputation | −recruit cost | 3% (floor 20% of original) | 1 | 1.4 | 25 |
| Road Captain's Network | +income | 18% | 3 | 1.45 | 20 |
| Nest Egg | +starting cash | $2,500 | 2 | 1.3 | 30 |

### Chapters (collectible map)

8 chapters, unlocked with Legend Points (one-time, no repeat cost scaling), each granting a **permanent stacking** global income bonus and never reset by prestige. Each has a unique hand-drawn patch glyph and a named bike, revealed on unlock. This is the game's collection/cosmetic layer as well as a progression system.

| Chapter | Region | Cost (LP) | Bonus | Patch glyph | Accent |
|---|---|---|---|---|---|
| Rust Hollow | Rust Belt | 5 | +5% | gear | `#d9662b` (rust) |
| Salt Flats | Desert Southwest | 15 | +5% | sun | `#e4b243` (gold) |
| Pine Ridge | Pacific Northwest | 40 | +5% | pine | `#5a8a5a` |
| Bayou Crossing | Deep South | 100 | +5% | moon | `#4a8a94` |
| Copper Canyon | Southwest Mesa | 250 | +5% | mesa | `#b5651d` |
| Steel Harbor | Coastal Port | 600 | +5% | anchor | `#7d8c99` |
| Wildfire Mesa | High Desert Badlands | 1,500 | +5% | flame | `#a3222b` (blood) |
| Vulture's Rest | National Chapter | 4,000 | +10% | wings | `#8a5aa0` |

All 8 chartered = +40% permanent global income.

Chapter bonuses are intentionally flat/uniform (5% each, 10% for the capstone) for now — if the game needs a steeper lategame curve, chapters are the most natural lever to scale up, since they're the newest/least-tuned system.

### Global income formula

```
totalIncomePerSecond =
  Σ racket_i(owned × baseIncome × milestoneMultiplier)
  × memberMultiplier          (1 + Σ member weight × 0.02)
  × legacyIncomeMultiplier    (product of "income"-effect legacy upgrades)
  × chapterBonusMultiplier    (1 + Σ unlocked chapter bonuses)
```

### Manual click ("Twist the Throttle")

`clickBonus = max(10, totalIncomePerSecond × 0.6)` — matters a lot at zero income, negligible once rackets are running. Intentional: gives new players something to do before the idle loop takes over.

### Offline progress

On load, if the app was closed ≥5s: elapsed time is capped at 4 hours and paid out at 50% efficiency. Member auto-production also runs for the same effective window. Shown via a "welcome back" modal.

### Autosave

Every 10s, plus on tab-hide and page-unload. Game loop ticks are throttled to 4/sec — see the UI-conventions note above for why.

## Save system design

- Storage key: `rider-mc-save-v1` (this suffix is just the key name and hasn't changed; the actual save *schema* version is the `version` field inside the JSON — see `ROADMAP.md` for the current value and version history)
- `loadGame()` merges a fresh `createNewGame()` state with whatever's in storage, so new fields default sanely for old saves without an explicit migration in most cases
- In-game reset: Legacy tab → "Reset Progress" button (confirm-gated), the only in-app way to wipe a save — there's no cloud save/account system, so it's also how a player tests pacing from scratch on their phone without digging into browser settings

## Visual design system

Flat vector / comic-noir: dark asphalt background, chrome silver, rust orange, blood red, gold accents, bold black outlines, hard (non-blurred) drop-shadow "comic panel" borders. All defined as CSS custom properties in `src/index.css`:

```
--bg: #0b0b0d          --chrome: #cfd6dd       --rust: #d9662b
--bg-panel: #17171b    --chrome-dim: #8a909a   --rust-dark: #a84a1c
--bg-panel-alt: #1e1e24                        --blood: #a3222b
--bg-raised: #232329   --gold: #e4b243         --blood-dark: #711119
--ink: #050506         --text: #ecedf0
                        --text-dim: #a4a9b1
                        --success: #4caf6b
```

Fonts: Teko (display/numbers, condensed impactful) + Oswald (body), loaded via Google Fonts `<link>` in `index.html`. No local font files.

Chapter patches use a few additional muted accent colors *outside* this core palette (see table above) — deliberately contained to that one collectible-badge context rather than spreading through the app chrome.

## Deployment & infrastructure design

- `vite.config.ts` reads a `VITE_BASE_PATH` env var for the asset base path — empty/`/` for local dev and Capacitor builds, `/rider/` for the GitHub Pages build
- GitHub Actions deploys `main` to Pages via `actions/deploy-pages` on every push
- Capacitor's `ios/` and `android/` native project shells are committed to the repo so a future session can open and build them directly, rather than being generated on demand
- `npm run cap:sync` / `cap:ios` / `cap:android` rebuild the web bundle and open the native IDE projects

## Planned but unbuilt systems

These describe design intent for features not yet implemented — see `ROADMAP.md` for build status.

### Racket bosses

Let the player assign a top-tier member (Chapter President/National President) to a specific racket as a "boss" for a racket-only bonus, converting some of the passive multiplier into a placement decision. Needs a state field to track which member tier (if any) is assigned to each racket, UI on the racket cards to assign/unassign, and a design decision on whether an assigned boss is removed from the general member pool (and its weight) or just tagged as dual-purpose. Unresolved — see open questions below.

### Quality-of-life shop

Auto-buy-cheapest toggle, a bulk-buy stepper (x1/x10/x25/Max) as an alternative to the single Max button, extended offline-cap tiers purchasable with cash or Legend Points, a compact-number-notation toggle.

## Open design questions

- **Racket bosses**: should an assigned boss be pulled out of the general member pool (reducing `effectiveMemberWeight`) while assigned, or just tagged as a bonus without being removed? Affects balance and needs a decision before implementing.
- No backend/server-side features are planned — leaderboards, cloud save, or accounts would all require picking a backend, which is a deliberate non-goal for now (100% local-only by design). Revisit only if there's a real reason to.
