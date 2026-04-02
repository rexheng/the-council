/**
 * Test harness: simulates a full council deliberation with mock LLM responses.
 * Verifies the entire pipeline: state management → WebSocket broadcast → sandbox UI.
 *
 * Usage:
 *   npx tsx src/test-harness.ts
 *
 * Then open http://localhost:3000 in a browser to watch the sandbox.
 */

import { CouncilState } from "./state.js";
import type { MemberPosition, MemberChallenge, Verdict } from "./types.js";

const MOCK_DELAY = 1500; // ms between phases — slow enough to watch in the UI

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runMockDeliberation(state: CouncilState) {
  const prompt = "Build me Cursor, make no mistakes";
  const decisionId = state.nextDecisionId();

  console.log("\n🚨 EMERGENCY MEETING\n");
  console.log(`Decision: "${prompt}"\n`);

  // ─── RECON ───
  state.setPhase("recon");
  state.broadcast({
    event: "meeting_called",
    decision: prompt,
    timestamp: Date.now(),
  });
  await sleep(MOCK_DELAY);

  state.broadcast({
    event: "recon_start",
    searches: [
      "cursor code editor architecture",
      "building AI code editor from scratch",
      "tree-sitter vs LSP for code intelligence",
      "electron vs tauri for desktop apps 2025",
    ],
  });
  await sleep(MOCK_DELAY);

  const contextBrief = `[cursor code editor architecture]
• Cursor is built on Electron with a forked VS Code base, using Tree-sitter for parsing and LSP for language intelligence.
• The AI layer handles inline completions, chat, and codebase-wide context retrieval via embeddings.

[building AI code editor from scratch]
• Modern code editors typically layer: shell (Electron/Tauri) → editor (Monaco/CodeMirror) → intelligence (LSP) → AI (completion/chat).
• CodeMirror 6 has better extension architecture than Monaco for custom integrations.

[tree-sitter vs LSP]
• Tree-sitter provides fast incremental parsing for syntax highlighting and structural queries. LSP provides semantic intelligence (go-to-def, completions).
• They complement each other — Tree-sitter for speed, LSP for depth.

[electron vs tauri]
• Tauri produces ~10x smaller binaries than Electron and uses less memory, but has a smaller ecosystem.
• Electron has mature tooling and the entire VS Code extension ecosystem.`;

  state.broadcast({ event: "recon_complete", brief: contextBrief });
  await sleep(MOCK_DELAY);

  // ─── NAIVE PLAN ───
  state.setPhase("naive_plan");
  const naivePlan = `1. Set up Electron app shell
2. Integrate Monaco editor component
3. Implement AI features (completions, chat, context)
4. Add file system support and project management
5. Build extension system
6. Ship it`;

  state.broadcast({ event: "naive_plan", plan: naivePlan });
  console.log("📋 Naive plan generated\n");
  await sleep(MOCK_DELAY);

  // ─── ROUND 1 ───
  state.setPhase("round_1");
  state.broadcast({
    event: "round_1_start",
    members: state.members.map((m) => m.definition.name),
  });
  await sleep(800);

  const positions: MemberPosition[] = [
    {
      memberId: "razor",
      memberName: "RAZOR",
      frameworkAnswers: {
        q1: "Fastest path: fork VS Code, strip unnecessary extensions, add AI layer. 2 weeks to MVP.",
        q2: "Step 3 'implement AI features' hides 80% of the work — completions, chat, codebase indexing, and context retrieval are all separate workstreams.",
        q3: "Extension system (step 5) can be deferred entirely. Ship with hardcoded AI integrations first.",
        q4: "Steps 1-2: 2 days. Step 3: 3 weeks minimum. Step 4: 1 week. Step 5: 2 weeks. Step 6: 1 day.",
      },
      critique:
        "This plan hides catastrophic complexity behind vague bullets. 'Implement AI features' is not a step — it's the entire product. Step 3 needs to be broken into at least 5 sub-tasks: inline completion engine, chat panel UI, codebase indexing pipeline, context retrieval system, and prompt engineering layer. Also, forking VS Code is faster than building from scratch with Electron + Monaco separately.",
      revisedPlan: `1. Fork VS Code (not from scratch — leverage existing editor, fs, extensions)
2. Strip to minimal shell — remove marketplace, telemetry, unused extensions
3. Add inline completion engine (intercept editor events, call AI, stream results)
4. Add chat panel (sidebar webview, conversation state, context injection)
5. Build codebase indexer (file watcher → chunker → embeddings → vector store)
6. Wire context retrieval (query vector store on every AI call)
7. Ship MVP — no extension system, no custom themes, no marketplace`,
      vote: "revised",
      confidence: 0.88,
    },
    {
      memberId: "ghost",
      memberName: "GHOST",
      frameworkAnswers: {
        q1: "At 10x users: AI API rate limits hit, vector store queries spike, editor responsiveness degrades from background indexing.",
        q2: "If Step 3 (AI features) fails: entire product is useless. If Step 4 (file system) corrupts files: catastrophic data loss. No rollback plan mentioned.",
        q3: "Depends on: Electron (heavy, security-sensitive), OpenAI/Anthropic API (rate limits, outages), embedding model (version drift). Any of these breaking cascades.",
        q4: "No error handling for: AI API timeouts, partial completions, malformed responses, concurrent file edits, LSP crashes, out-of-memory during indexing.",
      },
      critique:
        "This plan has zero failure mode analysis. What happens when the LSP server crashes mid-edit? What about concurrent file modifications from AI and user simultaneously? The file system layer (step 4) needs a conflict resolution strategy. The AI layer needs graceful degradation — if the API is down, the editor should still function as a normal code editor, not crash. Also missing: rate limiting, request queuing, and response validation for AI calls.",
      revisedPlan: `1. Set up Electron shell with crash recovery and auto-restart
2. Integrate Monaco with file locking and conflict detection
3. Build AI request queue with: retry logic, timeout handling, graceful degradation
4. Inline completions: debounced, cancellable, with fallback to local completion
5. Chat panel: streaming responses with abort capability
6. File system: atomic writes, backup-before-modify, file watcher with debounce
7. Codebase indexing: background worker with memory limits and incremental updates
8. Integration testing: simulate API failures, concurrent edits, large codebases`,
      vote: "revised",
      confidence: 0.75,
    },
    {
      memberId: "scout",
      memberName: "SCOUT",
      frameworkAnswers: {
        q1: "VS Code is open source (MIT). Cursor literally forked it. Theia is another open-source VS Code alternative. Don't build from scratch.",
        q2: "CodeMirror 6 benchmarks 2-3x faster than Monaco for large files. Tree-sitter WASM bindings exist (web-tree-sitter). LangChain has TS embeddings pipeline.",
        q3: "Electron: stable but heavy (150MB+). Tauri: growing fast but smaller ecosystem. Monaco: mature. CodeMirror 6: gaining momentum, better extension API.",
        q4: "Continue.dev is an open-source AI code assistant. Aider, Cline, and Copilot all have public architectures. Study these before building.",
      },
      critique:
        "This plan reinvents solved problems. Monaco is fine but CodeMirror 6 has a superior extension architecture for the kind of deep AI integration you need. Tree-sitter WASM bindings exist — don't build a parser. The embedding pipeline for codebase indexing is a solved problem (LangChain, LlamaIndex). Also, Continue.dev is fully open source and does 70% of what this plan describes — study it before writing a line of code.",
      revisedPlan: `1. Fork VS Code OR start from CodeMirror 6 + Tauri (evaluate both, decide in day 1)
2. Integrate web-tree-sitter for fast incremental parsing
3. Use existing LSP client libraries (vscode-languageclient patterns)
4. AI layer: study Continue.dev and Aider architectures first
5. Embeddings: use existing chunking strategies from LlamaIndex/LangChain
6. Context retrieval: implement retrieval-augmented generation with hybrid search
7. Ship with existing terminal emulator (xterm.js) rather than building one`,
      vote: "revised",
      confidence: 0.82,
    },
    {
      memberId: "bishop",
      memberName: "BISHOP",
      frameworkAnswers: {
        q1: "After execution: Editor depends on AI depends on Embeddings depends on File System. Circular dependency if AI modifies files.",
        q2: "Steps 3-4 create tight coupling: AI features directly touch the file system. Need an abstraction layer between them.",
        q3: "Correct order: Shell → Storage → Editor → Intelligence → AI. The plan has editor before storage, which means file handling is bolted on after.",
        q4: "Four layers needed: Platform (Electron/Tauri), Editor (Monaco/CM6), Intelligence (LSP + Tree-sitter + Embeddings), and AI (Completions + Chat + Agents).",
      },
      critique:
        "The plan has no architectural layering. It lists features in build order rather than dependency order. You need four distinct layers: Platform (shell, IPC, windowing), Editor (text buffer, syntax, keybindings), Intelligence (LSP, Tree-sitter, embeddings, retrieval), and AI (completions, chat, agents). Each layer should only depend on the layer below it. The current plan would produce a monolith where everything is coupled to everything. Step 4 (file system) should come before Step 2 (editor) because the editor depends on the storage layer.",
      revisedPlan: `1. PLATFORM LAYER: Electron/Tauri shell, IPC bus, window management, process lifecycle
2. STORAGE LAYER: Virtual file system abstraction, atomic writes, watcher, project model
3. EDITOR LAYER: Monaco/CM6 integration, buffer management, syntax via Tree-sitter, keybindings
4. INTELLIGENCE LAYER: LSP client, Tree-sitter queries, codebase indexer, embedding store, retrieval
5. AI LAYER: Completion engine (depends on Intelligence for context), Chat panel, Agent orchestration
6. INTEGRATION: Wire layers via event bus + typed interfaces, not direct imports
7. TESTING: Contract tests between layers to prevent coupling drift`,
      vote: "revised",
      confidence: 0.91,
    },
  ];

  // Broadcast positions one by one with delay (simulating parallel completion at different times)
  for (const pos of positions) {
    state.broadcast({ event: "round_1_position", member: pos.memberName, position: pos });
    console.log(`  ${pos.memberName}: ${pos.vote} (${(pos.confidence * 100).toFixed(0)}%)`);
    await sleep(MOCK_DELAY);
  }

  // All voted "revised" but with different plans — not unanimous on WHICH revision
  state.broadcast({ event: "round_1_complete", unanimous: false });
  console.log("\n⚔️  Split detected — entering Round 2\n");
  await sleep(MOCK_DELAY);

  // ─── ROUND 2 ───
  state.setPhase("round_2");
  state.broadcast({ event: "round_2_start" });
  await sleep(800);

  const challenges: MemberChallenge[] = [
    {
      memberId: "razor",
      memberName: "RAZOR",
      challengeTarget: "BISHOP",
      challenge:
        'Your 7-step layered plan will take 2 months to scaffold before a single AI feature works. "Architecture astronaut" alert — fork VS Code, which already HAS these layers, and add AI on top. Why rebuild what exists?',
      finalVote: "revised_RAZOR",
      previousVote: "revised",
      defected: false,
      confidence: 0.9,
    },
    {
      memberId: "ghost",
      memberName: "GHOST",
      challengeTarget: "RAZOR",
      challenge:
        'Your "fork VS Code" approach inherits 2M lines of code you don\'t understand. When something breaks deep in the VS Code internals — and it will — you\'ll spend days debugging someone else\'s architecture. At least BISHOP\'s layered approach means you own every line.',
      finalVote: "revised_BISHOP",
      previousVote: "revised",
      defected: true,
      confidence: 0.72,
    },
    {
      memberId: "scout",
      memberName: "SCOUT",
      challengeTarget: "GHOST",
      challenge:
        "Your error handling concerns are valid but your revised plan front-loads infrastructure over product. Every successful AI editor (Cursor, Continue, Aider) shipped a working prototype first and hardened later. You can't test error handling for features that don't exist yet.",
      finalVote: "revised_RAZOR",
      previousVote: "revised",
      defected: true,
      confidence: 0.68,
    },
    {
      memberId: "bishop",
      memberName: "BISHOP",
      challengeTarget: "RAZOR",
      challenge:
        "Forking VS Code gives you speed now but technical debt forever. Cursor's team has talked publicly about the pain of maintaining a VS Code fork — every upstream update is a merge nightmare. If you're building 'Cursor' you should learn from Cursor's biggest regret.",
      finalVote: "revised_BISHOP",
      previousVote: "revised",
      defected: false,
      confidence: 0.93,
    },
  ];

  for (const challenge of challenges) {
    state.broadcast({
      event: "rebuttal",
      from: challenge.memberName,
      to: challenge.challengeTarget,
      text: challenge.challenge,
    });
    await sleep(MOCK_DELAY);

    state.broadcast({
      event: "vote",
      member: challenge.memberName,
      option: challenge.finalVote,
      confidence: challenge.confidence,
      defected: challenge.defected,
    });
    console.log(
      `  ${challenge.memberName} → ${challenge.challengeTarget}: ${challenge.finalVote} ${challenge.defected ? "⚠ DEFECTED" : "(held)"}`,
    );
    await sleep(800);
  }

  // ─── VERDICT ───
  state.setPhase("voting");
  await sleep(MOCK_DELAY);

  const verdict: Verdict = {
    winningOption: "revised_BISHOP",
    confidence: 0.78,
    votes: [
      { memberName: "RAZOR", vote: "revised_RAZOR", confidence: 0.9, weight: 0.45 },
      { memberName: "GHOST", vote: "revised_BISHOP", confidence: 0.72, weight: 0.36 },
      { memberName: "SCOUT", vote: "revised_RAZOR", confidence: 0.68, weight: 0.34 },
      { memberName: "BISHOP", vote: "revised_BISHOP", confidence: 0.93, weight: 0.47 },
    ],
    dissent: [
      "RAZOR: Forking VS Code is faster. Layered architecture from scratch is overengineering for an MVP.",
      "SCOUT: Ship prototype first, architect later. Every successful AI editor did this.",
    ],
  };

  state.broadcast({ event: "verdict", verdict });
  console.log(`\n✅ VERDICT: ${verdict.winningOption} (confidence: ${(verdict.confidence * 100).toFixed(0)}%)\n`);
  await sleep(MOCK_DELAY);

  // Update member stats
  for (const member of state.members) {
    const memberVote = challenges.find((c) => c.memberName === member.definition.name);
    member.stats.totalDecisions++;
    if (memberVote?.finalVote === verdict.winningOption) {
      member.stats.wins++;
    } else {
      member.stats.losses++;
    }
    if (memberVote?.defected) {
      member.stats.defections++;
    }
  }

  // ─── SYNTHESIS ───
  state.setPhase("synthesis");
  const finalPlan = `# Build Cursor — Council Plan v1

## Phase 1: Platform Foundation (Week 1)
**Layer: Platform**
- Set up Tauri shell (smaller binary, native performance) with IPC bus
- Window management, process lifecycle, crash recovery
- **Risk (GHOST):** Add auto-restart and state persistence from day 1

## Phase 2: Storage Layer (Week 1-2)
**Layer: Storage**
- Virtual file system abstraction over native FS
- Atomic writes with backup-before-modify (GHOST)
- File watcher with debounce, project model
- **Dependency:** Platform layer must be stable

## Phase 3: Editor Integration (Week 2)
**Layer: Editor**
- CodeMirror 6 integration (SCOUT: better extension API than Monaco)
- Web-tree-sitter for incremental parsing (SCOUT: WASM bindings exist)
- Buffer management, syntax highlighting, keybindings
- **Dependency:** Storage layer for file I/O

## Phase 4: Intelligence Layer (Week 2-3)
**Layer: Intelligence**
- LSP client using existing libraries (SCOUT: vscode-languageclient patterns)
- Codebase indexer: file watcher → chunker → embeddings → vector store
- Hybrid retrieval: keyword + semantic search
- **Risk (GHOST):** Background worker with memory limits, incremental updates
- **Dependency:** Storage + Editor layers

## Phase 5: AI Layer (Week 3-4)
**Layer: AI**
- Inline completion engine: debounced, cancellable, streaming (GHOST)
- Chat panel: sidebar, conversation state, context injection from Intelligence layer
- AI request queue: retry logic, timeout handling, graceful degradation (GHOST)
- **Dependency:** Intelligence layer for context retrieval

## Phase 6: Integration & Hardening (Week 4)
- Wire layers via typed event bus (BISHOP: no direct cross-layer imports)
- Contract tests between layers (BISHOP: prevent coupling drift)
- Simulate: API failures, concurrent edits, large codebases (GHOST)
- **Defer to v2:** Extension system, marketplace, custom themes (RAZOR)

## ⚠️ DISSENT
- **RAZOR:** Forking VS Code is 3x faster to MVP. This plan over-architects for a first version.
- **SCOUT:** Study Continue.dev and Aider before building — 70% of this is solved.

## Architecture Diagram
\`\`\`
┌─────────────────────────────────┐
│          AI LAYER               │ ← completions, chat, agents
├─────────────────────────────────┤
│     INTELLIGENCE LAYER          │ ← LSP, tree-sitter, embeddings, retrieval
├─────────────────────────────────┤
│        EDITOR LAYER             │ ← CodeMirror 6, buffers, syntax, keys
├─────────────────────────────────┤
│       STORAGE LAYER             │ ← VFS, atomic writes, watcher, project model
├─────────────────────────────────┤
│       PLATFORM LAYER            │ ← Tauri, IPC, windows, process lifecycle
└─────────────────────────────────┘
\`\`\``;

  state.broadcast({
    event: "synthesis_complete",
    finalPlan,
    dissent: verdict.dissent,
  });
  console.log("📝 Final plan synthesized\n");
  await sleep(MOCK_DELAY);

  // Record decision
  state.recordDecision({
    id: decisionId,
    timestamp: Date.now(),
    prompt,
    naivePlan,
    positions,
    challenges,
    verdict,
    finalPlan,
  });

  state.setPhase("idle");
  console.log("✅ Deliberation complete. Check the sandbox at http://localhost:3000\n");
}

// ─── Main ───
async function main() {
  const state = new CouncilState();
  state.startWebSocketServer(3099);

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  THE COUNCIL — Test Harness");
  console.log("  WebSocket: ws://localhost:3099");
  console.log("  Sandbox:   http://localhost:3000 (start with: cd sandbox && npm run dev)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  console.log("Waiting 3 seconds for sandbox UI to connect...\n");

  await sleep(3000);
  await runMockDeliberation(state);

  // Keep process alive so WebSocket stays open
  console.log("Server still running. Press Ctrl+C to exit.");
  await new Promise(() => {}); // Block forever
}

main().catch(console.error);
