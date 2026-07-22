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

export type ChapterPatchId =
  | "gear"
  | "sun"
  | "pine"
  | "moon"
  | "mesa"
  | "anchor"
  | "flame"
  | "wings";

export interface ChapterDef {
  id: string;
  name: string;
  region: string;
  flavor: string;
  bikeName: string;
  unlockCost: number;
  bonus: number;
  accent: string;
  patch: ChapterPatchId;
  /** Member tier id this chapter unlocks, if any (chapters 1-6 gate a tier; 7-8 don't). */
  unlocksTier?: string;
  /** Position on the fictional route map's SVG coordinate space. */
  mapX: number;
  mapY: number;
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
  unlockedChapters: Record<string, boolean>;
  createdAt: number;
  lastSave: number;
}
