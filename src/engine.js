// Meeting deliberation and execution engine
import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import process from "node:process";
import { getAdapter, getDisplayName } from "./adapters/index.js";
import { shellJoin } from "./adapters/base.js";
import { DISCUSSION_NO_EDIT_RULES, getMode } from "./modes.js";
import {
  colors,
  formatDuration,
  getAgentBadge,
  makePrefixWriter,
  printBanner,
  printSection,
  printSuccess,
  printWarning,
  printError,
  renderTable,
} from "./ui.js";
import {
  appendLimited,
  calculateMetrics,
  defaultTranscriptPath,
  formatTranscriptForPrompt,
  tail,
  writeTranscript,
} from "./transcript.js";
import { inspectGitDiff, runVerification } from "./verifier.js";

export async function runMeeting(task, options) {
  if (!existsSync(options.cwd)) {
    throw new Error(`Working directory does not exist: ${options.cwd}`);
  }

  const startedAt = new Date();
  const transcript = [];
  const mode = getMode(options.mode);

  printBanner(
    "Triad Meeting Orchestrator",
    `Mode: ${mode.name} | Flow: ${options.flow} | Rounds: ${options.rounds}`
  );

  console.log(`${colors.bold("Workspace:")}   ${options.cwd}`);
  console.log(
    `${colors.bold("Agents:")}      ${options.agents.map((a) => getAgentBadge(a, getDisplayName(a, options))).join(" ")}`
  );
  console.log(
    `${colors.bold("Execution:")}   ${options.execute ? colors.green(`Enabled (Executor: ${getDisplayName(options.executor, options)})`) : colors.dim("Disabled (Discussion only)")}`
  );
  if (options.verify) {
    console.log(`${colors.bold("Verify Cmd:")}  ${colors.yellow(options.verify)}`);
  }
  console.log("");

  // Deliberation Rounds
  for (let round = 1; round <= options.rounds; round += 1) {
    printSection(`Round ${round} of ${options.rounds} [${mode.key.toUpperCase()}]`);

    if (options.flow === "parallel") {
      // Parallel execution with buffered output to avoid collision
      const jobs = options.agents.map(async (agent) => {
        const prompt = buildRoundPrompt({ agent, round, task, transcript, options, mode });
        return invokeAgent(agent, prompt, "discuss", options, { bufferOutput: true });
      });
      const results = await Promise.all(jobs);
      for (const res of results) {
        transcript.push({ round, ...res });
      }
    } else {
      // Sequential flow (Default): turn-based deliberation
      for (const agent of options.agents) {
        const prompt = buildRoundPrompt({ agent, round, task, transcript, options, mode });
        const result = await invokeAgent(agent, prompt, "discuss", options, { bufferOutput: false });
        transcript.push({ round, ...result });
      }
    }
  }

  // Synthesis Phase
  let synthesis = null;
  if (options.synthesizer !== "none") {
    printSection(`Final Synthesis [Moderator: ${getDisplayName(options.synthesizer, options)}]`);
    const prompt = buildSynthesisPrompt(task, transcript, options, mode);
    synthesis = await invokeAgent(options.synthesizer, prompt, "synthesize", options, { bufferOutput: false });
  }

  // Execution Phase
  let execution = null;
  let diff = null;
  let verification = null;

  if (options.execute) {
    printSection(`Execution [Executor: ${getDisplayName(options.executor, options)}]`);
    const prompt = buildExecutionPrompt(task, transcript, synthesis, options, mode);
    execution = await invokeAgent(options.executor, prompt, "execute", options, { bufferOutput: false });

    // Inspect git diff
    diff = inspectGitDiff(options.cwd);
    if (diff.hasChanges) {
      console.log(colors.cyan("\n▶ Git Changes Summary:"));
      console.log(colors.gray(diff.diffStat || diff.statusShort));
    }

    // Run verification if requested
    if (options.verify) {
      verification = runVerification(options.verify, options.cwd);
    }
  }

  const endedAt = new Date();
  const transcriptPath = options.out || defaultTranscriptPath(startedAt);
  const metrics = calculateMetrics(transcript, synthesis, execution, options);

  writeTranscript(transcriptPath, {
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
  });

  // Display metrics summary
  printSection("Deliberation Metrics & Performance");
  const metricRows = Object.entries(metrics).map(([key, stat]) => [
    stat.displayName || key,
    String(stat.turns),
    formatDuration(stat.durationMs),
    stat.chars.toLocaleString(),
    `~${stat.estTokens.toLocaleString()}`,
    stat.errors === 0 ? colors.green("✔ OK") : colors.yellow(`⚠ ${stat.errors} err`),
  ]);
  renderTable(["Agent", "Turns", "Duration", "Output (chars)", "Est. Tokens", "Status"], metricRows);

  printSection("Meeting Concluded");
  printSuccess(`Report saved: ${colors.bold(transcriptPath)}`);

  if (synthesis?.stdout) {
    console.log(colors.bold("\n📋 Consensus Summary:"));
    console.log(trimForConsole(synthesis.stdout));
  }

  if (execution?.stdout) {
    console.log(colors.bold("\n⚡ Execution Summary:"));
    console.log(trimForConsole(execution.stdout));
  }

  return {
    transcriptPath,
    transcript,
    synthesis,
    execution,
    verification,
    diff,
    metrics,
  };
}

export function buildRoundPrompt({ agent, round, task, transcript, options, mode }) {
  const context = meetingContext(agent, options.agents, options);

  if (round === 1 && transcript.length === 0) {
    return [
      `You are ${getDisplayName(agent, options)} participating in ${context}.`,
      `Meeting Archetype: ${mode.name}`,
      ...mode.rules,
      ...DISCUSSION_NO_EDIT_RULES,
      "Give a concrete, technically rigorous initial assessment. Include potential failure points, hidden risks, your proposed strategy, and specific aspects you challenge other agents to inspect.",
      "Keep your response focused, dense, and under 1000 words.",
      "",
      "Task:",
      task,
    ].join("\n");
  }

  return [
    `You are ${getDisplayName(agent, options)} in round ${round} of ${context}.`,
    `Meeting Archetype: ${mode.name}`,
    ...mode.rules,
    ...DISCUSSION_NO_EDIT_RULES,
    "Carefully review the statements and critiques made by the other agents in the transcript below.",
    "Explicitly refute flawed assumptions, defend or revise your points with technical evidence, address trade-offs, and push toward an uncompromising, high-quality consensus.",
    "Keep your response focused, dense, and under 1000 words.",
    "",
    "Task:",
    task,
    "",
    "Current Deliberation Transcript:",
    formatTranscriptForPrompt(transcript, options.transcriptPromptChars, options),
  ].join("\n");
}

export function buildSynthesisPrompt(task, transcript, options, mode) {
  return [
    `You are the executive moderator synthesizing a multi-agent engineering deliberation with ${formatAgentList(options.agents, options)}.`,
    `Deliberation Mode: ${mode.name}`,
    ...DISCUSSION_NO_EDIT_RULES,
    "Synthesize the meeting transcript into an actionable consensus plan:",
    "1. Executive Decision: The final architectural/implementation path chosen.",
    "2. Rejected Ideas & Flaws: List specific proposals that were debunked and why.",
    "3. Agreed Implementation Steps: Step-by-step technical implementation instructions.",
    "4. Residual Risks & Edge Cases: Remaining caveats or verification criteria.",
    "Preserve valid objections rather than giving a false sense of unanimity.",
    "",
    "Task:",
    task,
    "",
    "Deliberation Transcript:",
    formatTranscriptForPrompt(transcript, options.transcriptPromptChars, options),
  ].join("\n");
}

export function buildExecutionPrompt(task, transcript, synthesis, options, mode) {
  const synthesisText = synthesis?.stdout?.trim() || "(No separate synthesis produced.)";
  return [
    `You are ${getDisplayName(options.executor, options)}, selected as the sole executor following a multi-agent deliberation with ${formatAgentList(options.agents, options)}.`,
    "Implement the task according to the consensus below.",
    "Mindset: Skeptical executor. Inspect the workspace files first. If the consensus contains recommendations that are refuted by the actual code, reject the bad advice and apply the technically correct solution.",
    "Keep edits scoped, clean, and verify your changes.",
    "",
    "Task:",
    task,
    "",
    "Consensus Plan:",
    synthesisText,
    "",
    "Deliberation Transcript:",
    formatTranscriptForPrompt(transcript, options.transcriptPromptChars, options),
  ].join("\n");
}

export async function invokeAgent(agentKey, prompt, phase, options, executionOptions = {}) {
  const adapter = getAdapter(agentKey, options);
  const invocation = adapter.buildInvocation({ prompt, phase, options });

  if (options.dryRun) {
    const preview = prompt.length > 800 ? `${prompt.slice(0, 800)}\n...[truncated for preview]` : prompt;
    console.log(colors.cyan(`[dry-run:${agentKey}] `) + shellJoin([invocation.command, ...invocation.args]));
    console.log(colors.dim(`[dry-run:${agentKey}] prompt preview:\n${preview}\n`));
    return {
      agent: agentKey,
      phase,
      command: invocationForTranscript(invocation),
      exitCode: 0,
      signal: null,
      stdout: "(dry run)",
      stderr: "",
      durationMs: 10,
      timedOut: false,
    };
  }

  return runProcess(adapter, phase, invocation, options, executionOptions);
}

function runProcess(adapter, phase, invocation, options, { bufferOutput = false } = {}) {
  return new Promise((resolveProcess) => {
    const started = Date.now();
    const env = { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" };
    const child = spawn(invocation.command, invocation.args, {
      cwd: options.cwd,
      env,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let hasReceivedFirstChunk = false;

    const badge = getAgentBadge(adapter.key, adapter.displayName);
    const outWriter = makePrefixWriter(`${badge} `, process.stdout);
    const errWriter = makePrefixWriter(`${badge}${colors.red("[log]")} `, process.stderr);

    // Subtle thinking heartbeat for terminal users
    const heartbeatInterval = setInterval(() => {
      if (!hasReceivedFirstChunk && options.stream && !bufferOutput && process.stdout.isTTY) {
        const elapsedSec = Math.round((Date.now() - started) / 1000);
        process.stdout.write(`\r${badge} ${colors.dim(`⠋ Thinking... (${elapsedSec}s)`)}`);
      }
    }, 4000);

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000).unref();
    }, options.timeoutMs);

    child.stdout.on("data", (chunk) => {
      if (!hasReceivedFirstChunk && process.stdout.isTTY && options.stream && !bufferOutput) {
        process.stdout.write("\r\x1b[K"); // Clear thinking line
      }
      hasReceivedFirstChunk = true;
      const text = chunk.toString("utf8");
      stdout = appendLimited(stdout, text, options.maxOutputChars);
      if (options.stream && !bufferOutput) {
        outWriter.write(text);
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString("utf8");
      stderr = appendLimited(stderr, text, options.maxOutputChars);
      if (options.stream && options.showLogs && !bufferOutput) {
        errWriter.write(text);
      }
    });

    child.on("error", (error) => {
      clearInterval(heartbeatInterval);
      clearTimeout(timer);
      if (!hasReceivedFirstChunk && process.stdout.isTTY) {
        process.stdout.write("\r\x1b[K");
      }
      outWriter.flush();
      errWriter.flush();
      resolveProcess({
        agent: adapter.key,
        phase,
        command: invocationForTranscript(invocation),
        exitCode: null,
        signal: null,
        stdout,
        stderr: appendLimited(stderr, error.message, options.maxOutputChars),
        durationMs: Date.now() - started,
        timedOut,
      });
    });

    child.on("close", (exitCode, signal) => {
      clearInterval(heartbeatInterval);
      clearTimeout(timer);
      if (!hasReceivedFirstChunk && process.stdout.isTTY) {
        process.stdout.write("\r\x1b[K");
      }

      const fileOutput = readAndRemoveOutputFile(invocation.outputFile);
      if (fileOutput.trim()) {
        stdout = appendLimited(stdout, fileOutput, options.maxOutputChars);
        if (options.stream && !bufferOutput) {
          outWriter.write(fileOutput.endsWith("\n") ? fileOutput : `${fileOutput}\n`);
        }
      }

      if (bufferOutput && options.stream) {
        process.stdout.write(`\n--- ${adapter.displayName} (${formatDuration(Date.now() - started)}) ---\n`);
        outWriter.write(stdout.trim() + "\n");
      }

      outWriter.flush();
      errWriter.flush();

      if (!options.showLogs && (exitCode !== 0 || timedOut) && stderr.trim()) {
        process.stderr.write(`${badge}${colors.red("[err-tail]")} ${tail(stderr, 1600)}\n`);
      }

      if (options.stream && !bufferOutput) {
        process.stdout.write("\n");
      }

      resolveProcess({
        agent: adapter.key,
        phase,
        command: invocationForTranscript(invocation),
        exitCode,
        signal,
        stdout,
        stderr,
        durationMs: Date.now() - started,
        timedOut,
      });
    });

    if (invocation.stdin) {
      child.stdin.end(invocation.stdin);
    } else {
      child.stdin.end();
    }
  });
}

function readAndRemoveOutputFile(path) {
  if (!path) return "";
  try {
    if (!existsSync(path)) return "";
    const text = readFileSync(path, "utf8");
    rmSync(dirname(path), { recursive: true, force: true });
    return text;
  } catch {
    return "";
  }
}

function meetingContext(currentAgent, agents, options) {
  const others = agents.filter((c) => c !== currentAgent);
  if (others.length === 0) return "a single-agent deep code review";
  return `a ${agents.length}-agent engineering deliberation with ${formatAgentList(others, options)}`;
}

function formatAgentList(agents, options) {
  const names = agents.map((a) => getDisplayName(a, options));
  if (names.length === 0) return "no agents";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function invocationForTranscript(invocation) {
  return shellJoin([
    invocation.command,
    ...invocation.args.map((a) => (a.length > 200 ? `${a.slice(0, 200)}...` : a)),
  ]);
}

function trimForConsole(text) {
  return text.length > 4000 ? `${text.slice(0, 4000)}\n...[truncated; see full transcript report]` : text;
}
