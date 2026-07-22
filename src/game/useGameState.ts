import { useCallback, useEffect, useRef, useState } from "react";
import { OFFLINE_CAP_SECONDS, OFFLINE_EFFICIENCY } from "./data";
import {
  applyIncome,
  applyMemberAutoProduction,
  applyOfflineProgress,
  buyLegacyUpgrade as buyLegacyUpgradeAction,
  buyMaxMemberTier as buyMaxMemberTierAction,
  buyMaxRackets as buyMaxRacketsAction,
  buyMemberTier as buyMemberTierAction,
  buyRacket as buyRacketAction,
  clickBonus,
  prestige as prestigeAction,
  totalIncomePerSecond,
} from "./engine";
import { loadGame, resetGame as clearSave, saveGame } from "./save";
import type { GameState, LegacyUpgradeDef, MemberTierDef, RacketDef } from "./types";

const AUTOSAVE_INTERVAL_MS = 10_000;
const TICK_INTERVAL_SECONDS = 0.25;

export interface OfflineReport {
  earned: number;
  secondsAway: number;
}

export function useGameState() {
  const [state, setState] = useState<GameState>(() => loadGame());
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(
    null
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const loaded = loadGame();
    const elapsedRealSeconds = Math.max(
      0,
      (Date.now() - loaded.lastSave) / 1000
    );
    if (elapsedRealSeconds < 5) return;
    const effectiveSeconds =
      Math.min(elapsedRealSeconds, OFFLINE_CAP_SECONDS) * OFFLINE_EFFICIENCY;
    const { state: next, earned } = applyOfflineProgress(
      loaded,
      effectiveSeconds
    );
    if (earned > 0) {
      setState(next);
      setOfflineReport({ earned, secondsAway: elapsedRealSeconds });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let frame: number;
    let lastTime = performance.now();
    let accumulated = 0;
    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.5);
      lastTime = now;
      accumulated += dt;
      if (accumulated >= TICK_INTERVAL_SECONDS) {
        const elapsed = accumulated;
        accumulated = 0;
        setState((prev) => {
          const withMembers = applyMemberAutoProduction(prev, elapsed);
          const income = totalIncomePerSecond(withMembers);
          return income > 0
            ? applyIncome(withMembers, income * elapsed)
            : withMembers;
        });
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      saveGame(stateRef.current);
    }, AUTOSAVE_INTERVAL_MS);
    const onHide = () => saveGame(stateRef.current);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
      saveGame(stateRef.current);
    };
  }, []);

  const buyRacket = useCallback((racket: RacketDef) => {
    setState((prev) => buyRacketAction(prev, racket));
  }, []);

  const buyMaxRackets = useCallback((racket: RacketDef) => {
    setState((prev) => buyMaxRacketsAction(prev, racket));
  }, []);

  const buyMemberTier = useCallback((tier: MemberTierDef) => {
    setState((prev) => buyMemberTierAction(prev, tier));
  }, []);

  const buyMaxMemberTier = useCallback((tier: MemberTierDef) => {
    setState((prev) => buyMaxMemberTierAction(prev, tier));
  }, []);

  const buyLegacyUpgrade = useCallback((upgrade: LegacyUpgradeDef) => {
    setState((prev) => buyLegacyUpgradeAction(prev, upgrade));
  }, []);

  const doPrestige = useCallback(() => {
    setState((prev) => prestigeAction(prev));
  }, []);

  const kickstart = useCallback(() => {
    setState((prev) => applyIncome(prev, clickBonus(prev)));
  }, []);

  const renameClub = useCallback((name: string) => {
    setState((prev) => ({ ...prev, clubName: name.slice(0, 32) }));
  }, []);

  const hardReset = useCallback(() => {
    clearSave();
    setState(loadGame());
  }, []);

  const dismissOfflineReport = useCallback(() => setOfflineReport(null), []);

  return {
    state,
    offlineReport,
    dismissOfflineReport,
    buyRacket,
    buyMaxRackets,
    buyMemberTier,
    buyMaxMemberTier,
    buyLegacyUpgrade,
    doPrestige,
    kickstart,
    renameClub,
    hardReset,
  };
}
