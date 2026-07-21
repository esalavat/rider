import { formatCash, formatDuration } from "../game/format";
import type { OfflineReport } from "../game/useGameState";
import { ThrottleIcon } from "./icons";

interface WelcomeBackModalProps {
  report: OfflineReport;
  onDismiss: () => void;
}

export function WelcomeBackModal({ report, onDismiss }: WelcomeBackModalProps) {
  return (
    <div className="modal-overlay" onClick={onDismiss}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <ThrottleIcon className="modal-card__icon" />
        <h2 className="modal-card__title">Welcome back</h2>
        <p className="modal-card__body">
          The club kept running while you were gone for{" "}
          {formatDuration(report.secondsAway)}.
        </p>
        <p className="modal-card__earned">+{formatCash(report.earned)}</p>
        <button className="prestige-btn" onClick={onDismiss}>
          Back to Business
        </button>
      </div>
    </div>
  );
}
