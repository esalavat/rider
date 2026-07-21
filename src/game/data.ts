import type { LegacyUpgradeDef, RacketDef } from "./types";

export const RACKETS: RacketDef[] = [
  {
    id: "scrapyard",
    name: "Scrap Yard",
    flavor: "Strip it, sell it, don't ask questions.",
    icon: "scrapyard",
    baseCost: 10,
    baseIncome: 0.5,
    costGrowth: 1.14,
  },
  {
    id: "chopshop",
    name: "Chop Shop",
    flavor: "Yesterday's stolen ride, today's spare parts.",
    icon: "chopshop",
    baseCost: 120,
    baseIncome: 4,
    costGrowth: 1.145,
    requires: "scrapyard",
  },
  {
    id: "paint",
    name: "Custom Paint Booth",
    flavor: "Flames, skulls, and a fresh coat of trouble.",
    icon: "paint",
    baseCost: 1400,
    baseIncome: 38,
    costGrowth: 1.15,
    requires: "chopshop",
  },
  {
    id: "bar",
    name: "The Rusty Chain",
    flavor: "The clubhouse bar. Whiskey and loyalty on tap.",
    icon: "bar",
    baseCost: 16000,
    baseIncome: 360,
    costGrowth: 1.15,
    requires: "paint",
  },
  {
    id: "tattoo",
    name: "Ink & Iron Tattoo",
    flavor: "Earn your patch, then earn the ink.",
    icon: "tattoo",
    baseCost: 190000,
    baseIncome: 3800,
    costGrowth: 1.155,
    requires: "bar",
  },
  {
    id: "poker",
    name: "Back Room Poker",
    flavor: "The house always wins. The club is the house.",
    icon: "poker",
    baseCost: 2300000,
    baseIncome: 42000,
    costGrowth: 1.155,
    requires: "tattoo",
  },
  {
    id: "smuggling",
    name: "Border Runs",
    flavor: "Fast bikes, quiet roads, big payouts.",
    icon: "smuggling",
    baseCost: 28000000,
    baseIncome: 480000,
    costGrowth: 1.16,
    requires: "poker",
  },
  {
    id: "speedway",
    name: "Underground Speedway",
    flavor: "Illegal races. Legendary purses.",
    icon: "speedway",
    baseCost: 340000000,
    baseIncome: 5600000,
    costGrowth: 1.16,
    requires: "smuggling",
  },
];

export const LEGACY_UPGRADES: LegacyUpgradeDef[] = [
  {
    id: "chrome_plating",
    name: "Chrome Plating",
    flavor: "Every rig in the yard gleams. Respect follows shine.",
    effect: "income",
    valuePerLevel: 0.1,
    baseCost: 1,
    costGrowth: 1.35,
    maxLevel: 50,
  },
  {
    id: "reputation",
    name: "Street Reputation",
    flavor: "Word travels fast. Recruits line up cheaper.",
    effect: "recruitCost",
    valuePerLevel: 0.03,
    baseCost: 1,
    costGrowth: 1.4,
    maxLevel: 25,
  },
  {
    id: "road_captain",
    name: "Road Captain's Network",
    flavor: "Faster routes, bigger scores, no wasted miles.",
    effect: "income",
    valuePerLevel: 0.18,
    baseCost: 3,
    costGrowth: 1.45,
    maxLevel: 20,
  },
  {
    id: "nest_egg",
    name: "Nest Egg",
    flavor: "Every new chapter starts with cash in the saddlebag.",
    effect: "startCash",
    valuePerLevel: 2500,
    baseCost: 2,
    costGrowth: 1.3,
    maxLevel: 30,
  },
];

export const MEMBER_BASE_COST = 50;
export const MEMBER_COST_GROWTH = 1.13;
export const MEMBER_INCOME_BONUS = 0.02;
export const CLICK_BONUS_FLOOR = 10;
export const CLICK_BONUS_INCOME_SHARE = 0.6;
export const OFFLINE_CAP_SECONDS = 4 * 60 * 60;
export const OFFLINE_EFFICIENCY = 0.5;

export const MEMBER_RANKS: { count: number; title: string }[] = [
  { count: 0, title: "Hangaround" },
  { count: 10, title: "Prospect" },
  { count: 25, title: "Patched Member" },
  { count: 50, title: "Road Captain" },
  { count: 100, title: "Sergeant at Arms" },
  { count: 250, title: "Vice President" },
  { count: 500, title: "Chapter President" },
  { count: 1000, title: "National President" },
];

export function memberRank(members: number): string {
  let title = MEMBER_RANKS[0].title;
  for (const rank of MEMBER_RANKS) {
    if (members >= rank.count) title = rank.title;
  }
  return title;
}
