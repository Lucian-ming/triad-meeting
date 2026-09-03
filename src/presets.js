// Operational presets and templates for triad-meeting

export const PRESETS = {
  "pr-review": {
    name: "Pull Request & Code Review",
    description: "2-round adversarial peer review focusing on logic errors, edge cases, and test gaps.",
    options: {
      mode: "adversarial",
      rounds: 2,
      flow: "sequential",
      diff: true,
    },
  },
  architecture: {
    name: "RFC & Architectural Design",
    description: "3-round deep consensus debate exploring trade-offs, modularity, and system interfaces.",
    options: {
      mode: "consensus",
      rounds: 3,
      flow: "sequential",
    },
  },
  security: {
    name: "Security & Vulnerability Audit",
    description: "2-round parallel scan for OWASP Top 10 vulnerabilities, auth bypasses, and injection risks.",
    options: {
      mode: "audit",
      rounds: 2,
      flow: "parallel",
    },
  },
  "quick-fix": {
    name: "Rapid Bug Triage & Implementation",
    description: "1-round expedited debate followed by immediate execution and verification.",
    options: {
      mode: "adversarial",
      rounds: 1,
      flow: "sequential",
      execute: true,
      diff: true,
    },
  },
  brainstorm: {
    name: "Technical Approach Exploration",
    description: "2-round creative ideation and comparison of competing architectural strategies.",
    options: {
      mode: "brainstorm",
      rounds: 2,
      flow: "sequential",
    },
  },
};

export function getPreset(name) {
  const normalized = (name || "").toLowerCase().trim();
  const preset = PRESETS[normalized];
  if (!preset) {
    const available = Object.keys(PRESETS).join(", ");
    throw new Error(`Unknown preset: "${name}". Available presets: ${available}`);
  }
  return { key: normalized, ...preset };
}

export function listPresets() {
  return Object.entries(PRESETS).map(([key, value]) => ({
    key,
    name: value.name,
    description: value.description,
    options: value.options,
  }));
}
