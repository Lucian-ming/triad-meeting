// Agent adapter registry and factory
import { ClaudeAdapter } from "./claude.js";
import { CodexAdapter } from "./codex.js";
import { OpenCodeAdapter } from "./opencode.js";
import { AiderAdapter } from "./aider.js";
import { GeminiAdapter } from "./gemini.js";
import { CustomAdapter } from "./custom.js";

const BUILTIN_ADAPTERS = {
  claude: new ClaudeAdapter(),
  codex: new CodexAdapter(),
  opencode: new OpenCodeAdapter(),
  aider: new AiderAdapter(),
  gemini: new GeminiAdapter(),
};

export function getAdapter(key, config = {}) {
  const normalized = (key || "").toLowerCase().trim();
  if (BUILTIN_ADAPTERS[normalized]) {
    return BUILTIN_ADAPTERS[normalized];
  }

  // Check custom agents from config
  if (config.customAgents && config.customAgents[normalized]) {
    return new CustomAdapter(normalized, config.customAgents[normalized]);
  }

  throw new Error(
    `Unsupported agent: "${key}". Supported agents: ${listAvailableAgentKeys(config).join(", ")}`
  );
}

export function listAvailableAgentKeys(config = {}) {
  const builtin = Object.keys(BUILTIN_ADAPTERS);
  const custom = Object.keys(config.customAgents || {});
  return [...new Set([...builtin, ...custom])];
}

export function getAllAdapters(config = {}) {
  const adapters = { ...BUILTIN_ADAPTERS };
  if (config.customAgents) {
    for (const [key, customConf] of Object.entries(config.customAgents)) {
      adapters[key] = new CustomAdapter(key, customConf);
    }
  }
  return adapters;
}

export function getDisplayName(key, config = {}) {
  try {
    const adapter = getAdapter(key, config);
    return adapter.displayName;
  } catch {
    return key;
  }
}

export function detectAvailableAgents(config = {}, options = {}) {
  const adapters = getAllAdapters(config);
  const available = [];
  const missing = [];

  for (const [key, adapter] of Object.entries(adapters)) {
    const check = adapter.checkAvailable(options);
    if (check.ok) {
      available.push({ key, displayName: adapter.displayName, version: check.version });
    } else {
      missing.push({ key, displayName: adapter.displayName, error: check.error });
    }
  }

  return { available, missing };
}
