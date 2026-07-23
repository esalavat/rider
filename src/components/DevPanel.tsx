import { formatCash, formatNumber } from "../game/format";
import type { GameState } from "../game/types";
import { BugIcon } from "./icons";

interface DevPanelProps {
  state: GameState;
  onAddCash: (amount: number) => void;
  onAddLegend: (amount: number) => void;
  onSkipTime: (seconds: number) => void;
  onDisable: () => void;
}

const TIME_PRESETS = [
  { label: "+1 min", seconds: 60 },
  { label: "+10 min", seconds: 600 },
  { label: "+1 hour", seconds: 3600 },
  { label: "+4 hours", seconds: 4 * 3600 },
  { label: "+1 day", seconds: 24 * 3600 },
  { label: "+1 week", seconds: 7 * 24 * 3600 },
];

const CASH_PRESETS = [1_000, 1_000_000, 1_000_000_000, 1_000_000_000_000];

const LEGEND_PRESETS = [
  100, 10_000, 1_000_000, 1_000_000_000, 1_000_000_000_000,
];

export function DevPanel({
  state,
  onAddCash,
  onAddLegend,
  onSkipTime,
  onDisable,
}: DevPanelProps) {
  return (
    <div className="tab-panel">
      <div className="dev-hero">
        <BugIcon className="dev-hero__icon" />
        <span className="dev-hero__title">Dev Tools</span>
        <p className="dev-hero__body">
          Local testing only, not part of the real game. Skip time to
          preview pacing without waiting, or grant cash/Legend Points to
          jump straight to a state you want to check.
        </p>
      </div>

      <div className="dev-section">
        <span className="dev-section__title">Skip Time</span>
        <p className="dev-section__hint">
          Applies racket income and member auto-production at full rate,
          same math as offline progress but no penalty and no cap.
        </p>
        <div className="dev-btn-row">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className="dev-btn"
              onClick={() => onSkipTime(preset.seconds)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="dev-section">
        <span className="dev-section__title">Free Cash</span>
        <p className="dev-section__hint">Current: {formatCash(state.cash)}</p>
        <div className="dev-btn-row">
          {CASH_PRESETS.map((amount) => (
            <button
              key={amount}
              className="dev-btn"
              onClick={() => onAddCash(amount)}
            >
              +{formatCash(amount)}
            </button>
          ))}
        </div>
      </div>

      <div className="dev-section">
        <span className="dev-section__title">Free Legend Points</span>
        <p className="dev-section__hint">
          Current: {formatNumber(state.legendPoints)}
        </p>
        <div className="dev-btn-row">
          {LEGEND_PRESETS.map((amount) => (
            <button
              key={amount}
              className="dev-btn"
              onClick={() => onAddLegend(amount)}
            >
              +{formatNumber(amount)}
            </button>
          ))}
        </div>
      </div>

      <div className="danger-zone">
        <button className="danger-btn" onClick={onDisable}>
          Hide Dev Tools
        </button>
      </div>
    </div>
  );
}
