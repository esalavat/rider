import type React from "react";
import type { RacketIconId } from "../game/types";

type IconProps = { className?: string };

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ScrapyardIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <path d="M8 38h32" />
      <path d="M12 38V22l8-6 8 6v16" />
      <path d="M28 38V16l8-6v28" />
      <path d="M12 28h8" />
    </svg>
  );
}

export function ChopShopIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <circle cx="14" cy="34" r="5" />
      <circle cx="34" cy="34" r="5" />
      <path d="M14 34l8-16h9l5 8" />
      <path d="M22 18l4 8h8" />
      <path d="M8 34h2" />
    </svg>
  );
}

export function PaintIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <path d="M16 10h16l3 8-3 4H16l-3-4z" />
      <path d="M20 22v9a4 4 0 004 4 4 4 0 004-4v-9" />
      <path d="M17 41h14" />
    </svg>
  );
}

export function BarIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <path d="M14 10h20l-8 14v14" />
      <path d="M18 38h12" />
      <path d="M14 10l6 8h8l6-8" />
    </svg>
  );
}

export function TattooIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <path d="M24 6c-6 6-10 12-10 19a10 10 0 0020 0c0-7-4-13-10-19z" />
      <path d="M24 18v14" />
      <path d="M19 27h10" />
    </svg>
  );
}

export function PokerIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <rect x="10" y="14" width="14" height="20" rx="2" />
      <rect x="24" y="10" width="14" height="20" rx="2" />
      <path d="M28 16l6 6M34 16l-6 6" />
    </svg>
  );
}

export function SmugglingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <rect x="8" y="20" width="24" height="14" rx="1" />
      <path d="M32 26h6l4 6v2h-10z" />
      <circle cx="16" cy="36" r="3" />
      <circle cx="34" cy="36" r="3" />
    </svg>
  );
}

export function SpeedwayIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <path d="M6 24c4-10 10-16 18-16s14 6 18 16c-4 10-10 16-18 16S10 34 6 24z" />
      <path d="M6 24h36" />
      <path d="M14 16l6 16M34 16l-6 16" />
    </svg>
  );
}

const RACKET_ICONS: Record<RacketIconId, (p: IconProps) => React.JSX.Element> = {
  scrapyard: ScrapyardIcon,
  chopshop: ChopShopIcon,
  paint: PaintIcon,
  bar: BarIcon,
  tattoo: TattooIcon,
  poker: PokerIcon,
  smuggling: SmugglingIcon,
  speedway: SpeedwayIcon,
};

export function RacketIcon({
  id,
  className,
}: {
  id: RacketIconId;
  className?: string;
}) {
  const Cmp = RACKET_ICONS[id];
  return <Cmp className={className} />;
}

export function SkullIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <path d="M24 6C14 6 8 13 8 22c0 6 3 10 6 13v5h20v-5c3-3 6-7 6-13 0-9-6-16-16-16z" />
      <circle cx="17" cy="22" r="3" fill="currentColor" stroke="none" />
      <circle cx="31" cy="22" r="3" fill="currentColor" stroke="none" />
      <path d="M21 30h6M20 40h8" />
    </svg>
  );
}

export function PatchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <path d="M24 4l6 6h8v8l6 6-6 6v8h-8l-6 6-6-6h-8v-8l-6-6 6-6v-8h8z" />
      <circle cx="24" cy="24" r="6" />
    </svg>
  );
}

export function OfficerPatchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <path d="M24 4l6 6h8v8l6 6-6 6v8h-8l-6 6-6-6h-8v-8l-6-6 6-6v-8h8z" />
      <path d="M24 18l2.5 5.2 5.7.6-4.2 4 1.1 5.7-5.1-2.8-5.1 2.8 1.1-5.7-4.2-4 5.7-.6z" />
    </svg>
  );
}

export function WrenchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <path d="M31 10a9 9 0 00-11 11L8 33l7 7 12-12a9 9 0 0011-11l-6 6-6-2-2-6z" />
    </svg>
  );
}

export function ThrottleIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" className={className} {...base}>
      <circle cx="14" cy="34" r="6" />
      <circle cx="38" cy="34" r="6" />
      <path d="M20 34h6l4-14h8" />
      <path d="M18 20h10l4-8" />
      <path d="M14 28V16h6" />
    </svg>
  );
}
