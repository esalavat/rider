import { LEGACY_UPGRADES } from "../game/data";
import { formatCash, formatNumber } from "../game/format";
import {
  canPrestige,
  legacyLevel,
  legacyUpgradeCost,
  legendPointsOnPrestige,
} from "../game/engine";
import type { GameState, LegacyUpgradeDef } from "../game/types";
import { SkullIcon } from "./icons";

interface LegacyTabProps {
  state: GameState;
  onBuyUpgrade: (upgrade: LegacyUpgradeDef) => void;
  onPrestige: () => void;
  onHardReset: () => void;
}

function effectLabel(upgrade: LegacyUpgradeDef): string {
  switch (upgrade.effect) {
    case "income":
      return `+${(upgrade.valuePerLevel * 100).toFixed(0)}% income / level`;
    case "recruitCost":
      return `-${(upgrade.valuePerLevel * 100).toFixed(0)}% recruit cost / level`;
    case "startCash":
      return `+${formatCash(upgrade.valuePerLevel)} starting cash / level`;
  }
}

export function LegacyTab({
  state,
  onBuyUpgrade,
  onPrestige,
  onHardReset,
}: LegacyTabProps) {
  const pending = legendPointsOnPrestige(state);
  const eligible = canPrestige(state);

  const handleReset = () => {
    if (
      window.confirm(
        "Reset ALL progress? This wipes your cash, rackets, members, legend points, and chapters for good. This can't be undone."
      )
    ) {
      onHardReset();
    }
  };

  return (
    <div className="tab-panel">
      <div className="legacy-hero">
        <SkullIcon className="legacy-hero__icon" />
        <h2 className="legacy-hero__title">Go Legendary</h2>
        <p className="legacy-hero__body">
          Retire this chapter, pass down the colors, and start a new run.
          You keep your Legend Points and every upgrade below forever.
        </p>
        <div className="legacy-hero__preview">
          Cashing out now earns{" "}
          <strong>{formatNumber(pending)} Legend Points</strong>
        </div>
        <button
          className="prestige-btn"
          disabled={!eligible}
          onClick={onPrestige}
        >
          {eligible ? "Go Legendary" : "Earn more before retiring"}
        </button>
      </div>

      <div className="legacy-list">
        {LEGACY_UPGRADES.map((upgrade) => {
          const level = legacyLevel(state, upgrade);
          const maxed = level >= upgrade.maxLevel;
          const cost = legacyUpgradeCost(upgrade, level);
          const affordable = !maxed && state.legendPoints >= cost;

          return (
            <div key={upgrade.id} className="legacy-card">
              <div className="legacy-card__body">
                <div className="legacy-card__top">
                  <span className="legacy-card__name">{upgrade.name}</span>
                  <span className="legacy-card__level">
                    Lv. {level}/{upgrade.maxLevel}
                  </span>
                </div>
                <p className="legacy-card__flavor">{upgrade.flavor}</p>
                <p className="legacy-card__effect">{effectLabel(upgrade)}</p>
              </div>
              <button
                className="buy-btn buy-btn--legend"
                disabled={!affordable}
                onClick={() => onBuyUpgrade(upgrade)}
              >
                <span className="buy-btn__label">{maxed ? "Maxed" : "Upgrade"}</span>
                {!maxed && (
                  <span className="buy-btn__cost">
                    <SkullIcon className="buy-btn__cost-icon" />
                    {formatNumber(cost)}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="danger-zone">
        <button className="danger-btn" onClick={handleReset}>
          Reset Progress
        </button>
      </div>
    </div>
  );
}
