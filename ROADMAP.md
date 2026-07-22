# RIDER — Roadmap & Implementation Status

Tracks what's actually built vs. still planned, plus a running log of notable bugs and infra changes. For the target design each phase implements — formulas, numbers, conventions — see [`GAME_DESIGN.md`](GAME_DESIGN.md).

## Status summary

- Live at `https://esalavat.github.io/rider/`, auto-deployed from `main` via GitHub Actions
- Current save schema version: **4**
- All of Phase 1–3 below are shipped and live

## Phases

- ✅ **Initial build** — core loop: Rackets tab (idle income, buy/buy-max), flat member counter, Legacy/Prestige tab, comic-noir visual system, GitHub Pages deploy, Capacitor scaffolding
- ✅ **Layout jank fix** — see "Notable fixes" below
- ✅ **Phase 1 — Member producer chain** — replaced the flat member counter with the 7-tier auto-recruiting chain described in `GAME_DESIGN.md`
- ✅ **Phase 2 — Racket milestone upgrades** — 10/25/50/100/200-owned permanent doubling upgrades, persist across prestige
- ✅ **Number formatting fix** — see "Notable fixes" below
- ✅ **Phase 3 — Chapter map** — 8 collectible chapters with unique patches/bikes, Legend-Point-gated, permanent stacking bonus
- ✅ **Reset Progress button** — Legacy tab, confirm-gated, wired up the previously-unused `hardReset`
- ⬜ **Phase 4 — Racket bosses** (stretch goal, not started) — see design section in `GAME_DESIGN.md`. Blocked on the open question of whether an assigned boss leaves the general member pool.
- ⬜ **Quality-of-life shop** (not started) — auto-buy toggle, bulk-buy stepper, extended offline-cap tiers, compact-notation toggle. See `GAME_DESIGN.md` for the list.
- ⬜ **App store submission** (not started) — see "Before submitting to app stores" below
- ⬜ **Automated tests** (not started) — no test suite exists yet; `engine.ts`'s pure functions (cost curves, prestige math, milestone thresholds) are the natural first candidates since they need no mocking

## Save schema version history

| Version | Change |
|---|---|
| 1 | Initial shape: flat `members: number` counter |
| 2 | Member producer chain: `members` → `memberTiers: Record<id, number>` + `memberProgress`. Migration: old flat count becomes the starting `prospect` tier count. |
| 3 | Added `racketMilestones: Record<racketId, number>` for milestone upgrades |
| 4 | Added `unlockedChapters: Record<chapterId, boolean>` for the chapter map |

## Notable fixes (historical log)

**Layout jank from constant re-renders + conditional mounting.** The game loop originally called `setState` on every animation frame (~60/s), re-rendering the full card list constantly. Fixed by throttling ticks to 4/s. The remaining jank came from elements like the "Buy Max" button and per-item income line being conditionally *mounted* instead of always rendered with `visibility: hidden` — see the UI-conventions note in `GAME_DESIGN.md` for the rule this established going forward.

**Number formatting breaking at extreme magnitudes.** `formatNumber` divided by a capped suffix tier (`Dc` = 10^33) for anything larger, which for truly huge values (member tier costs after long sustained auto-production, e.g. 1e150+) produced a broken hybrid string like `"1.73e+189Dc"` — `Number.prototype.toFixed` itself falls back to exponential notation above 1e21, and the code was appending a suffix onto an already-exponential string. Separately, actual `Infinity` (from `Math.pow` overflow at very large owned counts) silently rendered as `"0"`, making unaffordable costs look free. Fixed by switching to clean scientific notation before doing any division, and rendering true `Infinity` as `"∞"`. Reproduced from a user-supplied screen recording; confirmed via extracted video frames before fixing.

## Before submitting to app stores

None of this is started:

- `capacitor.config.ts`'s `appId` is currently the placeholder `com.esalavat.rider` — confirm or change before submission
- App icons/splash screens are still Capacitor's defaults — need replacing via Capacitor's asset generator
- No code signing set up for either platform
- No store listings (screenshots, descriptions, privacy policy) started
- No analytics or crash reporting wired up
