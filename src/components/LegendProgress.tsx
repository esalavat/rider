import {
  legendPointsProgress,
  legendPointsRatePerSecond,
  secondsUntilNextLegendPoint,
} from "../game/engine";
import { formatDuration, formatNumber } from "../game/format";
import type { GameState } from "../game/types";

interface LegendProgressProps {
  state: GameState;
  compact?: boolean;
}

// Below this, the bar would refill faster than the game loop can render it
// (useGameState throttles to 4 updates/sec) and just looks like flicker.
// Switch to a pulsing bar + a LP/sec rate instead of a literal fill.
const FAST_MODE_THRESHOLD_SECONDS = 1;

// A one-unit ETA for the compact header pill, which is too narrow for
// formatDuration's "Xh Ym" form.
function shortEta(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

export function LegendProgress({ state, compact = false }: LegendProgressProps) {
  const progress = legendPointsProgress(state);
  const secondsToNext = secondsUntilNextLegendPoint(state);
  const rate = legendPointsRatePerSecond(state);
  const fastMode = secondsToNext < FAST_MODE_THRESHOLD_SECONDS;

  return (
    <div className={`legend-progress${compact ? " legend-progress--compact" : ""}`}>
      <div className="legend-progress__track">
        <div
          className={`legend-progress__fill${fastMode ? " legend-progress__fill--pulsing" : ""}`}
          style={fastMode ? undefined : { width: `${Math.min(1, progress) * 100}%` }}
        />
      </div>
      <span className="legend-progress__label">
        {fastMode
          ? `+${formatNumber(rate)}/s`
          : Number.isFinite(secondsToNext)
            ? compact
              ? shortEta(secondsToNext)
              : `next Legend Point in ${formatDuration(secondsToNext)}`
            : compact
              ? "–"
              : "earn cash to make progress"}
      </span>
    </div>
  );
}
