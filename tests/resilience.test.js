import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateMetrics, formatTranscriptForPrompt } from "../src/transcript.js";
import { detectAvailableAgents } from "../src/adapters/index.js";
import { parseArgs } from "../src/cli.js";

describe("Resilience & Fault Tolerance", () => {
  it("calculates accurate metrics across agents", () => {
    const transcript = [
      { agent: "claude", durationMs: 1200, stdout: "Claude round 1 output", exitCode: 0 },
      { agent: "codex", durationMs: 1500, stdout: "Codex round 1 output", exitCode: 0 },
      { agent: "claude", durationMs: 800, stdout: "Claude round 2 output", exitCode: 0 },
      { agent: "codex", durationMs: 900, stdout: "Codex error occurred", exitCode: 1 },
    ];

    const synthesis = { durationMs: 2000, stdout: "Final synthesis summary", exitCode: 0 };
    const options = { synthesizer: "codex", executor: null };

    const metrics = calculateMetrics(transcript, synthesis, null, options);

    assert.equal(metrics.claude.turns, 2);
    assert.equal(metrics.claude.durationMs, 2000);
    assert.equal(metrics.claude.errors, 0);

    assert.equal(metrics.codex.turns, 3); // 2 transcript + 1 synthesis
    assert.equal(metrics.codex.errors, 1);
    assert.ok(metrics.codex.chars > 0);
    assert.ok(metrics.codex.estTokens > 0);
  });

  it("formats transcript for prompt with clear error notification on failures", () => {
    const transcript = [
      { round: 1, agent: "claude", phase: "discuss", stdout: "Normal output", exitCode: 0 },
      { round: 1, agent: "codex", phase: "discuss", stdout: "", stderr: "Connection timeout", exitCode: 124 },
    ];

    const formatted = formatTranscriptForPrompt(transcript, 5000);
    assert.ok(formatted.includes("Claude Code"));
    assert.ok(formatted.includes("Normal output"));
    assert.ok(formatted.includes("Codex"));
    assert.ok(formatted.includes("NOTICE: Agent invocation encountered an issue"));
    assert.ok(formatted.includes("Connection timeout"));
  });

  it("detects available agents without throwing", () => {
    const { available, missing } = detectAvailableAgents();
    assert.ok(Array.isArray(available));
    assert.ok(Array.isArray(missing));
    const total = available.length + missing.length;
    assert.ok(total >= 5); // claude, codex, opencode, aider, gemini
  });

  it("adjusts synthesizer and executor to match selected agents", () => {
    const parsed = parseArgs(["--only", "aider", "--execute", "Refactor task"]);
    assert.deepEqual(parsed.options.agents, ["aider"]);
    assert.equal(parsed.options.synthesizer, "aider");
    assert.equal(parsed.options.executor, "aider");
  });
});
