# The Council

**An Among Us-themed AI agent council that turns single-agent planning into structured multi-perspective debate.**

> _"Build me Cursor, make no mistakes."_
>
> One prompt. Four crewmates. One plan survives.

Built for [Cursor Hack London 2026](https://cursorhacklondon2026.vercel.app/) — Track C: Agent Runtime Tools (Bounty #08)

---

## Install (one command)

```bash
curl -fsSL https://raw.githubusercontent.com/ViktorSmirnov71/the-council/main/setup.sh | bash
```

Or manually:

```bash
git clone https://github.com/ViktorSmirnov71/the-council.git
cd the-council
cd mcp-server && npm install && cd ..
echo "ANTHROPIC_API_KEY=sk-ant-your-key" > .env
cp .cursor/mcp.json.example .cursor/mcp.json  # edit with your key + path
```

Then open the folder in **Cursor** or **Claude Code** and ask:

> _"Use council_plan to plan: build me Cursor, make no mistakes"_

The Among Us sandbox opens automatically in your browser.

---

## What Is This?

The Council is an MCP server that intercepts planning requests and runs them through a deliberation sandbox before a single line of code is written.

Instead of one agent producing one unchallenged plan, The Council spawns four AI crewmates — each with a distinct engineering perspective — who critique, debate, and vote on the plan in real-time. The worst-performing council members get executed. New ones are born. The council evolves.

**The sandbox is visualized as an Among Us emergency meeting**, complete with crewmates around a table, speech bubbles, vote bars, and a gallows for underperformers.

## How It Works

```
User prompt
    │
    ▼
┌─────────────┐
│   RECON      │  Web searches gather real-world context
└──────┬──────┘
       ▼
┌─────────────┐
│  NAIVE PLAN  │  Single-agent baseline plan (the "before")
└──────┬──────┘
       ▼
┌─────────────────────────────────────────┐
│         EMERGENCY MEETING               │
│                                         │
│   🟥 RAZOR    🟦 GHOST                  │
│   The Shipper  The Paranoid             │
│                                         │
│        ┌──────────────┐                 │
│        │ MEETING TABLE │                │
│        └──────────────┘                 │
│                                         │
│   🟩 SCOUT    🟨 BISHOP                 │
│   The Researcher The Architect          │
│                                         │
│   Round 1: Isolated critique (parallel) │
│   Round 2: Challenges + rebuttals       │
│   Round 3: Final vote                   │
│                                         │
│   ⚰️ Lowest performer → gallows         │
└──────────────────┬──────────────────────┘
       ▼
┌─────────────┐
│ REFINED PLAN │  Synthesis of all critiques → actionable plan
└──────┬──────┘
       ▼
  Returned to agent for execution
```

## The Council Members

| Crewmate | Color | Role | Evaluation Framework |
|----------|-------|------|---------------------|
| **RAZOR** | 🟥 Red | The Shipper | What's the fastest path? What can be deferred? What's the real effort? |
| **GHOST** | 🟦 Blue | The Paranoid | What fails at 10x load? What's the rollback plan? What dependencies are risky? |
| **SCOUT** | 🟩 Green | The Researcher | What existing solutions exist? What do benchmarks say? What's the adoption trend? |
| **BISHOP** | 🟨 Yellow | The Architect | What's the dependency graph? Does this create coupling? What does this look like in 6 months? |

Each member answers their framework questions **in isolation** before seeing any other member's position. This prevents convergence — you get four genuinely different perspectives.

## The Reaper (Evolution)

After every N decisions:
- Each member's track record is scored (vote accuracy vs outcomes)
- The lowest performer gets **executed** (gallows animation in the sandbox)
- A new member spawns with mutated traits inherited from top performers
- Lineage is tracked: `GHOST-v3 (descended from GHOST-v2 + RAZOR-v1)`

## Anti-Convergence Design

The #1 problem with multi-agent systems is that agents converge to the same answer. The Council prevents this structurally:

1. **Isolated Round 1** — No member sees another's output. All calls run in parallel.
2. **Forced evaluation frameworks** — Each member must answer different questions before reaching a conclusion.
3. **Defection penalty** — Changing your vote between rounds costs reputation. Bandwagoning is punished.
4. **Structured output** — JSON responses, not essays. Votes count, not word count.

## MCP Tools

```
council_plan        Submit a prompt for council deliberation
council_members     View current roster + track records
council_history     Past decisions and outcomes
council_override    Human corrects a verdict (feeds reaper scoring)
council_sandbox     Get the live visualization URL
```

## Tech Stack

- **MCP Server**: Node.js / TypeScript
- **Sandbox UI**: Next.js + Framer Motion
- **Real-time**: WebSocket (server → UI event stream)
- **LLM**: Claude via Anthropic API (parallel calls per council member)
- **Web Search**: Recon phase context gathering

## Project Structure

```
the-council/
├── mcp-server/              # The MCP server (runtime primitive)
│   ├── src/
│   │   ├── index.ts         # MCP server entry + tool definitions
│   │   ├── council.ts       # Deliberation engine
│   │   ├── members.ts       # Member definitions + prompt templates
│   │   ├── reaper.ts        # Evolution logic
│   │   ├── recon.ts         # Web search context gathering
│   │   ├── synthesis.ts     # Plan synthesis from critiques
│   │   └── state.ts         # In-memory state + WebSocket broadcast
│   ├── package.json
│   └── tsconfig.json
│
├── sandbox/                 # Among Us visualization (demo UI)
│   ├── src/
│   │   ├── app/
│   │   │   └── page.tsx     # Main sandbox view
│   │   ├── components/
│   │   │   ├── MeetingTable.tsx
│   │   │   ├── Crewmate.tsx
│   │   │   ├── SpeechBubble.tsx
│   │   │   ├── VoteBar.tsx
│   │   │   ├── Gallows.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   └── ReaperAnimation.tsx
│   │   ├── hooks/
│   │   │   └── useCouncilSocket.ts
│   │   └── lib/
│   │       └── types.ts
│   ├── package.json
│   └── next.config.js
│
├── docs/
│   ├── ARCHITECTURE.md      # Technical deep-dive
│   ├── DELIBERATION.md      # How the council deliberates
│   └── DEMO-SCRIPT.md       # 4-minute demo walkthrough
│
└── README.md
```

## Hackathon Context

- **Event**: Cursor Hack London 2026
- **Track**: C — Agent Runtime Tools
- **Bounty**: #08 — "Make agents justify their decisions before they act"
- **Side Quests**: Best Developer Tool, Best Reliability System, Best Demo
- **Team Size**: 2

## License

MIT
