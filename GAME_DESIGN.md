# RIDER — Game Design & Technical Reference

Living reference for continuing development across sessions. If a system changes, update this file in the same commit — it should never fall meaningfully behind `src/game/data.ts`, which is the actual source of truth for numbers.

## Pitch

Browser-based idle/incremental game. You start a motorcycle club in a garage and build it into a legendary MC empire — recruit members, run rackets, charter chapters across the country, and prestige ("Go Legendary") to compound power across runs. Sons of Anarchy meets Adventure Capitalist. Mobile-first, with infrastructure in place to ship to the iOS/Android app stores later.

Default club name: "Iron Vultures MC" (player-editable). Game title: "RIDER — Idle MC Empire". Repo/live site: `esalavat/rider`, deployed to `https://esalavat.github.io/rider/`.

## Tech stack

- React 19 + TypeScript + Vite, no backend — all state lives in `localStorage`
- [Capacitor](https://capacitorjs.com/) for the future iOS/Android app-store path (native project shells already generated and committed under `ios/` and `android/`)
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

**Convention: keep `engine.ts` pure.** Every action (`buyRacket`, `unlockChapter`, `prestige`, etc.) takes `(state, ...)` and returns a new `GameState`; it never mutates and never touches `localStorage`/DOM/timers. `useGameState.ts` is the only place side effects (timers, storage, React state) happen. This split is what makes offline-progress calculation, the game loop, and save migration all reuse the exact same math without drift — preserve it when adding systems.

**Convention: data-driven content.** New rackets/tiers/upgrades/chapters are added as new entries in the arrays in `data.ts`, not as new code paths. UI components map over these arrays. Keep it this way — it's what makes the four content tabs (Rackets/Recruits/Chapters/Legacy) each ~100 lines despite having 5-8 items each.

## Core systems (current numbers)

### Rackets (idle income)

8 rackets, unlocked in a chain (each requires the previous one owned ≥1): Scrap Yard → Chop Shop → Custom Paint Booth → The Rusty Chain (bar) → Ink & Iron Tattoo → Back Room Poker → Border Runs (smuggling) → Underground Speedway.

- Cost of the Nth unit: `baseCost * costGrowth^owned` (growth ranges 1.14–1.16 across rackets, rising with tier)
- Income: linear, `owned * baseIncome`, before multipliers
- "Buy Max" purchases as many as affordable in one tap (capped at 1000/click, `maxAffordableRackets`)
- **Milestone upgrades**: at 10/25/50/100/200 owned, a one-time cash purchase (`RACKET_MILESTONE_COST_MULTIPLIER = 10` × the cost of that Nth unit) permanently doubles that racket's output (`RACKET_MILESTONE_BONUS = 2`, stacks multiplicatively to x32 at all 5 bought). **Milestones persist across prestige** — stored in `state.racketMilestones`, separate from `state.rackets` (which resets on prestige).

### Members (producer chain)

Recruits tab is a tiered auto-producing chain, not a flat counter. Each tier is bought with cash; once you own ≥1 of a tier, it auto-recruits the tier below it at `MEMBER_AUTO_RATE = 0.1` (units/sec per unit owned), accumulated via a fractional `state.memberProgress` counter so partial production isn't lost between ticks.

| Tier | Weight | Base cost | Cost growth | Requires |
|---|---|---|---|---|
| Prospect | 1 | 50 | 1.13 | — |
| Patched Member | 20 | 2,000 | 1.14 | Prospect |
| Road Captain | 400 | 100,000 | 1.15 | Patched Member |
| Sergeant at Arms | 8,000 | 6,000,000 | 1.16 | Road Captain |
| Vice President | 160,000 | 400,000,000 | 1.17 | Sergeant at Arms |
| Chapter President | 3,200,000 | 32,000,000,000 | 1.18 | Vice President |
| National President | 64,000,000 | 3,000,000,000,000 | 1.19 | Chapter President |

Global income bonus from members = `1 + (Σ owned_i × weight_i) × MEMBER_INCOME_BONUS(0.02)`. Weights make higher tiers matter far more than raw headcount — this is deliberate so the auto-chain doesn't trivialize the multiplier via sheer Prospect volume.

Club "rank" shown in the header = the name of the highest tier with ≥1 owned (`memberRank` in engine.ts). Not gated by a headcount threshold — literally tied to which tier you've started.

**Known behavior, not a bug**: because production compounds (higher tiers feed lower ones continuously), owned counts for low tiers can reach tens of thousands after long sustained/idle play. This is expected lategame scale — see the number-formatting section below for how the UI handles it.

### Legacy / Prestige ("Go Legendary")

- Legend Points earned on prestige: `floor(sqrt(cashEarnedThisRun / 1_000_000))`
- Prestige resets: `cash`, `cashEarnedThisRun`, `rackets` (owned counts), `memberTiers`, `memberProgress`
- Prestige does **not** reset: `legendPoints` (+= earned), `racketMilestones`, `legacyLevels`, `unlockedChapters`, `prestigeCount` (+=1)
- Starting cash after a reset = `nest_egg` legacy upgrade level × 2500

Legacy upgrades (bought with Legend Points, cost = `baseCost * costGrowth^level`):

| Upgrade | Effect | Value/level | Base cost | Growth | Max level |
|---|---|---|---|---|---|
| Chrome Plating | +income | 10% | 1 | 1.35 | 50 |
| Street Reputation | −recruit cost | 3% (floor 20% of original) | 1 | 1.4 | 25 |
| Road Captain's Network | +income | 18% | 3 | 1.45 | 20 |
| Nest Egg | +starting cash | $2,500 | 2 | 1.3 | 30 |

### Chapters (collectible map)

8 chapters, unlocked with Legend Points (one-time, no repeat cost scaling), each granting a **permanent stacking** global income bonus and never reset by prestige (`state.unlockedChapters`). Each has a unique hand-drawn patch glyph (`ChapterPatchIcon` in icons.tsx) and a named bike, revealed on unlock. This is the game's collection/cosmetic layer as well as a progression system.

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

### Global income formula

```
totalIncomePerSecond =
  Σ racket_i(owned × baseIncome × milestoneMultiplier)
  × memberMultiplier          (1 + Σ member weight × 0.02)
  × legacyIncomeMultiplier    (product of "income"-effect legacy upgrades)
  × chapterBonusMultiplier    (1 + Σ unlocked chapter bonuses)
```

### Manual click ("Twist the Throttle")

`clickBonus = max(CLICK_BONUS_FLOOR(10), totalIncomePerSecond × CLICK_BONUS_INCOME_SHARE(0.6))` — matters a lot at zero income, negligible once rackets are running. Intentional: gives new players something to do before the idle loop takes over.

### Offline progress

On load, if the app was closed ≥5s: elapsed time is capped at `OFFLINE_CAP_SECONDS (4h)` and paid out at `OFFLINE_EFFICIENCY (50%)`. Member auto-production also runs for the same effective window (`applyMemberAutoProduction` inside `applyOfflineProgress`). Shown via `WelcomeBackModal`.

### Autosave

Every 10s (`AUTOSAVE_INTERVAL_MS`), plus on `visibilitychange` and `beforeunload`. Game loop ticks are throttled to 4/sec (`TICK_INTERVAL_SECONDS = 0.25`) — see "Layout jank" below for why.

## Save system

- Key: `rider-mc-save-v1` in `localStorage` (the `-v1` suffix is the storage key name and hasn't changed; the actual save *schema* version is the `version` field inside the JSON, currently **4**)
- `save.ts`'s `loadGame()` merges a fresh `createNewGame()` state with whatever's in storage, so new fields introduced by later versions default sanely for old saves
- **Pattern for adding a new persisted field**: add it to `GameState` in `types.ts`, initialize it in `createNewGame()` in `engine.ts`, add a merge line in `loadGame()` in `save.ts` (`newField: { ...fresh.newField, ...(parsed.newField ?? {}) }`), and bump `SAVE_VERSION`. Only write a real migration (like the v1→v2 flat-`members`-to-`memberTiers.prospect` conversion in `save.ts`) if old data needs reshaping rather than just defaulting.
- In-game reset: Legacy tab → "Reset Progress" button (confirm-gated via `window.confirm`), calls `hardReset()` from `useGameState`. This is the only in-app way to wipe a save — there's no cloud save/account system, so this is also how a player would test pacing from scratch on their phone without digging into browser settings.

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

## Mobile/layout lessons learned (read before touching CSS)

Two real bugs were found and fixed this way — worth knowing before changing layout or number formatting:

1. **Layout jank from constant re-renders + conditional mounting.** The game loop originally called `setState` every animation frame (~60/s), re-rendering the full card list constantly; throttled to 4/s (`TICK_INTERVAL_SECONDS`) fixed most of it. The rest came from elements like the "Buy Max" button and per-item income line being conditionally *mounted* (`{cond && <button>}`) instead of always rendered — appearing/disappearing changed card height and shifted everything below it. Fix: always render these elements, toggle `visibility: hidden` (not `display: none`) instead, so the layout box is always reserved. Stat pills also got fixed `min-width` + `font-variant-numeric: tabular-nums` so digit-count changes don't visibly resize them. **When adding any UI element that appears conditionally based on game state (a new unlock, a new threshold), default to this reserved-space pattern rather than conditional mounting.**

2. **Number formatting breaking at extreme magnitudes.** `formatNumber` used to divide by a capped suffix tier (`Dc` = 10^33) for anything larger, which for truly huge values (member tier costs after long sustained auto-production, e.g. 1e150+) produced a broken hybrid string like `"1.73e+189Dc"` because `Number.prototype.toFixed` itself falls back to exponential notation above 1e21 — the code was then appending a suffix onto an already-exponential string. Separately, actual `Infinity` (from `Math.pow` overflow at very large owned counts) silently rendered as `"0"` via a naive `!Number.isFinite` guard, making unaffordable costs look free. Fixed in `format.ts`: switch to clean scientific notation (`abs.toExponential(2)`) once the magnitude exceeds the suffix table *before* doing any division, and render true `Infinity` as `"∞"`. **If you touch `formatNumber`, test it against values beyond `Number.MAX_VALUE`-adjacent ranges (1e300+), not just "big" (1e6-1e15) ones** — idle games reach genuinely absurd numbers given enough playtime.

## Testing approach used in this repo

No automated test suite yet (small hobby project, `engine.ts`'s purity makes it easy to add one later if desired). Verification during development has been manual, via the `chrome-devtools` MCP tools against a local `vite preview` server:
- Take snapshots/screenshots at mobile viewport sizes (390×844 typical) after every UI change
- Check `list_console_messages` for errors after load and after interactions
- To test specific game states (large owned counts, high cash, specific unlocks) without waiting for real progression: `evaluate_script` to read/modify the `rider-mc-save-v1` localStorage key directly, then reload. **Gotcha**: the running page's own autosave (every 10s, plus on unload) will overwrite a manual localStorage edit if the tab that made the edit is still open — either monkey-patch `localStorage.setItem` to a no-op in that tab after writing, or open a fresh tab to the same origin to read the injected state cleanly.

## Deployment / infrastructure

- `vite.config.ts` reads `VITE_BASE_PATH` env var for the asset base path — empty/`/` for local dev and Capacitor builds, `/rider/` for the GitHub Pages build (`npm run build:pages`, also what CI runs)
- `.github/workflows/deploy.yml`: on push to `main`, builds and deploys to GitHub Pages via `actions/deploy-pages`. Pages source is set to "GitHub Actions" in repo settings (one-time setup, already done)
- Capacitor: `ios/` and `android/` native project shells already generated (`npx cap add ios/android`) and committed. `appId` is currently the placeholder `com.esalavat.rider` — **must be changed before any real app-store submission** if that's not the intended final bundle ID. App icons/splash screens are still Capacitor's defaults — need replacing via Capacitor's asset generator before submission. No signing, no store listing work started.
- `npm run cap:sync` / `cap:ios` / `cap:android` rebuild the web bundle and open the native IDE projects.

## Roadmap status

From the original feature-brainstorm session, in build order:

- ✅ **Phase 1 — Member producer chain**: done (see Members section above)
- ✅ **Phase 2 — Racket milestone upgrades**: done, persists across prestige
- ✅ **Phase 3 — Chapter map**: done, 8 chapters with unique patches/bikes
- ✅ **Reset Progress button**: done (Legacy tab)
- ⬜ **Phase 4 — Racket bosses (stretch)**: not built. Idea: let the player assign a top-tier member (Chapter President/National President) to a specific racket as a "boss" for a racket-only bonus, converting some of the passive multiplier into a placement decision. Would need: a new `state.racketBosses: Record<racketId, memberTierIdOrNull>` (or similar), UI on the racket cards to assign/unassign, and a rule for what happens to a boss's underlying member count (still counts toward the global multiplier weight, or removed from the pool while assigned — needs a decision).
- ⬜ **QoL shop ideas not yet built**: auto-buy-cheapest toggle, bulk-buy stepper (x1/x10/x25/Max) as an alternative to the single Max button, extended offline-cap tiers purchasable with cash/Legend Points, compact-number-notation toggle.
- ⬜ **Not started**: any real audio, achievements/milestones beyond racket/chapter unlocks, leaderboards or any server-backed feature (would require picking a backend — currently 100% local-only by design), app store submission itself (icons, signing, listings).

## Open questions / decisions for the next session

- Should Phase 4 (racket bosses) actually pull a member out of the general pool while assigned, or just tag one as a bonus multiplier without removing it from `effectiveMemberWeight`? Affects balance and needs a decision before implementing.
- Chapter bonuses are currently flat/uniform in *design intent* (5% each, 10% for the capstone) — if the game needs a steeper lategame curve, chapters are the most natural lever to scale up next since they're already the newest/least-tuned system.
- No unit tests exist. If the project grows, `engine.ts`'s pure functions are the obvious first candidates (cost curves, prestige math, milestone thresholds) since they need zero mocking.
