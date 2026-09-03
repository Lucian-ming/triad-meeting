import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { buildRoundPrompt, buildSynthesisPrompt, buildExecutionPrompt, runMeeting } from "../src/engine.js";
import { getMode } from "../src/modes.js";

describe("Engine & Orchestration", () => {
  const options = {
    agents: ["claude", "codex", "aider"],
    executor: "codex",
    synthesizer: "codex",
    rounds: 2,
    flow: "sequential",
    mode: "adversarial",
    cwd: process.cwd(),
    transcriptPromptChars: 10000,
    dryRun: true,
  };
  const mode = getMode("adversarial");

  it("builds round 1 prompt with role and constraints", () => {
    const prompt = buildRoundPrompt({
      agent: "claude",
      round: 1,
      task: "Analyze race condition",
      transcript: [],
      options,
      mode,
    });

    assert.ok(prompt.includes("You are Claude Code"));
    assert.ok(prompt.includes("Adversarial Review"));
    assert.ok(prompt.includes("Analyze race condition"));
    assert.ok(prompt.includes("Hard prohibition for this phase"));
  });

  it("builds round 2 prompt with prior transcript context", () => {
    const transcript = [
      { round: 1, agent: "claude", phase: "discuss", stdout: "Claude suggests lock A", exitCode: 0 },
      { round: 1, agent: "codex", phase: "discuss", stdout: "Codex rejects lock A due to deadlock", exitCode: 0 },
    ];

    const prompt = buildRoundPrompt({
      agent: "aider",
      round: 2,
      task: "Analyze race condition",
      transcript,
      options,
      mode,
    });

    assert.ok(prompt.includes("You are Aider in round 2"));
    assert.ok(prompt.includes("Claude suggests lock A"));
    assert.ok(prompt.includes("Codex rejects lock A due to deadlock"));
  });

  it("builds synthesis prompt asking for actionable decisions", () => {
    const prompt = buildSynthesisPrompt("Task X", [], options, mode);
    assert.ok(prompt.includes("executive moderator"));
    assert.ok(prompt.includes("Executive Decision"));
    assert.ok(prompt.includes("Rejected Ideas"));
  });

  it("builds execution prompt with skeptical executor mindset", () => {
    const prompt = buildExecutionPrompt(
      "Task X",
      [],
      { stdout: "Agreed consensus plan" },
      options,
      mode
    );

    assert.ok(prompt.includes("Skeptical executor"));
    assert.ok(prompt.includes("Agreed consensus plan"));
  });

  it("executes full dry-run meeting and generates transcript file", async () => {
    const tmpOut = join(os.tmpdir(), `triad-test-${Date.now()}.md`);
    const runOpts = {
      ...options,
      out: tmpOut,
      execute: true,
      verify: "node -v",
      diff: true,
      json: true,
    };

    const result = await runMeeting("Test task deliberation", runOpts);

    assert.equal(result.transcriptPath, tmpOut);
    assert.ok(existsSync(tmpOut));
    assert.ok(existsSync(tmpOut.replace(/\.md$/, ".json")));
    assert.equal(result.transcript.length, 6); // 3 agents * 2 rounds
    assert.ok(result.synthesis !== null);
    assert.ok(result.execution !== null);

    // Clean up
    rmSync(tmpOut, { force: true });
    rmSync(tmpOut.replace(/\.md$/, ".json"), { force: true });
  });
});
