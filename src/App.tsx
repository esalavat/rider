import { useState } from "react";
import { ChaptersTab } from "./components/ChaptersTab";
import { Header } from "./components/Header";
import { ThrottleIcon } from "./components/icons";
import { LegacyTab } from "./components/LegacyTab";
import { RacketsTab } from "./components/RacketsTab";
import { RecruitsTab } from "./components/RecruitsTab";
import { TabNav, type TabId } from "./components/TabNav";
import { WelcomeBackModal } from "./components/WelcomeBackModal";
import { useGameState } from "./game/useGameState";

export default function App() {
  const {
    state,
    offlineReport,
    dismissOfflineReport,
    buyRacket,
    buyMaxRackets,
    buyRacketMilestone,
    buyMemberTier,
    buyMaxMemberTier,
    buyLegacyUpgrade,
    doPrestige,
    unlockChapter,
    kickstart,
    renameClub,
    hardReset,
  } = useGameState();

  const [tab, setTab] = useState<TabId>("rackets");

  return (
    <div className="app-shell">
      <div className="app-sticky-top">
        <Header state={state} onRename={renameClub} />
        {tab === "rackets" && (
          <div className="kickstart-bar">
            <button className="kickstart-btn" onClick={kickstart}>
              <ThrottleIcon className="kickstart-btn__icon" />
              <span>Twist the Throttle</span>
            </button>
          </div>
        )}
      </div>

      <main className="app-main">
        {tab === "rackets" && (
          <RacketsTab
            state={state}
            onBuy={buyRacket}
            onBuyMax={buyMaxRackets}
            onBuyMilestone={buyRacketMilestone}
          />
        )}
        {tab === "recruits" && (
          <RecruitsTab
            state={state}
            onBuy={buyMemberTier}
            onBuyMax={buyMaxMemberTier}
          />
        )}
        {tab === "chapters" && (
          <ChaptersTab state={state} onUnlock={unlockChapter} />
        )}
        {tab === "legacy" && (
          <LegacyTab
            state={state}
            onBuyUpgrade={buyLegacyUpgrade}
            onPrestige={doPrestige}
            onHardReset={hardReset}
          />
        )}
      </main>

      <TabNav active={tab} onChange={setTab} />

      {offlineReport && (
        <WelcomeBackModal
          report={offlineReport}
          onDismiss={dismissOfflineReport}
        />
      )}
    </div>
  );
}
