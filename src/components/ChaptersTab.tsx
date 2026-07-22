import type { CSSProperties } from "react";
import { CHAPTERS } from "../game/data";
import { formatNumber } from "../game/format";
import { canUnlockChapter, chapterUnlocked } from "../game/engine";
import type { ChapterDef, GameState } from "../game/types";
import { ChapterPatchIcon, MapPinIcon, SkullIcon, ThrottleIcon } from "./icons";

interface ChaptersTabProps {
  state: GameState;
  onUnlock: (chapter: ChapterDef) => void;
}

export function ChaptersTab({ state, onUnlock }: ChaptersTabProps) {
  const unlockedCount = CHAPTERS.filter((c) => chapterUnlocked(state, c)).length;

  return (
    <div className="tab-panel">
      <div className="chapters-hero">
        <MapPinIcon className="chapters-hero__icon" />
        <span className="chapters-hero__count">
          {unlockedCount}/{CHAPTERS.length} chapters chartered
        </span>
        <span className="chapters-hero__bonus">
          Each chapter adds a permanent income bonus, forever.
        </span>
      </div>

      <div className="chapter-grid">
        {CHAPTERS.map((chapter) => {
          const unlocked = chapterUnlocked(state, chapter);
          const affordable = canUnlockChapter(state, chapter);

          return (
            <div
              key={chapter.id}
              className={`chapter-card${unlocked ? " chapter-card--unlocked" : ""}`}
              style={
                unlocked
                  ? ({ "--chapter-accent": chapter.accent } as CSSProperties)
                  : undefined
              }
            >
              <div className="chapter-card__patch">
                <ChapterPatchIcon patch={chapter.patch} />
              </div>
              <span className="chapter-card__name">{chapter.name}</span>
              <span className="chapter-card__region">{chapter.region}</span>

              {unlocked ? (
                <>
                  <div className="chapter-card__bike">
                    <ThrottleIcon className="chapter-card__bike-icon" />
                    <span>{chapter.bikeName}</span>
                  </div>
                  <span className="chapter-card__bonus">
                    +{(chapter.bonus * 100).toFixed(0)}% income
                  </span>
                </>
              ) : (
                <>
                  <p className="chapter-card__flavor">{chapter.flavor}</p>
                  <button
                    className="buy-btn buy-btn--legend chapter-card__unlock"
                    disabled={!affordable}
                    onClick={() => onUnlock(chapter)}
                  >
                    <span className="buy-btn__label">Charter</span>
                    <span className="buy-btn__cost">
                      <SkullIcon className="buy-btn__cost-icon" />
                      {formatNumber(chapter.unlockCost)}
                    </span>
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
