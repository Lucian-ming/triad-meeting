import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getMode, listModes } from "../src/modes.js";

describe("Meeting Modes", () => {
  it("retrieves built-in modes", () => {
    const adversarial = getMode("adversarial");
    assert.equal(adversarial.key, "adversarial");
    assert.ok(adversarial.rules.length > 0);

    const consensus = getMode("consensus");
    assert.equal(consensus.key, "consensus");

    const audit = getMode("audit");
    assert.equal(audit.key, "audit");

    const refactor = getMode("refactor");
    assert.equal(refactor.key, "refactor");

    const brainstorm = getMode("brainstorm");
    assert.equal(brainstorm.key, "brainstorm");
  });

  it("lists all available modes", () => {
    const list = listModes();
    assert.ok(list.length >= 5);
    const keys = list.map((m) => m.key);
    assert.ok(keys.includes("adversarial"));
    assert.ok(keys.includes("consensus"));
  });

  it("throws for unknown mode", () => {
    assert.throws(() => {
      getMode("invalid-mode-name");
    }, /Unknown meeting mode/);
  });
});
