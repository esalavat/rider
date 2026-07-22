import { useState, type CSSProperties } from "react";
import { CHAPTERS, CHAPTER_MAP_VIEWBOX, MEMBER_TIERS } from "../game/data";
import { formatNumber } from "../game/format";
import { canUnlockChapter, chapterUnlocked } from "../game/engine";
import type { ChapterDef, GameState } from "../game/types";
import { ChapterPatchIcon, LockIcon, MapPinIcon, SkullIcon, ThrottleIcon } from "./icons";

interface ChaptersTabProps {
  state: GameState;
  onUnlock: (chapter: ChapterDef) => void;
}

export function ChaptersTab({ state, onUnlock }: ChaptersTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const unlockedCount = CHAPTERS.filter((c) => chapterUnlocked(state, c)).length;

  const frontierChapter =
    CHAPTERS.find((c) => !chapterUnlocked(state, c)) ?? CHAPTERS[CHAPTERS.length - 1];
  const selected = CHAPTERS.find((c) => c.id === selectedId) ?? frontierChapter;
  const selectedUnlocked = chapterUnlocked(state, selected);
  const selectedIndex = CHAPTERS.findIndex((c) => c.id === selected.id);
  const prevChapter = CHAPTERS[selectedIndex - 1];
  const prevLocked = !!prevChapter && !chapterUnlocked(state, prevChapter);
  const affordable = canUnlockChapter(state, selected);
  const unlocksTierName = selected.unlocksTier
    ? MEMBER_TIERS.find((t) => t.id === selected.unlocksTier)?.name
    : undefined;

  return (
    <div className="tab-panel">
      <div className="chapters-hero">
        <MapPinIcon className="chapters-hero__icon" />
        <span className="chapters-hero__count">
          {unlockedCount}/{CHAPTERS.length} chapters chartered
        </span>
        <span className="chapters-hero__bonus">
          Each chapter charts new territory and unlocks the next rank.
        </span>
      </div>

      <div className="chapter-map-wrap">
        <svg
          viewBox={`0 0 ${CHAPTER_MAP_VIEWBOX.width} ${CHAPTER_MAP_VIEWBOX.height}`}
          className="chapter-map"
          role="img"
          aria-label="Chapter route map"
        >
          <path
            className="chapter-map__landmass"
            d="M40 30 C130 -10,250 5,290 55 C330 105,290 170,310 240
               C330 320,275 370,295 450 C315 540,265 590,285 670
               C305 760,250 820,265 900 C275 945,190 945,150 925
               C90 895,110 830,75 780 C35 725,55 660,30 590
               C5 520,45 460,25 390 C5 320,45 260,25 190
               C8 130,45 75,40 30 Z"
          />

          {CHAPTERS.slice(0, -1).map((chapter, i) => {
            const next = CHAPTERS[i + 1];
            const active = chapterUnlocked(state, next);
            const d = `M ${chapter.mapX} ${chapter.mapY} C ${chapter.mapX} ${
              chapter.mapY + 55
            }, ${next.mapX} ${next.mapY - 55}, ${next.mapX} ${next.mapY}`;
            return (
              <path
                key={`${chapter.id}-road`}
                d={d}
                className={`chapter-map__road${active ? " chapter-map__road--active" : ""}`}
                style={
                  active
                    ? ({ "--chapter-accent": next.accent } as CSSProperties)
                    : undefined
                }
              />
            );
          })}

          {CHAPTERS.map((chapter) => {
            const unlocked = chapterUnlocked(state, chapter);
            const isSelected = selected.id === chapter.id;
            return (
              <g
                key={chapter.id}
                className={`chapter-map__city${
                  unlocked ? " chapter-map__city--unlocked" : ""
                }${isSelected ? " chapter-map__city--selected" : ""}`}
                style={
                  unlocked
                    ? ({ "--chapter-accent": chapter.accent } as CSSProperties)
                    : undefined
                }
                transform={`translate(${chapter.mapX}, ${chapter.mapY})`}
                onClick={() => setSelectedId(chapter.id)}
              >
                <circle r="26" className="chapter-map__city-bg" />
                <svg x={-13} y={-13} width={26} height={26} className="chapter-map__city-icon">
                  {unlocked ? <ChapterPatchIcon patch={chapter.patch} /> : <LockIcon />}
                </svg>
                <text y="42" textAnchor="middle" className="chapter-map__city-label">
                  {unlocked ? chapter.name : "???"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        className={`chapter-detail${selectedUnlocked ? " chapter-detail--unlocked" : ""}`}
        style={
          selectedUnlocked
            ? ({ "--chapter-accent": selected.accent } as CSSProperties)
            : undefined
        }
      >
        <div className="chapter-detail__patch">
          <ChapterPatchIcon patch={selected.patch} />
        </div>
        <div className="chapter-detail__body">
          <span className="chapter-detail__name">{selected.name}</span>
          <span className="chapter-detail__region">{selected.region}</span>
          <p className="chapter-detail__flavor">{selected.flavor}</p>

          {selectedUnlocked ? (
            <>
              <div className="chapter-detail__bike">
                <ThrottleIcon className="chapter-detail__bike-icon" />
                <span>{selected.bikeName}</span>
              </div>
              <span className="chapter-detail__bonus">
                +{(selected.bonus * 100).toFixed(0)}% income
              </span>
            </>
          ) : (
            <>
              <span className="chapter-detail__bonus">
                {unlocksTierName
                  ? `Unlocks ${unlocksTierName} · +${(selected.bonus * 100).toFixed(0)}% income`
                  : `+${(selected.bonus * 100).toFixed(0)}% income`}
              </span>
              <button
                className="buy-btn buy-btn--legend chapter-detail__unlock"
                disabled={!affordable}
                onClick={() => onUnlock(selected)}
              >
                <span className="buy-btn__label">Charter</span>
                <span className="buy-btn__cost">
                  <SkullIcon className="buy-btn__cost-icon" />
                  {formatNumber(selected.unlockCost)}
                </span>
              </button>
              {prevLocked && (
                <p className="chapter-detail__hint">
                  Charter {prevChapter!.name} first.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
