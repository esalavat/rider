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

**Tier access is gated by Chapters, not open from the start.** Only Prospect is purchasable in a fresh game. Every tier above it stays locked until its gating chapter is chartered — see the Chapters section below for the unlock mapping and the pacing bug this fixes. This replaces the tier's old `requires: <tier below>` (must own ≥1 of the previous tier) gate, which was far too weak to prevent runaway early growth.

| Tier | Weight | Base cost | Cost growth | Unlocked by |
|---|---|---|---|---|
| Prospect | 1 | 50 | 1.13 | available from the start |
| Patched Member | 20 | 2,000 | 1.14 | Chapter 1 — Rust Hollow |
| Road Captain | 400 | 100,000 | 1.15 | Chapter 2 — Salt Flats |
| Sergeant at Arms | 8,000 | 6,000,000 | 1.16 | Chapter 3 — Pine Ridge |
| Vice President | 160,000 | 400,000,000 | 1.17 | Chapter 4 — Bayou Crossing |
| Chapter President | 3,200,000 | 32,000,000,000 | 1.18 | Chapter 5 — Copper Canyon |
| National President | 64,000,000 | 3,000,000,000,000 | 1.19 | Chapter 6 — Steel Harbor |

Global income bonus from members = `1 + (Σ owned_i × weight_i) × 0.02`. Weights make higher tiers matter far more than raw headcount — deliberate, so the auto-chain doesn't trivialize the multiplier via sheer Prospect volume.

Club "rank" shown in the header = the name of the highest tier with ≥1 owned. Not gated by a headcount threshold — tied to which tier you've started.

#### Why tiers are chapter-gated

Production compounds: a tier continuously feeds the one below it, and that lower tier's growth rate itself scales with how many of the tier above are owned. The chain is inherently exponential. Real playtesting found this blows up far too fast with no gate at all: a session with a handful of Patched Members and a single Road Captain, left idle overnight, came back with tens of thousands of Prospects and a **first-ever prestige worth 13,000,000 Legend Points** — despite well under a minute of actual play, and before the player had ever prestiged once. The chain itself isn't the problem; unrestricted *early* access to it was.

Gating Patched Member and above behind chapters means a new player can only grow Prospects (which have no producer above them, so no compounding) until they've earned a chapter's worth of Legend Points — which itself requires having actually played through a full prestige cycle. This doesn't remove the exponential compounding, it just delays when a player can reach it, and ties reaching it to a deliberate, earned decision instead of an accident of leaving a tab open.

**Residual risk to watch during playtesting**: the same runaway-overnight-growth pattern could in principle recur at a *later* stage — e.g., right after unlocking Sergeant at Arms, if left idle for the full offline cap. Gating slows the ramp but doesn't cap the compounding itself. If this resurfaces, the next lever is probably the offline cap/efficiency (`OFFLINE_CAP_SECONDS` / `OFFLINE_EFFICIENCY`) or a diminishing-returns curve on the auto-recruit rate at very large owned counts — not another gating layer.

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

### Chapters (progression map)

8 chapters, chartered with Legend Points (one-time, no repeat cost scaling). **Chapters are the primary long-term progression gate**: the first 6 each unlock the next Member tier (see the Members section above) — that's the real reward, not the income bonus. The last 2 have no tier left to unlock, so they carry a much bigger income bonus instead, as pure endgame payoff. All bonuses are permanent, stack, and are never reset by prestige.

| # | Chapter | Region | Unlocks | Cost (LP) | Bonus | Patch glyph | Accent |
|---|---|---|---|---|---|---|---|
| 1 | Rust Hollow | Rust Belt | Patched Member | 10 | +5% | gear | `#d9662b` (rust) |
| 2 | Salt Flats | Desert Southwest | Road Captain | 75 | +5% | sun | `#e4b243` (gold) |
| 3 | Pine Ridge | Pacific Northwest | Sergeant at Arms | 500 | +5% | pine | `#5a8a5a` |
| 4 | Bayou Crossing | Deep South | Vice President | 4,000 | +5% | moon | `#4a8a94` |
| 5 | Copper Canyon | Southwest Mesa | Chapter President | 30,000 | +5% | mesa | `#b5651d` |
| 6 | Steel Harbor | Coastal Port | National President | 200,000 | +5% | anchor | `#7d8c99` |
| 7 | Wildfire Mesa | High Desert Badlands | — (income only) | 1,000,000 | +20% | flame | `#a3222b` (blood) |
| 8 | Vulture's Rest | National Chapter | — (income only) | 5,000,000 | +30% | wings | `#8a5aa0` |

**These costs are a first-pass proposal, not final** — tune against actual Legend Point earn rates once tier-gating is implemented and playtested. The governing principle: each chapter's cost should scale roughly with the power of the tier it unlocks (tier weight jumps ~20x per step), so this curve is deliberately much steeper (~6-8x per chapter) than the old flat ~2.5x curve it replaces. Chapters 7-8 have no tier to gate, so their bonus was raised from the old flat +5%/+10% to +20%/+30% so they still feel worth their (very steep) cost.

All 8 chartered = permanent +75% global income, on top of unlocking the full Member tier chain.

#### Visual design: a fictional route map, not a card grid

Replace the current 2-column card grid with a hand-drawn SVG map: an invented landmass (**not** the real world or a recognizable US shape) showing all 8 chapters as city pins connected by roads, laid out as a single route matching the unlock order above (Rust Hollow → Salt Flats → ... → Vulture's Rest). This doubles as a visual progress indicator — the club's territory visibly spreads across the map as you play, reinforcing that chapters are a journey, not a shop list.

- **Locked city**: dim/greyed pin, name hidden or shown as "???"
- **Unlocked city**: full-color pin using the chapter's patch glyph and accent color, name and bike revealed
- **Road segments**: the route is strictly linear, so the road between city *i* and city *i+1* is greyed/dashed by default and becomes solid/colored the moment city *i+1* is chartered (city *i* is always already unlocked by construction — no case where a later city unlocks before an earlier one)
- Tapping a city opens a detail view (inline panel or modal — TBD at implementation time) with its flavor text, cost, what it unlocks, and the Charter button, so the map itself stays uncluttered and detail is on-demand
- Same constraints as the rest of the game's art: hand-coded SVG, no map/tile libraries, must stay usable at mobile widths (~390px)

This is the largest single piece of the recruit/chapter rework — expect it to be the most implementation-heavy item, likely wanting its own new component (replacing `ChaptersTab.tsx`'s current grid rendering) plus fixed city/road coordinate data in `data.ts`.

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

- **Chapter costs** (10 / 75 / 500 / 4,000 / 30,000 / 200,000 / 1,000,000 / 5,000,000 LP): first-pass numbers, not validated against real play. Needs tuning once tier-gating ships — see the Chapters section.
- **Locked-tier UX**: should a not-yet-unlocked Member tier be fully hidden (matches the current racket-unlock pattern), or shown as a visible "locked" teaser card naming which chapter unlocks it, to motivate progress toward that chapter? Product decision, not just a data one.
- **Map interaction**: should tapping a city on the chapter map open an inline detail panel or a modal? Decide at implementation time based on what fits the mobile layout best.
- **Racket bosses** (Phase 5, on hold behind the recruit/chapter rework): should an assigned boss be pulled out of the general member pool (reducing `effectiveMemberWeight`) while assigned, or just tagged as a bonus without being removed? Affects balance and needs a decision before implementing.
- No backend/server-side features are planned — leaderboards, cloud save, or accounts would all require picking a backend, which is a deliberate non-goal for now (100% local-only by design). Revisit only if there's a real reason to.
