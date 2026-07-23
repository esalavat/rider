import type React from "react";
import { BugIcon, MapPinIcon, PatchIcon, SkullIcon, WrenchIcon } from "./icons";

export type TabId = "rackets" | "recruits" | "chapters" | "legacy" | "dev";

const TABS: { id: TabId; label: string; icon: (p: { className?: string }) => React.JSX.Element }[] = [
  { id: "rackets", label: "Rackets", icon: WrenchIcon },
  { id: "recruits", label: "Recruits", icon: PatchIcon },
  { id: "chapters", label: "Chapters", icon: MapPinIcon },
  { id: "legacy", label: "Legacy", icon: SkullIcon },
];

const DEV_TAB = { id: "dev" as const, label: "Dev", icon: BugIcon };

interface TabNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  showDev?: boolean;
}

export function TabNav({ active, onChange, showDev }: TabNavProps) {
  const tabs = showDev ? [...TABS, DEV_TAB] : TABS;

  return (
    <nav className="tab-nav">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`tab-nav__btn${active === id ? " tab-nav__btn--active" : ""}`}
          onClick={() => onChange(id)}
        >
          <Icon className="tab-nav__icon" />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
