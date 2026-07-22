import { createNewGame, SAVE_KEY, SAVE_VERSION } from "./engine";
import type { GameState } from "./types";

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createNewGame();
    const parsed = JSON.parse(raw) as (Partial<GameState> & {
      members?: number;
    }) | null;
    if (!parsed || typeof parsed.version !== "number") return createNewGame();
    if (parsed.version > SAVE_VERSION) return createNewGame();

    const fresh = createNewGame();
    const migratedMemberTiers =
      parsed.memberTiers ??
      (typeof parsed.members === "number"
        ? { ...fresh.memberTiers, prospect: parsed.members }
        : fresh.memberTiers);

    return {
      ...fresh,
      ...parsed,
      version: SAVE_VERSION,
      rackets: { ...fresh.rackets, ...(parsed.rackets ?? {}) },
      racketMilestones: {
        ...fresh.racketMilestones,
        ...(parsed.racketMilestones ?? {}),
      },
      legacyLevels: { ...fresh.legacyLevels, ...(parsed.legacyLevels ?? {}) },
      memberTiers: { ...fresh.memberTiers, ...migratedMemberTiers },
      memberProgress: { ...fresh.memberProgress, ...(parsed.memberProgress ?? {}) },
      unlockedChapters: {
        ...fresh.unlockedChapters,
        ...(parsed.unlockedChapters ?? {}),
      },
    };
  } catch {
    return createNewGame();
  }
}

export function saveGame(state: GameState): void {
  try {
    const toSave: GameState = { ...state, lastSave: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
  } catch {
    // storage unavailable (private mode, quota) — fail silently
  }
}

export function resetGame(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}
