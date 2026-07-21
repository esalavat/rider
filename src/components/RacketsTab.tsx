import { RACKETS } from "../game/data";
import { formatCash, formatNumber } from "../game/format";
import {
  globalMultiplier,
  maxAffordableRackets,
  racketCost,
  racketIncomePerSecond,
  racketIsUnlocked,
  racketOwned,
} from "../game/engine";
import type { GameState, RacketDef } from "../game/types";
import { RacketIcon, ThrottleIcon } from "./icons";

interface RacketsTabProps {
  state: GameState;
  onBuy: (racket: RacketDef) => void;
  onBuyMax: (racket: RacketDef) => void;
  onKickstart: () => void;
}

export function RacketsTab({
  state,
  onBuy,
  onBuyMax,
  onKickstart,
}: RacketsTabProps) {
  const multiplier = globalMultiplier(state);

  return (
    <div className="tab-panel">
      <button className="kickstart-btn" onClick={onKickstart}>
        <ThrottleIcon className="kickstart-btn__icon" />
        <span>Twist the Throttle</span>
      </button>

      <div className="racket-list">
        {RACKETS.map((racket) => {
          const unlocked = racketIsUnlocked(state, racket);
          if (!unlocked) return null;
          const owned = racketOwned(state, racket);
          const cost = racketCost(racket, owned);
          const affordable = state.cash >= cost;
          const income = racketIncomePerSecond(racket, owned) * multiplier;
          const maxCount = maxAffordableRackets(state, racket);

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
                {owned > 0 && (
                  <p className="racket-card__income">
                    {formatCash(income)}/s
                  </p>
                )}
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
                {maxCount > 1 && (
                  <button
                    className="buy-btn buy-btn--max"
                    onClick={() => onBuyMax(racket)}
                  >
                    Max (x{formatNumber(maxCount)})
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
