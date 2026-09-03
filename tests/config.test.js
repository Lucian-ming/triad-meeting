import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, mergeConfig } from "../src/config.js";

describe("Config Loader & Merge", () => {
  it("merges default config with file config and CLI overrides", () => {
    const fileConfig = {
      rounds: 3,
      mode: "consensus",
      models: {
        codex: "o3-mini",
      },
    };

    const cliOptions = {
      rounds: 5,
      models: {
        claude: "claude-3-7-sonnet",
      },
    };

    const merged = mergeConfig(DEFAULT_CONFIG, fileConfig, cliOptions);
    assert.equal(merged.rounds, 5); // CLI wins
    assert.equal(merged.mode, "consensus"); // File config applies
    assert.equal(merged.models.codex, "o3-mini");
    assert.equal(merged.models.claude, "claude-3-7-sonnet");
  });
});
