import { RACKET_MILESTONES, RACKETS } from "../game/data";
import { formatCash, formatNumber } from "../game/format";
import {
  globalMultiplier,
  maxAffordableRackets,
  racketCost,
  racketEffectiveIncomePerSecond,
  racketIsUnlocked,
  racketMilestoneCost,
  racketMilestoneLevel,
  racketMilestoneNextThreshold,
  racketOwned,
} from "../game/engine";
import type { GameState, RacketDef } from "../game/types";
import { RacketIcon } from "./icons";

interface RacketsTabProps {
  state: GameState;
  onBuy: (racket: RacketDef) => void;
  onBuyMax: (racket: RacketDef) => void;
  onBuyMilestone: (racket: RacketDef) => void;
}

export function RacketsTab({
  state,
  onBuy,
  onBuyMax,
  onBuyMilestone,
}: RacketsTabProps) {
  const multiplier = globalMultiplier(state);

  return (
    <div className="tab-panel">
      <div className="racket-list">
        {RACKETS.map((racket) => {
          const unlocked = racketIsUnlocked(state, racket);
          if (!unlocked) return null;
          const owned = racketOwned(state, racket);
          const cost = racketCost(racket, owned);
          const affordable = state.cash >= cost;
          const income = racketEffectiveIncomePerSecond(state, racket) * multiplier;
          const maxCount = maxAffordableRackets(state, racket);

          const milestoneLevel = racketMilestoneLevel(state, racket);
          const milestoneThreshold = racketMilestoneNextThreshold(state, racket);
          const milestoneCost = racketMilestoneCost(state, racket);
          const milestoneMaxed = milestoneThreshold === null;
          const milestoneReady =
            !milestoneMaxed && owned >= (milestoneThreshold ?? Infinity);
          const milestoneAffordable =
            milestoneReady && milestoneCost !== null && state.cash >= milestoneCost;

          return (
            <div
              key={racket.id}
              className={`racket-card${affordable ? " racket-card--affordable" : ""}`}
            >
              <div className="racket-card__icon">
                <RacketIcon id={racket.icon} />
              </div>
              <div className="racket-card__body">
                <div className="racket-card__top">
                  <span className="racket-card__name">{racket.name}</span>
                  <span className="racket-card__owned">x{owned}</span>
                </div>
                <p className="racket-card__flavor">{racket.flavor}</p>
                <div
                  className="racket-card__milestones"
                  style={{ visibility: owned > 0 ? "visible" : "hidden" }}
                >
                  {RACKET_MILESTONES.map((threshold, i) => (
                    <span
                      key={threshold}
                      className={`milestone-dot${i < milestoneLevel ? " milestone-dot--filled" : ""}`}
                    />
                  ))}
                </div>
                <p
                  className="racket-card__income"
                  style={{ visibility: owned > 0 ? "visible" : "hidden" }}
                >
                  {formatCash(income)}/s
                </p>
              </div>
              <div className="racket-card__actions">
                <button
                  className="buy-btn"
                  disabled={!affordable}
                  onClick={() => onBuy(racket)}
                >
                  <span className="buy-btn__label">Buy</span>
                  <span className="buy-btn__cost">{formatCash(cost)}</span>
                </button>
                <button
                  className="buy-btn buy-btn--max"
                  style={{ visibility: maxCount > 1 ? "visible" : "hidden" }}
                  tabIndex={maxCount > 1 ? 0 : -1}
                  onClick={() => onBuyMax(racket)}
                >
                  Max (x{formatNumber(maxCount)})
                </button>
                <button
                  className="buy-btn buy-btn--milestone"
                  style={{ visibility: owned > 0 ? "visible" : "hidden" }}
                  tabIndex={owned > 0 ? 0 : -1}
                  disabled={milestoneMaxed || !milestoneAffordable}
                  onClick={() => onBuyMilestone(racket)}
                >
                  {milestoneMaxed ? (
                    <span className="buy-btn__label">Maxed x{Math.pow(2, RACKET_MILESTONES.length)}</span>
                  ) : milestoneReady ? (
                    <>
                      <span className="buy-btn__label">Milestone x2</span>
                      <span className="buy-btn__cost">
                        {milestoneCost !== null ? formatCash(milestoneCost) : ""}
                      </span>
                    </>
                  ) : (
                    <span className="buy-btn__label">
                      Own {formatNumber(milestoneThreshold ?? 0)}
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
