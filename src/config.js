// Configuration loader and defaults for triad-meeting
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import os from "node:os";

export const VERSION = "0.2.0";

export const DEFAULT_CONFIG = {
  rounds: 2,
  timeoutMs: 10 * 60 * 1000,
  maxOutputChars: 32000,
  transcriptPromptChars: 64000,
  stream: true,
  showLogs: false,
  cwd: process.cwd(),
  flow: "sequential", // "sequential" or "parallel"
  mode: "adversarial",
  executor: "codex",
  synthesizer: "codex",
  agents: ["claude", "codex", "opencode"],
  verify: null,
  diff: false,
  json: false,
  models: {},
};

export function loadConfigFile(customPath = null, startDir = process.cwd()) {
  const candidatePaths = [];

  if (customPath) {
    candidatePaths.push(resolve(customPath));
  } else {
    // Project-local configs
    candidatePaths.push(join(startDir, ".triadrc.json"));
    candidatePaths.push(join(startDir, "triad.config.json"));
    candidatePaths.push(join(startDir, ".triadrc"));

    // User home configs
    candidatePaths.push(join(os.homedir(), ".config", "triad", "config.json"));
    candidatePaths.push(join(os.homedir(), ".triadrc.json"));
  }

  for (const configPath of candidatePaths) {
    if (existsSync(configPath)) {
      try {
        const raw = readFileSync(configPath, "utf8");
        const parsed = JSON.parse(raw);
        return { config: parsed, path: configPath };
      } catch (err) {
        console.warn(`[triad-meeting] Warning: failed to parse config file at ${configPath}: ${err.message}`);
      }
    }
  }

  return { config: {}, path: null };
}

export function mergeConfig(base, fileConfig, cliOptions) {
  const merged = { ...base, ...fileConfig, ...cliOptions };
  
  // Merge models dictionary if present
  merged.models = {
    ...(base.models || {}),
    ...(fileConfig.models || {}),
    ...(cliOptions.models || {}),
  };

  return merged;
}
