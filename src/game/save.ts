import { createNewGame, SAVE_KEY, SAVE_VERSION } from "./engine";
import type { GameState } from "./types";

export function loadGame(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createNewGame();
    const parsed = JSON.parse(raw) as Partial<GameState>;
    if (!parsed || parsed.version !== SAVE_VERSION) return createNewGame();
    const fresh = createNewGame();
    return {
      ...fresh,
      ...parsed,
      rackets: { ...fresh.rackets, ...(parsed.rackets ?? {}) },
      legacyLevels: { ...fresh.legacyLevels, ...(parsed.legacyLevels ?? {}) },
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
