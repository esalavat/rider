import { useState } from "react";
import { Header } from "./components/Header";
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
    kickstart,
    renameClub,
  } = useGameState();

  const [tab, setTab] = useState<TabId>("rackets");

  return (
    <div className="app-shell">
      <Header state={state} onRename={renameClub} />

      <main className="app-main">
        {tab === "rackets" && (
          <RacketsTab
            state={state}
            onBuy={buyRacket}
            onBuyMax={buyMaxRackets}
            onBuyMilestone={buyRacketMilestone}
            onKickstart={kickstart}
          />
        )}
        {tab === "recruits" && (
          <RecruitsTab
            state={state}
            onBuy={buyMemberTier}
            onBuyMax={buyMaxMemberTier}
          />
        )}
        {tab === "legacy" && (
          <LegacyTab
            state={state}
            onBuyUpgrade={buyLegacyUpgrade}
            onPrestige={doPrestige}
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
