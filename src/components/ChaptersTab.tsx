import { useState, type CSSProperties } from "react";
import { CHAPTER_MAP_HOME, CHAPTERS, CHAPTER_MAP_VIEWBOX, MEMBER_TIERS } from "../game/data";
import { formatNumber } from "../game/format";
import { canUnlockChapter, chapterUnlocked } from "../game/engine";
import type { ChapterDef, GameState } from "../game/types";
import {
  ChapterPatchIcon,
  LockIcon,
  MapPinIcon,
  ScrapyardIcon,
  SkullIcon,
  ThrottleIcon,
} from "./icons";

interface ChaptersTabProps {
  state: GameState;
  onUnlock: (chapter: ChapterDef) => void;
}

function roadPath(
  from: { mapX: number; mapY: number },
  to: { mapX: number; mapY: number }
): string {
  return `M ${from.mapX} ${from.mapY} C ${from.mapX} ${from.mapY + 55}, ${to.mapX} ${
    to.mapY - 55
  }, ${to.mapX} ${to.mapY}`;
}

export function ChaptersTab({ state, onUnlock }: ChaptersTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const unlockedCount = CHAPTERS.filter((c) => chapterUnlocked(state, c)).length;
  const isHomeSelected = selectedId === "home";

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
            d="M40 34 C130 -11,250 6,290 63 C330 119,290 193,310 273
               C330 364,275 421,295 512 C315 614,265 671,285 762
               C305 864,250 932,265 1023 C275 1074,190 1074,150 1052
               C90 1017,110 944,75 887 C35 824,55 750,30 671
               C5 591,45 523,25 443 C5 364,45 296,25 216
               C8 148,45 85,40 34 Z"
          />

          <path
            d={roadPath(CHAPTER_MAP_HOME, CHAPTERS[0])}
            className={`chapter-map__road${
              chapterUnlocked(state, CHAPTERS[0]) ? " chapter-map__road--active" : ""
            }`}
            style={
              chapterUnlocked(state, CHAPTERS[0])
                ? ({ "--chapter-accent": "var(--chrome)" } as CSSProperties)
                : undefined
            }
          />

          {CHAPTERS.slice(0, -1).map((chapter, i) => {
            const next = CHAPTERS[i + 1];
            const active = chapterUnlocked(state, next);
            return (
              <path
                key={`${chapter.id}-road`}
                d={roadPath(chapter, next)}
                className={`chapter-map__road${active ? " chapter-map__road--active" : ""}`}
                style={
                  active
                    ? ({ "--chapter-accent": next.accent } as CSSProperties)
                    : undefined
                }
              />
            );
          })}

          <g
            className={`chapter-map__city chapter-map__city--unlocked${
              isHomeSelected ? " chapter-map__city--selected" : ""
            }`}
            style={{ "--chapter-accent": "var(--chrome)" } as CSSProperties}
            transform={`translate(${CHAPTER_MAP_HOME.mapX}, ${CHAPTER_MAP_HOME.mapY})`}
            onClick={() => setSelectedId("home")}
          >
            <circle r="26" className="chapter-map__city-bg" />
            <svg x={-13} y={-13} width={26} height={26} className="chapter-map__city-icon">
              <ScrapyardIcon />
            </svg>
            <text y="42" textAnchor="middle" className="chapter-map__city-label">
              {CHAPTER_MAP_HOME.name}
            </text>
          </g>

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

      {isHomeSelected ? (
        <div
          className="chapter-detail chapter-detail--unlocked"
          style={{ "--chapter-accent": "var(--chrome)" } as CSSProperties}
        >
          <div className="chapter-detail__patch">
            <ScrapyardIcon />
          </div>
          <div className="chapter-detail__body">
            <span className="chapter-detail__name">{CHAPTER_MAP_HOME.name}</span>
            <span className="chapter-detail__region">Home Base</span>
            <p className="chapter-detail__flavor">{CHAPTER_MAP_HOME.flavor}</p>
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}
