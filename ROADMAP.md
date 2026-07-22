# RIDER — Roadmap & Implementation Status

Tracks what's actually built vs. still planned, plus a running log of notable bugs and infra changes. For the target design each phase implements — formulas, numbers, conventions — see [`GAME_DESIGN.md`](GAME_DESIGN.md).

## Status summary

- Live at `https://esalavat.github.io/rider/`, auto-deployed from `main` via GitHub Actions
- Current save schema version: **4**
- All of Phase 1–4 below are shipped and live
- **Next up: Phase 5 (racket bosses)**, on hold behind an open design question — see "Open design questions" in `GAME_DESIGN.md`

## Phases

- ✅ **Initial build** — core loop: Rackets tab (idle income, buy/buy-max), flat member counter, Legacy/Prestige tab, comic-noir visual system, GitHub Pages deploy, Capacitor scaffolding
- ✅ **Layout jank fix** — see "Notable fixes" below
- ✅ **Phase 1 — Member producer chain** — replaced the flat member counter with the 7-tier auto-recruiting chain described in `GAME_DESIGN.md`
- ✅ **Phase 2 — Racket milestone upgrades** — 10/25/50/100/200-owned permanent doubling upgrades, persist across prestige
- ✅ **Number formatting fix** — see "Notable fixes" below
- ✅ **Phase 3 — Chapter map** — 8 collectible chapters with unique patches/bikes, Legend-Point-gated, permanent stacking bonus
- ✅ **Reset Progress button** — Legacy tab, confirm-gated, wired up the previously-unused `hardReset`
- ✅ **Phase 4 — Recruit tier gating + chapter map rework**. Three parts, all in `GAME_DESIGN.md`'s Members and Chapters sections:
  1. Only Prospect is purchasable from the start; Patched Member and above show a locked teaser card ("Charter X to unlock") until their gating chapter is chartered. Chosen over fully hiding the row so the goal stays visible — see the now-resolved "Locked-tier UX" open question.
  2. Chapters 1-6 each unlock the next Member tier (via a new `ChapterDef.unlocksTier` field) instead of just granting a small income bonus; chapters 7-8 (no tier left to gate) carry bigger income bonuses (+20%/+30%) instead. Chapter costs were steepened here to a first-pass 10/75/500/4,000/30,000/200,000/1,000,000/5,000,000 LP curve, later revised much further — see the pacing-rebalance entry in "Notable fixes" below.
  3. `ChaptersTab.tsx`'s card grid is replaced with a fictional (non-real-world) SVG route map — a zigzag "road" of 8 city pins on an invented landmass, drawn from static `mapX`/`mapY`/`unlocksTier` fields added to `ChapterDef` in `data.ts`. Locked cities show a lock icon and "???"; tapping any pin opens an inline detail panel below the map with flavor, cost, and the Charter button.
  4. Added as part of this phase (not explicitly spelled out in the original plan, but required for the map's "no later city unlocks before an earlier one" invariant to actually hold): `canUnlockChapter` now also requires the previous chapter in the list to already be chartered, enforcing strictly-sequential unlocking.

  Motivated by a real pacing bug found in testing: a ~1-minute play session (a couple Patched Members, one Road Captain) left idle overnight produced a first-ever prestige worth 13,000,000 Legend Points, before the player had ever prestiged once. Root cause: the member producer chain compounds continuously and was reachable with almost no investment. See "Why tiers are chapter-gated" in `GAME_DESIGN.md` for the full writeup, including a residual-risk note for later stages.

  Implementation note: tier-gating and the map's unlocked/locked state are both derived from the existing `state.unlockedChapters` — no new persisted field, so this phase needed **no save version bump**, as anticipated. Member tier gating is now looked up via `memberTierGatingChapter()` in `engine.ts` (finds the chapter whose `unlocksTier` matches), replacing the old `MemberTierDef.requires` (previous-tier-owned) gate, which is removed. Verified via `chrome-devtools` MCP at 390×844: locked/unlocked states, sequential-unlock enforcement, and the map/detail-panel sync all behave as designed.
- ⬜ **Phase 5 — Racket bosses** (stretch goal, on hold behind Phase 4, not started) — see design section in `GAME_DESIGN.md`. Blocked on the open question of whether an assigned boss leaves the general member pool.
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

**Post-launch pacing rebalance: chapter/recruit economy exploded right after Chapter 1.** Real playtest of the shipped Phase 4 economy: the first prestige (~10 min, Prospect-only) felt right, but the moment Rust Hollow unlocked Patched Member (weight 20 vs. Prospect's 1), income exploded — 3 more chapters affordable within ~5 more minutes, then everything (all 8 chapters, every legacy upgrade maxed) within another ~5. This was the exact "residual risk" flagged in `GAME_DESIGN.md`'s "Why tiers are chapter-gated" section, just surfacing one tier earlier than expected. Fixed with three changes, all in `GAME_DESIGN.md`'s Members/Chapters/Legacy sections: every gated member tier's cost growth raised substantially (blunts how fast a freshly-unlocked tier can be bought in bulk), `MEMBER_INCOME_BONUS` cut from 0.02 to 0.008, and chapter costs re-curved to be much steeper *and deliberately accelerating* (each chapter costs a growing multiple of the last: 10x, 13x, 17x, 21x, 27x, 30x, 42x) rather than a flat ratio — explicit design goal is Chapter 1 as a ~20-30 minute earned milestone, each subsequent chapter costing meaningfully more, and the late chapters requiring a player to leave the game running and check back hours or a day later. Also added a permanently-unlocked "Clubhouse" home node to the route map (`CHAPTER_MAP_HOME` in `data.ts`) so the first charter purchase completes a visible road segment immediately, instead of requiring two purchases before any road lit up. These are still first-pass numbers for the new curve — real wall-clock pacing depends on individual play patterns, so expect another tuning pass once this version gets real playtime.

## Before submitting to app stores

None of this is started:

- `capacitor.config.ts`'s `appId` is currently the placeholder `com.esalavat.rider` — confirm or change before submission
- App icons/splash screens are still Capacitor's defaults — need replacing via Capacitor's asset generator
- No code signing set up for either platform
- No store listings (screenshots, descriptions, privacy policy) started
- No analytics or crash reporting wired up
