"use client";

import { useCouncilSocket } from "@/hooks/useCouncilSocket";
import { MeetingRoom } from "@/components/MeetingRoom";
import { SpeechPanel } from "@/components/SpeechPanel";
import { VotePanel } from "@/components/VotePanel";
import { Leaderboard } from "@/components/Leaderboard";
import { PhaseBar } from "@/components/PhaseBar";

export default function Home() {
  const council = useCouncilSocket();

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Status bar */}
      <PhaseBar
        phase={council.phase}
        decision={council.decision}
        connected={council.connected}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left: Meeting room canvas (map + agents) */}
        <div style={{ flex: 2, position: "relative" }}>
          <MeetingRoom
            members={council.members}
            phase={council.phase}
            positions={council.positions}
            votes={council.votes}
            reaper={council.reaper}
            finalPlan={council.finalPlan}
          />
        </div>

        {/* Right: Speech + Vote + Leaderboard */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderLeft: "2px solid #222",
            maxWidth: 420,
            background: "#0a0a18",
          }}
        >
          <SpeechPanel
            phase={council.phase}
            decision={council.decision}
            naivePlan={council.naivePlan}
            positions={council.positions}
            rebuttals={council.rebuttals}
            searchQueries={council.searchQueries}
            reconResults={council.reconResults}
            contextBrief={council.contextBrief}
            finalPlan={council.finalPlan}
          />
          <VotePanel votes={council.votes} verdict={council.verdict} />
          <div style={{ borderTop: "1px solid #222", minHeight: 120 }}>
            <Leaderboard members={council.members} />
          </div>
        </div>
      </div>
    </div>
  );
}
