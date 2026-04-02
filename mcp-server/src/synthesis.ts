import Anthropic from "@anthropic-ai/sdk";
import type { MemberPosition, MemberChallenge, Verdict } from "./types.js";

const client = new Anthropic();

/**
 * The Clerk: a neutral synthesizer that compiles council deliberation
 * into a structured, executable PRD. Not a council member — no personality, no bias.
 */
export async function synthesizePlan(
  prompt: string,
  contextBrief: string,
  naivePlan: string,
  positions: MemberPosition[],
  challenges: MemberChallenge[],
  verdict: Verdict,
): Promise<string> {
  const positionsBlock = positions
    .map(
      (p) =>
        `── ${p.memberName} (voted: ${p.vote}, confidence: ${p.confidence}) ──
Framework answers:
${Object.entries(p.frameworkAnswers)
  .map(([k, v]) => `  ${k}: ${v}`)
  .join("\n")}
Critique: ${p.critique}
Revised plan: ${p.revisedPlan}`,
    )
    .join("\n\n");

  const challengesBlock =
    challenges.length > 0
      ? challenges
          .map(
            (c) =>
              `${c.memberName} → ${c.challengeTarget}: ${c.challenge}
  Final vote: ${c.finalVote} (${c.defected ? "DEFECTED" : "held"}, confidence: ${c.confidence})`,
          )
          .join("\n\n")
      : "No challenges (unanimous Round 1).";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: `You are the Clerk — a neutral plan synthesizer. You have NO personality, NO bias. Your job is to compile the council's deliberation into a concrete, executable PRD that a coding agent can follow step by step.

═══ ORIGINAL PROMPT ═══
${prompt}

═══ RESEARCH CONTEXT ═══
${contextBrief}

═══ NAIVE PLAN (baseline) ═══
${naivePlan}

═══ COUNCIL POSITIONS (Round 1) ═══
${positionsBlock}

═══ CHALLENGES (Round 2) ═══
${challengesBlock}

═══ VERDICT ═══
Winner: ${verdict.winningOption} (confidence: ${verdict.confidence.toFixed(2)})
Vote breakdown: ${verdict.votes.map((v) => `${v.memberName}=${v.vote}`).join(", ")}

═══ YOUR TASK ═══
Produce a PRD (Product Requirements Document) that a coding agent will execute immediately. This is not a proposal — it's an instruction set.

FORMAT REQUIREMENTS:
1. Start with a one-paragraph EXECUTIVE SUMMARY of what will be built
2. List TECHNOLOGY DECISIONS as a table (decision | choice | rationale from council member)
3. Break into numbered PHASES with:
   - Clear deliverable for each phase
   - Files/directories to create
   - Dependencies on previous phases
   - Acceptance criteria (how to verify this phase is done)
4. Include RISK MITIGATIONS inline — where GHOST raised concerns, specify the safeguard
5. Include DISSENT NOTES — where council members disagreed, note both positions so the implementing agent can make an informed call
6. End with a DEFINITION OF DONE checklist

The plan must be specific enough that an agent can start coding from Phase 1 without asking clarifying questions. Use concrete file paths, library names, and commands — not vague descriptions.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}
