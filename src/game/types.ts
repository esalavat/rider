export interface RacketDef {
  id: string;
  name: string;
  flavor: string;
  icon: RacketIconId;
  baseCost: number;
  baseIncome: number;
  costGrowth: number;
  requires?: string;
}

export type RacketIconId =
  | "scrapyard"
  | "chopshop"
  | "paint"
  | "bar"
  | "tattoo"
  | "poker"
  | "smuggling"
  | "speedway";

export type LegacyEffect = "income" | "recruitCost" | "startCash";

export type MemberTierIconId = "patch" | "officer";

export interface MemberTierDef {
  id: string;
  name: string;
  flavor: string;
  icon: MemberTierIconId;
  baseCost: number;
  costGrowth: number;
  weight: number;
  requires?: string;
}

export interface LegacyUpgradeDef {
  id: string;
  name: string;
  flavor: string;
  effect: LegacyEffect;
  valuePerLevel: number;
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
}

export interface GameState {
  version: number;
  clubName: string;
  cash: number;
  cashEarnedThisRun: number;
  legendPoints: number;
  prestigeCount: number;
  rackets: Record<string, number>;
  racketMilestones: Record<string, number>;
  legacyLevels: Record<string, number>;
  memberTiers: Record<string, number>;
  memberProgress: Record<string, number>;
  createdAt: number;
  lastSave: number;
}
