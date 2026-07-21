import {
  CLICK_BONUS_FLOOR,
  CLICK_BONUS_INCOME_SHARE,
  LEGACY_UPGRADES,
  MEMBER_BASE_COST,
  MEMBER_COST_GROWTH,
  MEMBER_INCOME_BONUS,
  RACKETS,
} from "./data";
import type { GameState, LegacyUpgradeDef, RacketDef } from "./types";

export const SAVE_KEY = "rider-mc-save-v1";
export const SAVE_VERSION = 1;

export function createNewGame(): GameState {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    clubName: "Iron Vultures MC",
    cash: 0,
    cashEarnedThisRun: 0,
    members: 0,
    legendPoints: 0,
    prestigeCount: 0,
    rackets: Object.fromEntries(RACKETS.map((r) => [r.id, 0])),
    legacyLevels: Object.fromEntries(LEGACY_UPGRADES.map((u) => [u.id, 0])),
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

export function legacyLevel(state: GameState, upgrade: LegacyUpgradeDef): number {
  return state.legacyLevels[upgrade.id] ?? 0;
}

export function legacyUpgradeCost(
  upgrade: LegacyUpgradeDef,
  level: number
): number {
  return Math.ceil(upgrade.baseCost * Math.pow(upgrade.costGrowth, level));
}

export function memberCost(state: GameState): number {
  const reputationLevel = legacyLevel(
    state,
    LEGACY_UPGRADES.find((u) => u.id === "reputation")!
  );
  const discount = Math.max(0.2, 1 - reputationLevel * 0.03);
  return Math.ceil(
    MEMBER_BASE_COST * Math.pow(MEMBER_COST_GROWTH, state.members) * discount
  );
}

export function memberMultiplier(state: GameState): number {
  return 1 + state.members * MEMBER_INCOME_BONUS;
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

export function globalMultiplier(state: GameState): number {
  return memberMultiplier(state) * legacyIncomeMultiplier(state);
}

export function totalIncomePerSecond(state: GameState): number {
  const base = RACKETS.reduce(
    (sum, racket) =>
      sum + racketIncomePerSecond(racket, racketOwned(state, racket)),
    0
  );
  return base * globalMultiplier(state);
}

export function clickBonus(state: GameState): number {
  const perSecond = totalIncomePerSecond(state);
  return Math.max(CLICK_BONUS_FLOOR, perSecond * CLICK_BONUS_INCOME_SHARE);
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

export function recruitMember(state: GameState): GameState {
  const cost = memberCost(state);
  if (state.cash < cost) return state;
  return {
    ...state,
    cash: state.cash - cost,
    members: state.members + 1,
  };
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
    members: 0,
    legendPoints: state.legendPoints + earned,
    prestigeCount: state.prestigeCount + 1,
    rackets: Object.fromEntries(RACKETS.map((r) => [r.id, 0])),
  };
  next.cash = startingCash(next);
  return next;
}

export function applyOfflineProgress(
  state: GameState,
  elapsedSeconds: number
): { state: GameState; earned: number } {
  const income = totalIncomePerSecond(state);
  const earned = income * elapsedSeconds;
  if (earned <= 0) return { state, earned: 0 };
  return { state: applyIncome(state, earned), earned };
}
