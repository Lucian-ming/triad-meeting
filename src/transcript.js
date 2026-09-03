// Markdown and JSON transcript rendering and persistence
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import os from "node:os";
import { getDisplayName } from "./adapters/index.js";

export function defaultTranscriptPath(date) {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return join(os.homedir(), ".local", "state", "triad-meeting", `${stamp}.md`);
}

export function writeTranscript(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  const mdContent = renderMarkdownTranscript(data);
  writeFileSync(path, mdContent, "utf8");

  if (data.options?.json) {
    const jsonPath = path.endsWith(".md") ? path.replace(/\.md$/, ".json") : `${path}.json`;
    writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
  }
}

export function renderMarkdownTranscript({
  task,
  options,
  startedAt,
  endedAt,
  transcript,
  synthesis,
  execution,
  verification,
  diff,
}) {
  const durationTotalMs = endedAt ? endedAt.getTime() - startedAt.getTime() : 0;
  const agentNames = options.agents.map((a) => getDisplayName(a, options)).join(", ");

  const lines = [
    "# 🤝 Triad Meeting Report",
    "",
    "| Parameter | Value |",
    "| --- | --- |",
    `| **Started** | ${startedAt.toISOString()} |`,
    `| **Duration** | ${(durationTotalMs / 1000).toFixed(1)}s |`,
    `| **Mode** | \`${options.mode}\` |`,
    `| **Flow** | \`${options.flow}\` |`,
    `| **Rounds** | ${options.rounds} |`,
    `| **Agents** | ${agentNames} |`,
    `| **Executor** | ${options.execute ? getDisplayName(options.executor, options) : "*(Meeting only)*"} |`,
    `| **Workspace** | \`${options.cwd}\` |`,
    "",
    "## 🎯 Task",
    "",
    "```text",
    task,
    "```",
    "",
  ];

  if (synthesis?.stdout) {
    lines.push(
      "## 📌 Final Synthesis & Consensus",
      "",
      synthesis.stdout.trim(),
      "",
    );
  }

  lines.push("## 💬 Deliberation Transcript", "");

  for (const entry of transcript) {
    const name = getDisplayName(entry.agent, options);
    const status = entry.exitCode === 0 ? "✅ Success" : `❌ Exit ${entry.exitCode ?? "error"}`;
    lines.push(
      `### Round ${entry.round}: ${name} (${status})`,
      "",
      `- **Phase**: ${entry.phase}`,
      `- **Duration**: ${(entry.durationMs / 1000).toFixed(2)}s`,
      `- **Command**: \`${entry.command}\``,
      "",
      "```text",
      entry.stdout.trim() || "(no stdout)",
      "```",
      "",
    );

    if (entry.stderr && entry.stderr.trim()) {
      lines.push(
        "<details>",
        `<summary>Log / Stderr output (${entry.agent})</summary>`,
        "",
        "```text",
        entry.stderr.trim(),
        "```",
        "</details>",
        "",
      );
    }
  }

  if (execution) {
    const execName = getDisplayName(options.executor, options);
    const execStatus = execution.exitCode === 0 ? "✅ Succeeded" : `❌ Failed (exit ${execution.exitCode})`;
    lines.push(
      "## ⚡ Execution Result",
      "",
      `- **Executor**: ${execName}`,
      `- **Status**: ${execStatus}`,
      `- **Duration**: ${(execution.durationMs / 1000).toFixed(2)}s`,
      "",
      "```text",
      execution.stdout.trim() || "(no stdout)",
      "```",
      "",
    );

    if (execution.stderr && execution.stderr.trim()) {
      lines.push(
        "<details><summary>Execution stderr</summary>",
        "",
        "```text",
        execution.stderr.trim(),
        "```",
        "</details>",
        "",
      );
    }
  }

  if (diff?.hasChanges) {
    lines.push(
      "## 📝 Code Changes (Git Diff)",
      "",
      "```diff",
      diff.diffStat || diff.statusShort,
      "```",
      "",
    );
  }

  if (verification) {
    const verStatus = verification.success ? "✅ Passed" : `❌ Failed (${verification.status})`;
    lines.push(
      "## 🧪 Verification",
      "",
      `- **Command**: \`${verification.command}\``,
      `- **Result**: ${verStatus}`,
      `- **Duration**: ${(verification.durationMs / 1000).toFixed(2)}s`,
      "",
    );
    if (verification.stdout.trim()) {
      lines.push("```text", verification.stdout.trim(), "```", "");
    }
  }

  return `${lines.join("\n")}\n`;
}

export function formatTranscriptForPrompt(transcript, maxChars, options = {}) {
  const text = transcript
    .map((entry) => {
      const name = getDisplayName(entry.agent, options);
      const stdout = entry.stdout.trim() || "(no stdout)";
      const stderr = entry.stderr && entry.stderr.trim() ? `\nStderr:\n${entry.stderr.trim()}` : "";
      return [
        `Round ${entry.round} - ${name} (${entry.phase}, exit ${entry.exitCode ?? "error"}):`,
        stdout,
        stderr,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  return middleTrim(text, maxChars);
}

export function middleTrim(text, maxChars) {
  if (text.length <= maxChars) return text;
  const marker = "\n...[transcript truncated for prompt]...\n";
  const keep = Math.max(0, maxChars - marker.length);
  return `${text.slice(0, Math.floor(keep / 2))}${marker}${text.slice(text.length - Math.ceil(keep / 2))}`;
}

export function appendLimited(current, addition, limit) {
  const next = current + addition;
  if (next.length <= limit) return next;
  const marker = "\n...[captured output truncated]...\n";
  const keep = Math.max(0, limit - marker.length);
  return `${next.slice(0, Math.floor(keep / 2))}${marker}${next.slice(next.length - Math.ceil(keep / 2))}`;
}

export function tail(text, maxChars) {
  return text.length > maxChars ? `...[log tail only]...\n${text.slice(text.length - maxChars)}` : text;
}
