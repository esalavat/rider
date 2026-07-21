import type React from "react";
import { PatchIcon, SkullIcon, WrenchIcon } from "./icons";

export type TabId = "rackets" | "recruits" | "legacy";

const TABS: { id: TabId; label: string; icon: (p: { className?: string }) => React.JSX.Element }[] = [
  { id: "rackets", label: "Rackets", icon: WrenchIcon },
  { id: "recruits", label: "Recruits", icon: PatchIcon },
  { id: "legacy", label: "Legacy", icon: SkullIcon },
];

interface TabNavProps {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function TabNav({ active, onChange }: TabNavProps) {
  return (
    <nav className="tab-nav">
      {TABS.map(({ id, label, icon: Icon }) => (
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
