import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAdapter, listAvailableAgentKeys } from "../src/adapters/index.js";
import { shellSplit, shellJoin } from "../src/adapters/base.js";

describe("Agent Adapters", () => {
  it("provides built-in adapters", () => {
    const keys = listAvailableAgentKeys();
    assert.ok(keys.includes("claude"));
    assert.ok(keys.includes("codex"));
    assert.ok(keys.includes("opencode"));
    assert.ok(keys.includes("aider"));
    assert.ok(keys.includes("gemini"));
  });

  it("builds correct Claude invocation", () => {
    const claude = getAdapter("claude");
    const discuss = claude.buildInvocation({
      prompt: "Review plan",
      phase: "discuss",
      options: { models: { claude: "claude-3-7-sonnet" } },
    });

    assert.equal(discuss.command, "claude");
    assert.ok(discuss.args.includes("-p"));
    assert.ok(discuss.args.includes("plan"));
    assert.ok(discuss.args.includes("--model"));
    assert.ok(discuss.args.includes("claude-3-7-sonnet"));

    const execute = claude.buildInvocation({
      prompt: "Apply changes",
      phase: "execute",
      options: {},
    });
    assert.ok(execute.args.includes("acceptEdits"));
  });

  it("builds correct Codex invocation", () => {
    const codex = getAdapter("codex");
    const discuss = codex.buildInvocation({
      prompt: "Audit code",
      phase: "discuss",
      options: { cwd: "/tmp" },
    });

    assert.equal(discuss.command, "codex");
    assert.ok(discuss.args.includes("exec"));
    assert.ok(discuss.args.includes("read-only"));
    assert.equal(discuss.stdin, "Audit code");
    assert.ok(discuss.outputFile !== null);
  });

  it("builds correct Aider invocation", () => {
    const aider = getAdapter("aider");
    const discuss = aider.buildInvocation({
      prompt: "Discuss architecture",
      phase: "discuss",
      options: {},
    });

    assert.equal(discuss.command, "aider");
    assert.ok(discuss.args.includes("--read-only"));
    assert.ok(discuss.args.includes("--no-auto-commits"));
  });

  it("correctly splits and joins shell strings", () => {
    const split = shellSplit('cmd --flag "arg with spaces" --opt=\'value\'');
    assert.deepEqual(split, ["cmd", "--flag", "arg with spaces", "--opt=value"]);

    const joined = shellJoin(["cmd", "arg with spaces", "simple"]);
    assert.equal(joined, "cmd 'arg with spaces' simple");
  });
});
