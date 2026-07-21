import { MEMBER_RANKS, memberRank } from "../game/data";
import { formatCash, formatNumber } from "../game/format";
import { memberCost, memberMultiplier } from "../game/engine";
import type { GameState } from "../game/types";
import { PatchIcon } from "./icons";

interface RecruitsTabProps {
  state: GameState;
  onRecruit: () => void;
}

export function RecruitsTab({ state, onRecruit }: RecruitsTabProps) {
  const cost = memberCost(state);
  const affordable = state.cash >= cost;
  const bonus = (memberMultiplier(state) - 1) * 100;
  const rank = memberRank(state.members);
  const nextRank = MEMBER_RANKS.find((r) => r.count > state.members);

  return (
    <div className="tab-panel">
      <div className="recruit-card">
        <div className="recruit-card__icon">
          <PatchIcon />
        </div>
        <div className="recruit-card__stats">
          <span className="recruit-card__count">
            {formatNumber(state.members)} members
          </span>
          <span className="recruit-card__rank">Rank: {rank}</span>
          {nextRank && (
            <span className="recruit-card__next">
              Next rank at {formatNumber(nextRank.count)} members (
              {nextRank.title})
            </span>
          )}
          <span className="recruit-card__bonus">
            +{bonus.toFixed(0)}% income from crew size
          </span>
        </div>
        <button
          className="buy-btn buy-btn--wide"
          disabled={!affordable}
          onClick={onRecruit}
        >
          <span className="buy-btn__label">Recruit a Prospect</span>
          <span className="buy-btn__cost">{formatCash(cost)}</span>
        </button>
      </div>

      <p className="tab-hint">
        Every rider you patch in boosts income from every racket the club
        runs. Fill the ranks — the bigger the crew, the louder the roar.
      </p>
    </div>
  );
}
