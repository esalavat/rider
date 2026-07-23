import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { CHAPTER_MAP_HOME, CHAPTERS, CHAPTER_MAP_VIEWBOX, MEMBER_TIERS } from "../game/data";
import { formatNumber } from "../game/format";
import { canUnlockChapter, chapterUnlocked } from "../game/engine";
import type { ChapterDef, GameState } from "../game/types";
import {
  ChapterPatchIcon,
  CloseIcon,
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

const POPOVER_WIDTH = 250;
const POPOVER_MARGIN = 10;
const POPOVER_ARROW_GAP = 12;
const POPOVER_ESTIMATED_HEIGHT = 220;
// Marker footprint below its center, in SVG user-units: circle (r26) + label + price tag.
const MARKER_FOOTPRINT_BELOW = 66;
const MARKER_FOOTPRINT_ABOVE = 30;

interface PopoverPos {
  left: number;
  top: number;
  arrowLeft: number;
  placement: "above" | "below";
}

// Ordered top-to-bottom as laid out on the map, used to keep the popover from
// covering whichever marker sits immediately before/after the selected one.
const MAP_NODES: { mapX: number; mapY: number }[] = [CHAPTER_MAP_HOME, ...CHAPTERS];

export function ChaptersTab({ state, onUnlock }: ChaptersTabProps) {
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const frontier =
      CHAPTERS.find((c) => !chapterUnlocked(state, c)) ?? CHAPTERS[CHAPTERS.length - 1];
    return frontier.id;
  });
  const unlockedCount = CHAPTERS.filter((c) => chapterUnlocked(state, c)).length;
  const isHomeSelected = selectedId === "home";

  const frontierChapter =
    CHAPTERS.find((c) => !chapterUnlocked(state, c)) ?? CHAPTERS[CHAPTERS.length - 1];
  const selectedChapter =
    selectedId !== null && selectedId !== "home"
      ? CHAPTERS.find((c) => c.id === selectedId)
      : undefined;
  const selected = selectedChapter ?? frontierChapter;
  const selectedUnlocked = chapterUnlocked(state, selected);
  const selectedIndex = CHAPTERS.findIndex((c) => c.id === selected.id);
  const prevChapter = CHAPTERS[selectedIndex - 1];
  const prevLocked = !!prevChapter && !chapterUnlocked(state, prevChapter);
  const affordable = canUnlockChapter(state, selected);
  const unlocksTierName = selected.unlocksTier
    ? MEMBER_TIERS.find((t) => t.id === selected.unlocksTier)?.name
    : undefined;

  const anchor = isHomeSelected ? CHAPTER_MAP_HOME : selected;
  const anchorNodeIndex = isHomeSelected ? 0 : selectedIndex + 1;
  const prevNode = anchorNodeIndex > 0 ? MAP_NODES[anchorNodeIndex - 1] : null;
  const nextNode = anchorNodeIndex < MAP_NODES.length - 1 ? MAP_NODES[anchorNodeIndex + 1] : null;
  const isOpen = selectedId !== null;
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);

  useLayoutEffect(() => {
    const wrap = mapWrapRef.current;
    const svg = svgRef.current;
    if (!wrap || !svg || !isOpen) {
      setPopoverPos(null);
      return;
    }

    function compute(): PopoverPos {
      const height = popoverRef.current?.offsetHeight || POPOVER_ESTIMATED_HEIGHT;
      const wrapRect = wrap!.getBoundingClientRect();
      const svgRect = svg!.getBoundingClientRect();
      const scale = svgRect.width / CHAPTER_MAP_VIEWBOX.width;
      const toPx = (node: { mapX: number; mapY: number }) => ({
        x: svgRect.left - wrapRect.left + node.mapX * scale,
        y: svgRect.top - wrapRect.top + node.mapY * scale,
      });
      const anchorPx = toPx(anchor);

      const maxLeft = Math.max(POPOVER_MARGIN, wrapRect.width - POPOVER_WIDTH - POPOVER_MARGIN);
      const left = Math.min(Math.max(anchorPx.x - POPOVER_WIDTH / 2, POPOVER_MARGIN), maxLeft);
      const arrowLeft = Math.min(Math.max(anchorPx.x - left, 20), POPOVER_WIDTH - 20);

      // Cap how far the popover can extend toward the previous/next marker on
      // the route so it previews the selected city without burying a neighbor.
      const belowLimit = Math.min(
        wrapRect.height - POPOVER_MARGIN,
        nextNode
          ? toPx(nextNode).y - MARKER_FOOTPRINT_ABOVE * scale - POPOVER_ARROW_GAP
          : Infinity
      );
      const aboveLimit = Math.max(
        POPOVER_MARGIN,
        prevNode ? toPx(prevNode).y + MARKER_FOOTPRINT_BELOW * scale + POPOVER_ARROW_GAP : -Infinity
      );

      const belowTop = anchorPx.y + MARKER_FOOTPRINT_BELOW * scale + POPOVER_ARROW_GAP;
      if (belowTop + height <= belowLimit) {
        return { left, top: belowTop, arrowLeft, placement: "below" };
      }
      const aboveTop = anchorPx.y - MARKER_FOOTPRINT_ABOVE * scale - POPOVER_ARROW_GAP - height;
      if (aboveTop >= aboveLimit) {
        return { left, top: aboveTop, arrowLeft, placement: "above" };
      }

      // Neither direction fully clears its neighbor along the route (a tight
      // gap, e.g. Clubhouse to Rust Hollow) — the popover is taller than the
      // room between the two markers, so vertical placement alone can't win.
      // Fall back to sliding it sideways, away from whichever marker it would
      // otherwise sit on top of, since the two are rarely at the same X.
      const belowRoom = belowLimit - belowTop;
      const aboveRoom = aboveTop - aboveLimit;
      const placement: "above" | "below" = aboveRoom > belowRoom ? "above" : "below";
      const conflictNode = placement === "above" ? prevNode : nextNode;
      const top = Math.max(placement === "above" ? aboveTop : belowTop, POPOVER_MARGIN);

      if (!conflictNode) {
        return { left, top, arrowLeft, placement };
      }
      const conflictX = toPx(conflictNode).x;
      const clearance = MARKER_FOOTPRINT_BELOW * scale;
      const biasedLeft =
        conflictX < anchorPx.x
          ? Math.min(maxLeft, conflictX + clearance)
          : Math.max(POPOVER_MARGIN, conflictX - clearance - POPOVER_WIDTH);
      const finalLeft = Math.min(Math.max(biasedLeft, POPOVER_MARGIN), maxLeft);
      const finalArrowLeft = Math.min(Math.max(anchorPx.x - finalLeft, 20), POPOVER_WIDTH - 20);
      return { left: finalLeft, top, arrowLeft: finalArrowLeft, placement };
    }

    setPopoverPos(compute());
    const onResize = () => setPopoverPos(compute());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isOpen, anchor.mapX, anchor.mapY, prevNode, nextNode, selectedUnlocked, affordable, prevLocked]);

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

      <div className="chapter-map-wrap" ref={mapWrapRef}>
        <p className="chapter-map__hint">
          Tap a marker to preview it — the price is shown right on the map. Charter it from the
          popup that opens.
        </p>
        <svg
          ref={svgRef}
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
            onClick={() => setSelectedId(isHomeSelected ? null : "home")}
          >
            {isHomeSelected && <circle r="34" className="chapter-map__city-ring" />}
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
            const isSelected = selectedChapter?.id === chapter.id;
            const chapterAffordable = canUnlockChapter(state, chapter);
            return (
              <g
                key={chapter.id}
                className={`chapter-map__city${
                  unlocked ? " chapter-map__city--unlocked" : ""
                }${isSelected ? " chapter-map__city--selected" : ""}${
                  chapterAffordable ? " chapter-map__city--affordable" : ""
                }`}
                style={
                  unlocked
                    ? ({ "--chapter-accent": chapter.accent } as CSSProperties)
                    : undefined
                }
                transform={`translate(${chapter.mapX}, ${chapter.mapY})`}
                onClick={() => setSelectedId(isSelected ? null : chapter.id)}
              >
                {isSelected && <circle r="34" className="chapter-map__city-ring" />}
                <circle r="26" className="chapter-map__city-bg" />
                <svg x={-13} y={-13} width={26} height={26} className="chapter-map__city-icon">
                  {unlocked ? <ChapterPatchIcon patch={chapter.patch} /> : <LockIcon />}
                </svg>
                <text y="42" textAnchor="middle" className="chapter-map__city-label">
                  {unlocked ? chapter.name : "???"}
                </text>
                {!unlocked && (
                  <g
                    className={`chapter-map__price${
                      chapterAffordable ? " chapter-map__price--affordable" : ""
                    }`}
                    transform="translate(0, 56)"
                  >
                    <svg
                      x={-24}
                      y={-9}
                      width={14}
                      height={14}
                      className="chapter-map__price-icon"
                    >
                      <SkullIcon />
                    </svg>
                    <text x={-6} y={3} textAnchor="start" className="chapter-map__price-label">
                      {formatNumber(chapter.unlockCost)}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        <div
          ref={popoverRef}
          className={`chapter-popover chapter-popover--${popoverPos?.placement ?? "below"}${
            isHomeSelected || selectedUnlocked ? " chapter-popover--unlocked" : ""
          }`}
          style={
            {
              left: popoverPos?.left ?? 0,
              top: popoverPos?.top ?? 0,
              visibility: isOpen && popoverPos ? "visible" : "hidden",
              "--chapter-accent": isHomeSelected ? "var(--chrome)" : selected.accent,
              "--arrow-left": `${popoverPos?.arrowLeft ?? POPOVER_WIDTH / 2}px`,
            } as CSSProperties
          }
        >
          <div className="chapter-popover__arrow" />
          <button
            className="chapter-popover__close"
            aria-label="Close"
            onClick={() => setSelectedId(null)}
          >
            <CloseIcon />
          </button>
          {isHomeSelected ? (
            <div className="chapter-popover__content">
              <div className="chapter-popover__patch">
                <ScrapyardIcon />
              </div>
              <div className="chapter-popover__body">
                <span className="chapter-popover__name">{CHAPTER_MAP_HOME.name}</span>
                <span className="chapter-popover__region">Home Base</span>
                <p className="chapter-popover__flavor">{CHAPTER_MAP_HOME.flavor}</p>
              </div>
            </div>
          ) : (
            <div className="chapter-popover__content">
              <div className="chapter-popover__patch">
                <ChapterPatchIcon patch={selected.patch} />
              </div>
              <div className="chapter-popover__body">
                <span className="chapter-popover__name">{selected.name}</span>
                <span className="chapter-popover__region">{selected.region}</span>
                <p className="chapter-popover__flavor">{selected.flavor}</p>

                {selectedUnlocked ? (
                  <>
                    <div className="chapter-popover__bike">
                      <ThrottleIcon className="chapter-popover__bike-icon" />
                      <span>{selected.bikeName}</span>
                    </div>
                    <span className="chapter-popover__bonus">
                      +{(selected.bonus * 100).toFixed(0)}% income
                    </span>
                  </>
                ) : (
                  <>
                    <span className="chapter-popover__bonus">
                      {unlocksTierName
                        ? `Unlocks ${unlocksTierName} · +${(selected.bonus * 100).toFixed(
                            0
                          )}% income`
                        : `+${(selected.bonus * 100).toFixed(0)}% income`}
                    </span>
                    <button
                      className="buy-btn buy-btn--legend chapter-popover__unlock"
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
                      <p className="chapter-popover__hint">Charter {prevChapter!.name} first.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
