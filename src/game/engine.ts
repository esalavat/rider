import {
  CHAPTERS,
  CLICK_BONUS_FLOOR,
  CLICK_BONUS_INCOME_SHARE,
  LEGACY_UPGRADES,
  MEMBER_AUTO_RATE,
  MEMBER_INCOME_BONUS,
  MEMBER_TIERS,
  MEMBER_WEIGHT_SOFT_CAP,
  RACKET_MILESTONE_BONUS,
  RACKET_MILESTONE_COST_MULTIPLIER,
  RACKET_MILESTONES,
  RACKETS,
} from "./data";
import type { ChapterDef, GameState, LegacyUpgradeDef, MemberTierDef, RacketDef } from "./types";

export const SAVE_KEY = "rider-mc-save-v1";
export const SAVE_VERSION = 4;

export function createNewGame(): GameState {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    clubName: "Iron Vultures MC",
    cash: 0,
    cashEarnedThisRun: 0,
    legendPoints: 0,
    prestigeCount: 0,
    rackets: Object.fromEntries(RACKETS.map((r) => [r.id, 0])),
    racketMilestones: Object.fromEntries(RACKETS.map((r) => [r.id, 0])),
    legacyLevels: Object.fromEntries(LEGACY_UPGRADES.map((u) => [u.id, 0])),
    memberTiers: Object.fromEntries(MEMBER_TIERS.map((t) => [t.id, 0])),
    memberProgress: Object.fromEntries(MEMBER_TIERS.map((t) => [t.id, 0])),
    unlockedChapters: Object.fromEntries(CHAPTERS.map((c) => [c.id, false])),
    createdAt: now,
    lastSave: now,
  };
}

export function racketOwned(state: GameState, racket: RacketDef): number {
  return state.rackets[racket.id] ?? 0;
}

export function racketCost(racket: RacketDef, owned: number): number {
  return Math.ceil(racket.baseCost * Math.pow(racket.costGrowth, owned));
}

export function racketIsUnlocked(state: GameState, racket: RacketDef): boolean {
  if (!racket.requires) return true;
  return (state.rackets[racket.requires] ?? 0) > 0;
}

export function racketIncomePerSecond(racket: RacketDef, owned: number): number {
  return owned * racket.baseIncome;
}

export function racketMilestoneLevel(state: GameState, racket: RacketDef): number {
  return state.racketMilestones[racket.id] ?? 0;
}

export function racketMilestoneMultiplier(
  state: GameState,
  racket: RacketDef
): number {
  return Math.pow(RACKET_MILESTONE_BONUS, racketMilestoneLevel(state, racket));
}

export function racketMilestoneNextThreshold(
  state: GameState,
  racket: RacketDef
): number | null {
  const level = racketMilestoneLevel(state, racket);
  return level < RACKET_MILESTONES.length ? RACKET_MILESTONES[level] : null;
}

export function racketMilestoneCost(
  state: GameState,
  racket: RacketDef
): number | null {
  const threshold = racketMilestoneNextThreshold(state, racket);
  if (threshold === null) return null;
  return Math.ceil(racketCost(racket, threshold) * RACKET_MILESTONE_COST_MULTIPLIER);
}

export function buyRacketMilestone(state: GameState, racket: RacketDef): GameState {
  const threshold = racketMilestoneNextThreshold(state, racket);
  if (threshold === null) return state;
  if (racketOwned(state, racket) < threshold) return state;
  const cost = racketMilestoneCost(state, racket);
  if (cost === null || state.cash < cost) return state;
  const level = racketMilestoneLevel(state, racket);
  return {
    ...state,
    cash: state.cash - cost,
    racketMilestones: { ...state.racketMilestones, [racket.id]: level + 1 },
  };
}

export function racketEffectiveIncomePerSecond(
  state: GameState,
  racket: RacketDef
): number {
  const owned = racketOwned(state, racket);
  return racketIncomePerSecond(racket, owned) * racketMilestoneMultiplier(state, racket);
}

export function legacyLevel(state: GameState, upgrade: LegacyUpgradeDef): number {
  return state.legacyLevels[upgrade.id] ?? 0;
}

export function legacyUpgradeCost(
  upgrade: LegacyUpgradeDef,
  level: number
): number {
  return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costGrowth, level));
}

function recruitCostDiscount(state: GameState): number {
  const reputationLevel = legacyLevel(
    state,
    LEGACY_UPGRADES.find((u) => u.id === "reputation")!
  );
  return Math.max(0.2, 1 - reputationLevel * 0.03);
}

export function memberTierOwned(state: GameState, tier: MemberTierDef): number {
  return state.memberTiers[tier.id] ?? 0;
}

export function memberTierGatingChapter(tier: MemberTierDef): ChapterDef | undefined {
  return CHAPTERS.find((c) => c.unlocksTier === tier.id);
}

export function memberTierIsUnlocked(
  state: GameState,
  tier: MemberTierDef
): boolean {
  const gatingChapter = memberTierGatingChapter(tier);
  if (!gatingChapter) return true;
  return !!state.unlockedChapters[gatingChapter.id];
}

export function memberTierCost(
  state: GameState,
  tier: MemberTierDef,
  ownedOverride?: number
): number {
  const owned = ownedOverride ?? memberTierOwned(state, tier);
  return Math.ceil(
    tier.baseCost * Math.pow(tier.costGrowth, owned) * recruitCostDiscount(state)
  );
}

export function totalMembers(state: GameState): number {
  return MEMBER_TIERS.reduce((sum, t) => sum + memberTierOwned(state, t), 0);
}

export function rawMemberWeight(state: GameState): number {
  return MEMBER_TIERS.reduce(
    (sum, t) => sum + memberTierOwned(state, t) * t.weight,
    0
  );
}

/**
 * Raw weight grows linearly (unchanged) below MEMBER_WEIGHT_SOFT_CAP, then
 * logarithmically above it. A burst-bought pile of a newly-unlocked
 * high-weight tier can push raw weight up by many hundreds or thousands in
 * seconds, but once past the cap each additional unit of weight buys a
 * rapidly shrinking sliver of effective weight — no cost curve has to fight
 * that alone anymore.
 */
export function effectiveMemberWeight(state: GameState): number {
  const raw = rawMemberWeight(state);
  if (raw <= MEMBER_WEIGHT_SOFT_CAP) return raw;
  const excess = raw - MEMBER_WEIGHT_SOFT_CAP;
  return (
    MEMBER_WEIGHT_SOFT_CAP +
    MEMBER_WEIGHT_SOFT_CAP * Math.log(1 + excess / MEMBER_WEIGHT_SOFT_CAP)
  );
}

export function memberMultiplier(state: GameState): number {
  return 1 + effectiveMemberWeight(state) * MEMBER_INCOME_BONUS;
}

export function memberRank(state: GameState): string {
  let rank = "Hangaround";
  for (const tier of MEMBER_TIERS) {
    if (memberTierOwned(state, tier) > 0) rank = tier.name;
  }
  return rank;
}

export function legacyIncomeMultiplier(state: GameState): number {
  let multiplier = 1;
  for (const upgrade of LEGACY_UPGRADES) {
    if (upgrade.effect !== "income") continue;
    const level = legacyLevel(state, upgrade);
    multiplier *= Math.pow(1 + upgrade.valuePerLevel, level);
  }
  return multiplier;
}

export function legacyClickMultiplier(state: GameState): number {
  let multiplier = 1;
  for (const upgrade of LEGACY_UPGRADES) {
    if (upgrade.effect !== "clickBonus") continue;
    const level = legacyLevel(state, upgrade);
    multiplier *= Math.pow(1 + upgrade.valuePerLevel, level);
  }
  return multiplier;
}

export function chapterUnlocked(state: GameState, chapter: ChapterDef): boolean {
  return !!state.unlockedChapters[chapter.id];
}

export function chapterIndex(chapter: ChapterDef): number {
  return CHAPTERS.findIndex((c) => c.id === chapter.id);
}

export function canUnlockChapter(state: GameState, chapter: ChapterDef): boolean {
  if (chapterUnlocked(state, chapter)) return false;
  const prev = CHAPTERS[chapterIndex(chapter) - 1];
  if (prev && !chapterUnlocked(state, prev)) return false;
  return state.legendPoints >= chapter.unlockCost;
}

export function unlockChapter(state: GameState, chapter: ChapterDef): GameState {
  if (!canUnlockChapter(state, chapter)) return state;
  return {
    ...state,
    legendPoints: state.legendPoints - chapter.unlockCost,
    unlockedChapters: { ...state.unlockedChapters, [chapter.id]: true },
  };
}

export function chapterBonusMultiplier(state: GameState): number {
  return (
    1 +
    CHAPTERS.reduce(
      (sum, chapter) => sum + (chapterUnlocked(state, chapter) ? chapter.bonus : 0),
      0
    )
  );
}

export function globalMultiplier(state: GameState): number {
  return (
    memberMultiplier(state) * legacyIncomeMultiplier(state) * chapterBonusMultiplier(state)
  );
}

export function totalIncomePerSecond(state: GameState): number {
  const base = RACKETS.reduce(
    (sum, racket) => sum + racketEffectiveIncomePerSecond(state, racket),
    0
  );
  return base * globalMultiplier(state);
}

export function clickBonus(state: GameState): number {
  const perSecond = totalIncomePerSecond(state);
  const base = Math.max(CLICK_BONUS_FLOOR, perSecond * CLICK_BONUS_INCOME_SHARE);
  return base * legacyClickMultiplier(state);
}

export function applyIncome(state: GameState, amount: number): GameState {
  return {
    ...state,
    cash: state.cash + amount,
    cashEarnedThisRun: state.cashEarnedThisRun + amount,
  };
}

export function buyRacket(state: GameState, racket: RacketDef): GameState {
  const owned = racketOwned(state, racket);
  const cost = racketCost(racket, owned);
  if (state.cash < cost) return state;
  return {
    ...state,
    cash: state.cash - cost,
    rackets: { ...state.rackets, [racket.id]: owned + 1 },
  };
}

export function maxAffordableRackets(
  state: GameState,
  racket: RacketDef
): number {
  let owned = racketOwned(state, racket);
  let cash = state.cash;
  let count = 0;
  while (count < 1000) {
    const cost = racketCost(racket, owned);
    if (cash < cost) break;
    cash -= cost;
    owned += 1;
    count += 1;
  }
  return count;
}

export function buyMaxRackets(state: GameState, racket: RacketDef): GameState {
  const count = maxAffordableRackets(state, racket);
  if (count === 0) return state;
  let cash = state.cash;
  let owned = racketOwned(state, racket);
  for (let i = 0; i < count; i++) {
    cash -= racketCost(racket, owned);
    owned += 1;
  }
  return {
    ...state,
    cash,
    rackets: { ...state.rackets, [racket.id]: owned },
  };
}

export function buyMemberTier(state: GameState, tier: MemberTierDef): GameState {
  const owned = memberTierOwned(state, tier);
  const cost = memberTierCost(state, tier, owned);
  if (state.cash < cost) return state;
  return {
    ...state,
    cash: state.cash - cost,
    memberTiers: { ...state.memberTiers, [tier.id]: owned + 1 },
  };
}

export function maxAffordableMemberTier(
  state: GameState,
  tier: MemberTierDef
): number {
  let owned = memberTierOwned(state, tier);
  let cash = state.cash;
  let count = 0;
  while (count < 1000) {
    const cost = memberTierCost(state, tier, owned);
    if (cash < cost) break;
    cash -= cost;
    owned += 1;
    count += 1;
  }
  return count;
}

export function buyMaxMemberTier(
  state: GameState,
  tier: MemberTierDef
): GameState {
  const count = maxAffordableMemberTier(state, tier);
  if (count === 0) return state;
  let cash = state.cash;
  let owned = memberTierOwned(state, tier);
  for (let i = 0; i < count; i++) {
    cash -= memberTierCost(state, tier, owned);
    owned += 1;
  }
  return {
    ...state,
    cash,
    memberTiers: { ...state.memberTiers, [tier.id]: owned },
  };
}

export function applyMemberAutoProduction(
  state: GameState,
  dtSeconds: number
): GameState {
  const nextTiers = { ...state.memberTiers };
  const nextProgress = { ...state.memberProgress };
  for (let i = MEMBER_TIERS.length - 1; i >= 1; i--) {
    const producer = MEMBER_TIERS[i];
    const target = MEMBER_TIERS[i - 1];
    const producerOwned = nextTiers[producer.id] ?? 0;
    if (producerOwned <= 0) continue;
    const progress =
      (nextProgress[target.id] ?? 0) + producerOwned * MEMBER_AUTO_RATE * dtSeconds;
    const wholeUnits = Math.floor(progress);
    if (wholeUnits > 0) {
      nextTiers[target.id] = (nextTiers[target.id] ?? 0) + wholeUnits;
    }
    nextProgress[target.id] = progress - wholeUnits;
  }
  return { ...state, memberTiers: nextTiers, memberProgress: nextProgress };
}

export function buyLegacyUpgrade(
  state: GameState,
  upgrade: LegacyUpgradeDef
): GameState {
  const level = legacyLevel(state, upgrade);
  if (level >= upgrade.maxLevel) return state;
  const cost = legacyUpgradeCost(upgrade, level);
  if (state.legendPoints < cost) return state;
  return {
    ...state,
    legendPoints: state.legendPoints - cost,
    legacyLevels: { ...state.legacyLevels, [upgrade.id]: level + 1 },
  };
}

export function legendPointsOnPrestige(state: GameState): number {
  return Math.floor(Math.sqrt(state.cashEarnedThisRun / 1_000_000));
}

export function canPrestige(state: GameState): boolean {
  return legendPointsOnPrestige(state) > 0;
}

export function startingCash(state: GameState): number {
  const nestEgg = LEGACY_UPGRADES.find((u) => u.id === "nest_egg")!;
  const level = legacyLevel(state, nestEgg);
  return level * nestEgg.valuePerLevel;
}

export function prestige(state: GameState): GameState {
  const earned = legendPointsOnPrestige(state);
  if (earned <= 0) return state;
  const next: GameState = {
    ...state,
    cash: 0,
    cashEarnedThisRun: 0,
    legendPoints: state.legendPoints + earned,
    prestigeCount: state.prestigeCount + 1,
    rackets: Object.fromEntries(RACKETS.map((r) => [r.id, 0])),
    memberTiers: Object.fromEntries(MEMBER_TIERS.map((t) => [t.id, 0])),
    memberProgress: Object.fromEntries(MEMBER_TIERS.map((t) => [t.id, 0])),
  };
  next.cash = startingCash(next);
  return next;
}

export function applyOfflineProgress(
  state: GameState,
  elapsedSeconds: number
): { state: GameState; earned: number } {
  const withMembers = applyMemberAutoProduction(state, elapsedSeconds);
  const income = totalIncomePerSecond(withMembers);
  const earned = income * elapsedSeconds;
  if (earned <= 0) return { state: withMembers, earned: 0 };
  return { state: applyIncome(withMembers, earned), earned };
}
