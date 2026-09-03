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
  const metrics = calculateMetrics(data.transcript, data.synthesis, data.execution, data.options);
  const mdContent = renderMarkdownTranscript({ ...data, metrics });
  writeFileSync(path, mdContent, "utf8");

  if (data.options?.json) {
    const jsonPath = path.endsWith(".md") ? path.replace(/\.md$/, ".json") : `${path}.json`;
    writeFileSync(jsonPath, JSON.stringify({ ...data, metrics }, null, 2), "utf8");
  }
}

export function calculateMetrics(transcript = [], synthesis = null, execution = null, options = {}) {
  const agentStats = {};

  const recordEntry = (agent, durationMs, stdout = "", exitCode = 0) => {
    if (!agent) return;
    if (!agentStats[agent]) {
      agentStats[agent] = {
        displayName: getDisplayName(agent, options),
        turns: 0,
        durationMs: 0,
        chars: 0,
        estTokens: 0,
        errors: 0,
      };
    }
    agentStats[agent].turns += 1;
    agentStats[agent].durationMs += durationMs || 0;
    const cleanChars = (stdout || "").length;
    agentStats[agent].chars += cleanChars;
    agentStats[agent].estTokens += Math.round(cleanChars / 4);
    if (exitCode !== 0) {
      agentStats[agent].errors += 1;
    }
  };

  for (const entry of transcript) {
    recordEntry(entry.agent, entry.durationMs, entry.stdout, entry.exitCode);
  }

  if (synthesis && options.synthesizer) {
    recordEntry(options.synthesizer, synthesis.durationMs, synthesis.stdout, synthesis.exitCode);
  }

  if (execution && options.executor) {
    recordEntry(options.executor, execution.durationMs, execution.stdout, execution.exitCode);
  }

  return agentStats;
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
  metrics,
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

  if (metrics && Object.keys(metrics).length > 0) {
    lines.push(
      "## 📊 Agent Performance & Metrics",
      "",
      "| Agent | Turns | Duration | Output Chars | Est. Tokens | Status |",
      "| --- | --- | --- | --- | --- | --- |",
    );
    for (const [key, stat] of Object.entries(metrics)) {
      const statusStr = stat.errors === 0 ? "✅ Healthy" : `⚠ ${stat.errors} errors`;
      lines.push(
        `| **${stat.displayName || key}** | ${stat.turns} | ${(stat.durationMs / 1000).toFixed(1)}s | ${stat.chars.toLocaleString()} | ~${stat.estTokens.toLocaleString()} | ${statusStr} |`
      );
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

export function formatTranscriptForPrompt(transcript, maxChars, options = {}) {
  const text = transcript
    .map((entry) => {
      const name = getDisplayName(entry.agent, options);
      let stdout = entry.stdout.trim();
      if (entry.exitCode !== 0 && entry.exitCode !== null) {
        stdout = `[NOTICE: Agent invocation encountered an issue (exit ${entry.exitCode})]\n${stdout || entry.stderr?.trim() || "(no stdout)"}`;
      } else if (!stdout) {
        stdout = "(no stdout)";
      }

      const stderr = entry.stderr && entry.stderr.trim() && entry.exitCode !== 0 ? `\nStderr:\n${entry.stderr.trim()}` : "";
      return [
        `Round ${entry.round} - ${name} (${entry.phase}, exit ${entry.exitCode ?? "error"}):`,
        stdout,
        stderr,
      ].filter(Boolean).join("\n");
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
