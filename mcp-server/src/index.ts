import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CouncilState } from "./state.js";
import { deliberate } from "./council.js";

const state = new CouncilState();

// Start unified HTTP + WebSocket server (serves sandbox UI + real-time events)
state.startServer(3099);

const server = new McpServer({
  name: "the-council",
  version: "0.1.0",
});

// ─── council_plan ───
server.tool(
  "council_plan",
  "Submit a prompt for the council to deliberate on. The council will research context, generate a naive plan, then four AI council members with distinct engineering perspectives will independently critique it, debate, and vote. Returns a refined plan synthesized from their deliberation. Automatically opens the Among Us sandbox visualization in your browser.",
  {
    prompt: z.string().describe("The project or task prompt to plan for"),
    context: z
      .string()
      .optional()
      .describe("Additional context to include in the deliberation"),
  },
  async ({ prompt, context }) => {
    // Auto-open the sandbox on first call
    state.openBrowser();

    try {
      const result = await deliberate(state, {
        prompt,
        context: context ?? undefined,
      });

      const sandboxUrl = state.getSandboxUrl();
      return {
        content: [
          {
            type: "text",
            text: `# Council Deliberation Complete (${result.decisionId})

## Verdict
${result.verdict.winningOption} (confidence: ${(result.verdict.confidence * 100).toFixed(0)}%)

### Vote Breakdown
${result.verdict.votes.map((v) => `- **${v.memberName}**: ${v.vote} (confidence: ${(v.confidence * 100).toFixed(0)}%, weight: ${v.weight.toFixed(2)})`).join("\n")}

${result.verdict.dissent.length > 0 ? `### Dissenting Opinions\n${result.verdict.dissent.map((d) => `- ${d}`).join("\n")}` : "### Unanimous Decision"}

---

## Final Plan

${result.finalPlan}

---

*Council sandbox: ${sandboxUrl}*
*Decision ${result.decisionId} logged to history*`,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      state.broadcast({ event: "error", message });
      return {
        content: [{ type: "text", text: `Council deliberation failed: ${message}` }],
        isError: true,
      };
    }
  },
);

// ─── council_members ───
server.tool(
  "council_members",
  "View the current council roster, their archetypes, track records, and lineage. Shows which members have been executed and replaced by the reaper.",
  {},
  async () => {
    const roster = state.members.map((m) => {
      const winRate =
        m.stats.totalDecisions > 0
          ? ((m.stats.wins / m.stats.totalDecisions) * 100).toFixed(0)
          : "N/A";
      return `**${m.definition.name}-v${m.generation}** (${m.definition.archetype})
  Color: ${m.definition.color} | Accessory: ${m.definition.accessory}
  Record: ${m.stats.wins}W-${m.stats.losses}L (${winRate}%) | Defections: ${m.stats.defections}
  Lineage: ${m.lineage.join(" → ")}`;
    });

    return {
      content: [
        {
          type: "text",
          text: `# Council Roster\n\n${roster.join("\n\n")}\n\n*Total decisions: ${state.decisionCounter}*`,
        },
      ],
    };
  },
);

// ─── council_history ───
server.tool(
  "council_history",
  "View past council decisions, including prompts, verdicts, and vote breakdowns.",
  {
    limit: z.number().optional().describe("Number of recent decisions to show (default: 5)"),
  },
  async ({ limit }) => {
    const n = limit ?? 5;
    const recent = state.history.slice(-n);

    if (recent.length === 0) {
      return { content: [{ type: "text", text: "No decisions in history yet." }] };
    }

    const entries = recent.map((d) => {
      const votes = d.verdict.votes.map((v) => `${v.memberName}=${v.vote}`).join(", ");
      return `### ${d.id} (${new Date(d.timestamp).toISOString()})
**Prompt:** ${d.prompt.slice(0, 100)}${d.prompt.length > 100 ? "..." : ""}
**Verdict:** ${d.verdict.winningOption} (confidence: ${(d.verdict.confidence * 100).toFixed(0)}%)
**Votes:** ${votes}
**Overridden:** ${d.overriddenTo ? `Yes → ${d.overriddenTo}` : "No"}`;
    });

    return {
      content: [{ type: "text", text: `# Decision History\n\n${entries.join("\n\n")}` }],
    };
  },
);

// ─── council_override ───
server.tool(
  "council_override",
  "Override a past council verdict. This feeds back into member scoring — members whose votes aligned with the override get credit, improving the council over time.",
  {
    decision_id: z.string().describe("The decision ID to override (e.g. decision-001)"),
    correct_option: z.string().describe("The option that should have won"),
  },
  async ({ decision_id, correct_option }) => {
    const record = state.history.find((d) => d.id === decision_id);
    if (!record) {
      return {
        content: [{ type: "text", text: `Decision ${decision_id} not found.` }],
        isError: true,
      };
    }

    record.overriddenTo = correct_option;

    // Credit members who voted for the correct option
    const finalVotes =
      record.challenges.length > 0
        ? record.challenges.map((c) => ({ name: c.memberName, vote: c.finalVote }))
        : record.positions.map((p) => ({ name: p.memberName, vote: p.vote }));

    for (const fv of finalVotes) {
      const member = state.members.find((m) => m.definition.name === fv.name);
      if (member && fv.vote === correct_option) {
        member.stats.overrideMatches++;
      }
    }

    return {
      content: [
        {
          type: "text",
          text: `Override recorded for ${decision_id}. Correct option: "${correct_option}". Member scores updated.`,
        },
      ],
    };
  },
);

// ─── council_sandbox ───
server.tool(
  "council_sandbox",
  "Open the Among Us sandbox visualization in your browser to watch the council deliberate in real-time.",
  {},
  async () => {
    state.openBrowser();
    const sandboxUrl = state.getSandboxUrl();
    return {
      content: [
        {
          type: "text",
          text: `Sandbox opened at ${sandboxUrl}\n\nThe sandbox shows the council deliberation in real-time with Among Us-themed visuals: crewmates around a meeting table, speech bubbles, vote bars, and the gallows for underperformers.`,
        },
      ],
    };
  },
);

// ─── Start server ───
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[council] MCP server running on stdio");
}

main().catch((error) => {
  console.error("[council] Fatal error:", error);
  process.exit(1);
});
