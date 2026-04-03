# Amogus

**A decision layer for AI agents — structured multi-perspective deliberation via MCP.**

> _"Build me Cursor, make no mistakes."_
>
> One prompt. Four crewmates. One plan survives.

Built for [Cursor Hack London 2026](https://cursorhacklondon2026.vercel.app/) | **Track C: Agent Runtime Tools** | **Bounty #08**

![The Council — Isolation Round](docs/screenshots/round1-full.png)

---

## The Problem

When you ask an AI agent to plan a complex project, you get **one unchallenged perspective**. The agent produces a confident-sounding plan and nobody questions whether step 3 is actually five steps, whether the dependency order is wrong, or whether a better library exists.

Real engineering teams don't work this way. A plan gets challenged by the person who wants to ship fast, the person who's paranoid about failure modes, the person who knows the ecosystem, and the person who thinks in systems. The tension between these perspectives is what produces good plans.

**Single-agent planning has no tension. The Council adds it.**

## The Track: Agent Runtime Tools

> *"Tools that improve how agents choose models, use MCPs, invoke skills, or reason about decisions."*
> — Cursor Hack London 2026, Track C

The Council is a **runtime primitive** — an MCP server that any agent can call to get a decision evaluated through structured disagreement. It's not a workflow or a business app. It's a tool that makes agents reason better before they act.

**Bounty #08: "Make agents justify their decisions before they act"**

Acceptance criteria:
- Decision pulls from 2+ external quality signals *(recon phase: web search + context gathering)*
- System explains its recommendation in a way a human can review *(full deliberation transcript with per-member reasoning)*
- Chosen action is actually executed or prepared automatically *(synthesized plan returned to calling agent)*

## How We Solve It

### The Core Insight: Structural Isolation Prevents Convergence

The #1 problem with multi-agent systems is that LLM agents **converge to the same answer**. When Agent B sees Agent A's reasoning, B's most likely completion is "I agree because..." — it's the path of least resistance in the probability distribution.

The Council prevents this architecturally, not with prompt tricks:

```
┌─────────────────────────────────────────────────────────────┐
│                    ROUND 1: ISOLATION                        │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  RAZOR   │ │  GHOST   │ │  SCOUT   │ │  BISHOP  │       │
│  │          │ │          │ │          │ │          │       │
│  │ Sees:    │ │ Sees:    │ │ Sees:    │ │ Sees:    │       │
│  │ • prompt │ │ • prompt │ │ • prompt │ │ • prompt │       │
│  │ • context│ │ • context│ │ • context│ │ • context│       │
│  │ • plan   │ │ • plan   │ │ • plan   │ │ • plan   │       │
│  │          │ │          │ │          │ │          │       │
│  │ CANNOT   │ │ CANNOT   │ │ CANNOT   │ │ CANNOT   │       │
│  │ see any  │ │ see any  │ │ see any  │ │ see any  │       │
│  │ other    │ │ other    │ │ other    │ │ other    │       │
│  │ member   │ │ member   │ │ member   │ │ member   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│       │            │            │            │              │
│       ▼            ▼            ▼            ▼              │
│              ALL VOTES REVEALED SIMULTANEOUSLY              │
│                                                              │
│  If unanimous → skip to synthesis                           │
│  If split → ROUND 2: challenges + rebuttals                │
└─────────────────────────────────────────────────────────────┘
```

**Three mechanisms enforce diversity:**

1. **Forced evaluation frameworks** — Each member MUST answer different questions before forming a position. Different questions → different reasoning chains → different votes.

2. **Defection penalty** — Changing your vote between rounds costs reputation. The Reaper tracks defections. This structurally prevents bandwagoning.

3. **Structured output** — JSON responses, not essays. Votes are counted, not paragraphs. No agent can "out-talk" another.

![Round 1 — Isolated Deliberation](docs/screenshots/round1-isolation.png)

### The Pipeline

```
User prompt ("build me Cursor")
    │
    ▼
┌─────────────────┐
│  RECON           │  Extract topics → parallel web searches → context brief
└────────┬────────┘
         ▼
┌─────────────────┐
│  NAIVE PLAN      │  Single-agent baseline (the "before" — deliberately unchallenged)
└────────┬────────┘
         ▼
┌─────────────────┐
│  ROUND 1         │  4 parallel LLM calls, completely isolated
│  (isolation)     │  Each member answers their framework questions
│                  │  Each proposes critique + revised plan + vote
└────────┬────────┘
         ▼
┌─────────────────┐
│  ROUND 2         │  All positions revealed simultaneously
│  (challenges)    │  Each member challenges ONE other member
│                  │  Each submits final vote (hold or defect)
└────────┬────────┘
         ▼
┌─────────────────┐
│  VERDICT         │  Weighted vote: confidence × track record
│                  │  Dissenting opinions preserved
└────────┬────────┘
         ▼
┌─────────────────┐
│  SYNTHESIS       │  Neutral "clerk" compiles all critiques into
│                  │  a structured plan with attributions
└────────┬────────┘
         ▼
┌─────────────────┐
│  REAPER          │  Every 5 decisions: worst performer executed
│  (evolution)     │  New member spawns with mutated traits from top performer
└─────────────────┘
```

### The Council Members

Each member has a **forced evaluation framework** — specific questions they must answer before forming any position. This is the key anti-convergence mechanism: even with the same LLM, asking different questions produces different reasoning.

| Member | Archetype | Framework Questions |
|--------|-----------|-------------------|
| **RAZOR** (Red) | The Shipper | Fastest path to working implementation? Where does the plan hide complexity? What can be deferred to v2? Realistic effort estimates? |
| **GHOST** (Purple) | The Paranoid | What fails at 10x load? Rollback plan for each step? Which dependencies could break? What error cases are unhandled? |
| **SCOUT** (Green) | The Researcher | What existing solutions solve this? What do benchmarks say? What's the adoption trajectory? What prior art is being ignored? |
| **BISHOP** (Yellow) | The Architect | What's the dependency graph after execution? Does this create coupling? Correct step ordering? What layers should be defined? |

**Natural 2v2 tensions:** RAZOR+SCOUT ("just use the library and ship") vs GHOST+BISHOP ("build it properly with guardrails"). This is how real engineering teams function.

### The Reaper (Evolutionary Pressure)

Every 5 decisions, the council evolves:

```
score = (wins + override_matches) / total_decisions - (defections × 0.5 / total)

If lowest score < 0.3:
  → EXECUTE lowest performer
  → SPAWN replacement with:
    - Random base archetype
    - One framework question inherited from top performer
    - Lineage tracked: "GHOST-v3 (paranoid + RAZOR traits)"
```

Bad reasoning patterns get culled. Successful traits propagate. The council adapts to the human's actual preferences through the `council_override` feedback loop.

![Synthesis — Final Plan Assembly](docs/screenshots/synthesis.png)

### The Sandbox (Among Us Visualization)

The entire deliberation is visualized in real-time as an Among Us emergency meeting:

- **Recon phase** — Crewmates hustle between research stations (WEB SEARCH, DOCS, BENCHMARKS, GITHUB) with animated screens and data conduit lines
- **Round 1** — Crewmates walk to isolation pods with lock icons, speech bubbles show critiques
- **Round 2** — Crewmates converge on a wooden meeting table for debate, challenge lines connect members
- **Voting** — Vote bars fill with colored member dots, defection warnings flash
- **Synthesis** — Crewmates orbit the center as data particles flow into a central document that types itself with color-coded attributions
- **Reaper** — Red vignette, lowest performer dragged to the gallows, new member spawns

The sandbox is served directly by the MCP server — no separate process needed. Browser opens automatically on first `council_plan` call.

## MCP Interface

```
council_plan        Submit a prompt for full council deliberation
council_members     View current roster, stats, and lineage
council_history     Past decisions with vote breakdowns
council_override    Human corrects a verdict (feeds reaper scoring)
council_sandbox     Open the live visualization
```

Any MCP client (Cursor, Claude Code, etc.) can call these tools. The council is editor-agnostic.

## Install

**One command:**

```bash
curl -fsSL https://raw.githubusercontent.com/rexheng/amogus/main/setup.sh | bash
```

**Or manually:**

```bash
git clone https://github.com/rexheng/amogus.git
cd the-council
cd mcp-server && npm install && cd ..
echo "ANTHROPIC_API_KEY=sk-ant-your-key" > .env
cp .cursor/mcp.json.example .cursor/mcp.json  # edit with your key + path
```

Then open the folder in **Cursor** or **Claude Code** and ask:

> _"Use council_plan to plan: build me Cursor, make no mistakes"_

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| MCP Server | Node.js / TypeScript | MCP SDK runs on Node, stdio transport |
| Deliberation | Anthropic Claude API | Parallel calls per member, structured JSON output |
| Sandbox UI | Next.js (static export) | Served directly by MCP server, no separate process |
| Rendering | HTML5 Canvas | One room scene, no framework overhead |
| Real-time | WebSocket | Server pushes events as deliberation progresses |
| Port management | Auto-probe | Finds open port, never crashes on EADDRINUSE |

## Project Structure

```
the-council/
├── mcp-server/src/
│   ├── index.ts         # MCP entry — 5 tools, stdout protection, env loading
│   ├── council.ts       # Deliberation engine — recon → rounds → verdict → synthesis
│   ├── members.ts       # 4 archetypes with forced evaluation frameworks
│   ├── reaper.ts        # Evolution — score, execute, mutate, spawn
│   ├── recon.ts         # Context gathering via web search
│   ├── synthesis.ts     # Neutral clerk — compiles critiques into plan
│   └── state.ts         # HTTP server + WebSocket + port management
│
├── sandbox/src/
│   ├── components/
│   │   ├── MeetingRoom.tsx   # Canvas renderer — map, crewmates, animations
│   │   ├── SpeechPanel.tsx   # Right sidebar — critiques, rebuttals, plan
│   │   ├── VotePanel.tsx     # Vote bars with member dots
│   │   ├── Gallows.tsx       # Execution display
│   │   ├── Leaderboard.tsx   # Member rankings
│   │   └── PhaseBar.tsx      # Phase progress indicator
│   └── hooks/
│       └── useCouncilSocket.ts  # WebSocket state management
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DELIBERATION.md
│   └── DEMO-SCRIPT.md
│
└── setup.sh             # One-command install
```

## Side Quests

| Side Quest | How We Hit It |
|-----------|---------------|
| **Best Developer Tool** | Every developer has the "unchallenged plan" problem. One MCP call gives any agent a council. |
| **Best Reliability System** | Full audit trail: every vote, every reason, every rebuttal, every defection. Human override feeds back into scoring. |
| **Best Demo** | Among Us sandbox with real-time crewmate movement, typing documents, gallows executions. Judges watch the council deliberate live. |

## Hackathon

- **Event**: [Cursor Hack London 2026](https://cursorhacklondon2026.vercel.app/)
- **Track**: C — Agent Runtime Tools
- **Bounty**: #08 — "Make agents justify their decisions before they act"
- **Team**: 2 people, 5 hours

## License

MIT
