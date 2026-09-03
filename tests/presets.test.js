import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getPreset, listPresets } from "../src/presets.js";
import { parseArgs } from "../src/cli.js";

describe("Presets System", () => {
  it("retrieves built-in presets", () => {
    const pr = getPreset("pr-review");
    assert.equal(pr.key, "pr-review");
    assert.equal(pr.options.mode, "adversarial");
    assert.equal(pr.options.rounds, 2);
    assert.equal(pr.options.flow, "sequential");

    const arch = getPreset("architecture");
    assert.equal(arch.options.mode, "consensus");
    assert.equal(arch.options.rounds, 3);

    const sec = getPreset("security");
    assert.equal(sec.options.mode, "audit");
    assert.equal(sec.options.flow, "parallel");

    const fix = getPreset("quick-fix");
    assert.equal(fix.options.execute, true);
  });

  it("lists all available presets", () => {
    const all = listPresets();
    assert.ok(all.length >= 5);
    const keys = all.map((p) => p.key);
    assert.ok(keys.includes("pr-review"));
    assert.ok(keys.includes("architecture"));
    assert.ok(keys.includes("quick-fix"));
  });

  it("applies preset options in parseArgs", () => {
    const parsed = parseArgs(["--preset", "architecture", "Task"]);
    assert.equal(parsed.options.mode, "consensus");
    assert.equal(parsed.options.rounds, 3);
  });

  it("allows overriding preset options via CLI flags", () => {
    const parsed = parseArgs(["--preset", "architecture", "--rounds", "5", "Task"]);
    assert.equal(parsed.options.mode, "consensus");
    assert.equal(parsed.options.rounds, 5); // CLI flag takes precedence
  });

  it("throws on invalid preset name", () => {
    assert.throws(() => {
      getPreset("invalid-preset-name");
    }, /Unknown preset/);
  });
});
