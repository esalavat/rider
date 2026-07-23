import { useState } from "react";
import { formatCash, formatNumber } from "../game/format";
import { memberRank, totalIncomePerSecond, totalMembers } from "../game/engine";
import type { GameState } from "../game/types";
import { PatchIcon, SkullIcon } from "./icons";

interface HeaderProps {
  state: GameState;
  onRename: (name: string) => void;
  onLogoTap?: () => void;
}

export function Header({ state, onRename, onLogoTap }: HeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(state.clubName);
  const income = totalIncomePerSecond(state);

  const commit = () => {
    const trimmed = draft.trim();
    onRename(trimmed.length > 0 ? trimmed : state.clubName);
    setEditing(false);
  };

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <span className="app-header__logo" onClick={onLogoTap}>
          RIDER
        </span>
        <span className="app-header__tagline">Idle MC Empire</span>
      </div>

      <div className="app-header__club">
        {editing ? (
          <input
            className="app-header__club-input"
            value={draft}
            autoFocus
            maxLength={32}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
          />
        ) : (
          <button
            className="app-header__club-name"
            onClick={() => {
              setDraft(state.clubName);
              setEditing(true);
            }}
            title="Rename your club"
          >
            {state.clubName}
          </button>
        )}
        <span className="app-header__rank">{memberRank(state)}</span>
      </div>

      <div className="app-header__stats">
        <div className="stat-pill stat-pill--cash">
          <span className="stat-pill__value">{formatCash(state.cash)}</span>
          <span className="stat-pill__label">
            +{formatCash(income)}/s
          </span>
        </div>
        <div className="stat-pill">
          <PatchIcon className="stat-pill__icon" />
          <span className="stat-pill__value">{formatNumber(totalMembers(state))}</span>
        </div>
        <div className="stat-pill stat-pill--legend">
          <SkullIcon className="stat-pill__icon" />
          <span className="stat-pill__value">
            {formatNumber(state.legendPoints)}
          </span>
        </div>
      </div>
    </header>
  );
}
