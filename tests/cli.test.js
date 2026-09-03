import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/cli.js";

describe("CLI Argument Parser", () => {
  it("parses default options with a task argument", () => {
    const parsed = parseArgs(["Fix the bug"]);
    assert.equal(parsed.command, "run");
    assert.deepEqual(parsed.taskParts, ["Fix the bug"]);
    assert.equal(parsed.options.rounds, 2);
    assert.equal(parsed.options.mode, "adversarial");
    assert.equal(parsed.options.flow, "sequential");
    assert.deepEqual(parsed.options.agents, ["claude", "codex", "opencode"]);
  });

  it("handles doctor and modes commands", () => {
    const doctor = parseArgs(["doctor"]);
    assert.equal(doctor.command, "doctor");

    const modes = parseArgs(["modes"]);
    assert.equal(modes.command, "modes");
  });

  it("handles agent filtering: --agents, --only, --without", () => {
    const only = parseArgs(["--only", "claude,aider", "Task"]);
    assert.deepEqual(only.options.agents, ["claude", "aider"]);

    const without = parseArgs(["--without", "codex", "Task"]);
    assert.deepEqual(without.options.agents, ["claude", "opencode"]);
  });

  it("handles execution and verification flags", () => {
    const parsed = parseArgs([
      "--execute",
      "--executor", "aider",
      "--verify", "npm test",
      "--diff",
      "--json",
      "Refactor auth",
    ]);

    assert.equal(parsed.options.execute, true);
    assert.equal(parsed.options.executor, "aider");
    assert.equal(parsed.options.verify, "npm test");
    assert.equal(parsed.options.diff, true);
    assert.equal(parsed.options.json, true);
  });

  it("handles model overrides", () => {
    const parsed = parseArgs([
      "--model", "gpt-4o",
      "--claude-model", "claude-3-7-sonnet",
      "Code review",
    ]);

    assert.equal(parsed.options.model, "gpt-4o");
    assert.equal(parsed.options.models.claude, "claude-3-7-sonnet");
  });

  it("throws on invalid mode", () => {
    assert.throws(() => {
      parseArgs(["--mode", "nonexistent", "Task"]);
    }, /Unknown meeting mode/);
  });
});
