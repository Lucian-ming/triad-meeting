// Deliberation modes and prompt rules for triad-meeting

export const DISCUSSION_NO_EDIT_RULES = [
  "Hard prohibition for this phase: do not edit, create, delete, rename, move, format, generate, or overwrite files.",
  "Do not apply patches, run code generators, run formatters, commit changes, install dependencies, or run commands whose normal behavior writes artifacts into the repository.",
  "You may inspect files and run read-only diagnostic commands only (e.g., git status, grep, find, read files). If implementation is needed, describe the exact proposed changes instead of making them.",
];

export const MEETING_MODES = {
  adversarial: {
    name: "Adversarial Review (Red vs Blue Team)",
    description: "Brutal scrutiny, actively hunting flaws, edge cases, race conditions, and invalid assumptions. Zero politeness rituals.",
    rules: [
      "Meeting style: Severe adversarial review.",
      "Do not be agreeable for the sake of harmony. Challenge weak assumptions, vague claims, missing evidence, and risky shortcuts.",
      "Be blunt and exact. Name concrete failure points, edge cases, trade-offs, and places where another agent's proposal is wrong, inefficient, or under-specified.",
      "Do not pad with compliments, politeness rituals, or consensus theater.",
      "Attack the plan, code, reasoning, and evidence. Maintain rigorous engineering objectivity without personal hostility.",
    ],
  },
  consensus: {
    name: "Architectural Consensus & Design",
    description: "Constructive system design, evaluating trade-offs, modularity, API ergonomics, and converging on the optimal architecture.",
    rules: [
      "Meeting style: Collaborative architectural convergence.",
      "Identify the core system trade-offs: simplicity vs extensibility, performance vs maintainability, delivery speed vs technical debt.",
      "Evaluate interfaces, boundaries, and dependencies critically. Offer specific alternatives with code examples when questioning a design.",
      "Synthesize points of agreement while clarifying unresolved trade-offs so a sound consensus can be reached.",
    ],
  },
  audit: {
    name: "Security & Vulnerability Audit",
    description: "Penetration testing mindset focusing on security vulnerabilities, auth flaws, injections, resource leaks, and data privacy.",
    rules: [
      "Meeting style: Deep security and vulnerability audit.",
      "Actively inspect attack surfaces, untrusted input handling, authentication/authorization boundaries, race conditions, and secret leak risks.",
      "Identify potential denial of service (DoS), memory leaks, command/SQL/path injections, and dependency vulnerabilities.",
      "Rate risks with severity levels (Critical, High, Medium, Low) and provide concrete mitigation or defense-in-depth recommendations.",
    ],
  },
  refactor: {
    name: "Refactoring & Code Modernization",
    description: "Identifying code smells, improving modularity, testability, DRY/SOLID principles, and eliminating technical debt.",
    rules: [
      "Meeting style: High-standard code health and refactoring.",
      "Spot code smells, tight coupling, hidden side-effects, duplicated logic, and low testability.",
      "Prioritize maintainability, readability, type safety, and clean separation of concerns.",
      "Propose backward-compatible, incremental refactoring steps with clear migration safety.",
    ],
  },
  brainstorm: {
    name: "Brainstorming & Solution Exploration",
    description: "Exploring multiple distinct technical approaches, pros/cons matrix, and selecting the most viable paths.",
    rules: [
      "Meeting style: Divergent technical exploration followed by rigorous convergence.",
      "Generate at least 2-3 genuinely different architectural or algorithmic approaches to the problem.",
      "Construct a clear comparison matrix: implementation complexity, performance, operational overhead, and flexibility.",
      "Debate each approach's strengths and fatal weaknesses openly before narrowing down to the top recommendation.",
    ],
  },
};

export function getMode(modeName) {
  const normalized = (modeName || "adversarial").toLowerCase().trim();
  const mode = MEETING_MODES[normalized];
  if (!mode) {
    const valid = Object.keys(MEETING_MODES).join(", ");
    throw new Error(`Unknown meeting mode: "${modeName}". Available modes: ${valid}`);
  }
  return { key: normalized, ...mode };
}

export function listModes() {
  return Object.entries(MEETING_MODES).map(([key, value]) => ({
    key,
    name: value.name,
    description: value.description,
  }));
}
