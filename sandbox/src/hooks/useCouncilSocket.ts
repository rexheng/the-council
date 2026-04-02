"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { SandboxEvent, CouncilPhase, MemberInfo, MemberPosition } from "@/lib/types";

export interface CouncilSocketState {
  connected: boolean;
  phase: CouncilPhase;
  members: MemberInfo[];
  decision: string;
  naivePlan: string;
  positions: Map<string, MemberPosition>;
  rebuttals: Array<{ from: string; to: string; text: string }>;
  votes: Array<{ member: string; option: string; confidence: number; defected: boolean }>;
  verdict: SandboxEvent & { event: "verdict" } | null;
  finalPlan: string;
  reaper: SandboxEvent & { event: "reaper" } | null;
  searchQueries: string[];
  contextBrief: string;
}

const INITIAL_STATE: CouncilSocketState = {
  connected: false,
  phase: "idle",
  members: [],
  decision: "",
  naivePlan: "",
  positions: new Map(),
  rebuttals: [],
  votes: [],
  verdict: null,
  finalPlan: "",
  reaper: null,
  searchQueries: [],
  contextBrief: "",
};

export function useCouncilSocket(url?: string) {
  // Auto-detect: connect to the same host/port that served the page
  const wsUrl = url ?? (typeof window !== "undefined"
    ? `ws://${window.location.host}`
    : "ws://localhost:3099");
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<CouncilSocketState>(INITIAL_STATE);
  const [eventLog, setEventLog] = useState<SandboxEvent[]>([]);

  const pushEvent = useCallback((event: SandboxEvent) => {
    setEventLog((prev) => [...prev.slice(-100), event]); // Keep last 100 events
  }, []);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, connected: true }));
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };

    ws.onmessage = (msg) => {
      let event: SandboxEvent;
      try {
        event = JSON.parse(msg.data);
      } catch {
        return;
      }

      pushEvent(event);

      setState((prev) => {
        switch (event.event) {
          case "state_sync":
            return {
              ...prev,
              phase: event.phase,
              members: event.members,
            };

          case "phase_change":
            return { ...prev, phase: event.phase };

          case "meeting_called":
            return {
              ...INITIAL_STATE,
              connected: true,
              members: prev.members,
              phase: "recon",
              decision: event.decision,
            };

          case "recon_start":
            return { ...prev, searchQueries: event.searches };

          case "recon_complete":
            return { ...prev, contextBrief: event.brief };

          case "naive_plan":
            return { ...prev, naivePlan: event.plan };

          case "round_1_position": {
            const positions = new Map(prev.positions);
            positions.set(event.member, event.position);
            return { ...prev, positions };
          }

          case "rebuttal":
            return {
              ...prev,
              rebuttals: [
                ...prev.rebuttals,
                { from: event.from, to: event.to, text: event.text },
              ],
            };

          case "vote":
            return {
              ...prev,
              votes: [
                ...prev.votes,
                {
                  member: event.member,
                  option: event.option,
                  confidence: event.confidence,
                  defected: event.defected,
                },
              ],
            };

          case "verdict":
            return { ...prev, verdict: event };

          case "synthesis_complete":
            return { ...prev, finalPlan: event.finalPlan };

          case "reaper":
            return { ...prev, reaper: event };

          default:
            return prev;
        }
      });
    };

    return () => {
      ws.close();
    };
  }, [wsUrl, pushEvent]);

  return { ...state, eventLog };
}
