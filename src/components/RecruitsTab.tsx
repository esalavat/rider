import { MEMBER_AUTO_RATE, MEMBER_TIERS } from "../game/data";
import { formatCash, formatNumber } from "../game/format";
import {
  maxAffordableMemberTier,
  memberMultiplier,
  memberRank,
  memberTierCost,
  memberTierIsUnlocked,
  memberTierOwned,
  totalMembers,
} from "../game/engine";
import type { GameState, MemberTierDef } from "../game/types";
import { OfficerPatchIcon, PatchIcon } from "./icons";

interface RecruitsTabProps {
  state: GameState;
  onBuy: (tier: MemberTierDef) => void;
  onBuyMax: (tier: MemberTierDef) => void;
}

export function RecruitsTab({ state, onBuy, onBuyMax }: RecruitsTabProps) {
  const bonus = (memberMultiplier(state) - 1) * 100;

  return (
    <div className="tab-panel">
      <div className="recruit-hero">
        <PatchIcon className="recruit-hero__icon" />
        <span className="recruit-hero__count">
          {formatNumber(totalMembers(state))} members
        </span>
        <span className="recruit-hero__rank">Rank: {memberRank(state)}</span>
        <span className="recruit-hero__bonus">
          +{bonus.toFixed(0)}% income from crew size
        </span>
      </div>

      <div className="racket-list">
        {MEMBER_TIERS.map((tier, index) => {
          const unlocked = memberTierIsUnlocked(state, tier);
          if (!unlocked) return null;
          const owned = memberTierOwned(state, tier);
          const cost = memberTierCost(state, tier);
          const affordable = state.cash >= cost;
          const maxCount = maxAffordableMemberTier(state, tier);
          const below = MEMBER_TIERS[index - 1];
          const autoRate = owned * MEMBER_AUTO_RATE;
          const Icon = tier.icon === "officer" ? OfficerPatchIcon : PatchIcon;

          return (
            <div
              key={tier.id}
              className={`racket-card${affordable ? " racket-card--affordable" : ""}`}
            >
              <div className="racket-card__icon">
                <Icon />
              </div>
              <div className="racket-card__body">
                <div className="racket-card__top">
                  <span className="racket-card__name">{tier.name}</span>
                  <span className="racket-card__owned">x{formatNumber(owned)}</span>
                </div>
                <p className="racket-card__flavor">{tier.flavor}</p>
                <p
                  className="racket-card__income"
                  style={{ visibility: below ? "visible" : "hidden" }}
                >
                  {below
                    ? `Recruits ${formatNumber(autoRate)} ${below.name}/s`
                    : " "}
                </p>
              </div>
              <div className="racket-card__actions">
                <button
                  className="buy-btn"
                  disabled={!affordable}
                  onClick={() => onBuy(tier)}
                >
                  <span className="buy-btn__label">Buy</span>
                  <span className="buy-btn__cost">{formatCash(cost)}</span>
                </button>
                <button
                  className="buy-btn buy-btn--max"
                  style={{ visibility: maxCount > 1 ? "visible" : "hidden" }}
                  tabIndex={maxCount > 1 ? 0 : -1}
                  onClick={() => onBuyMax(tier)}
                >
                  Max (x{formatNumber(maxCount)})
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="tab-hint">
        Every rider you patch in boosts income from every racket the club
        runs. Higher ranks recruit the tier below them automatically —
        build the chain and the ranks fill themselves.
      </p>
    </div>
  );
}
