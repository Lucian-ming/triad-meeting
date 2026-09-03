// CLI argument parsing, doctor, and command routing
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import os from "node:os";
import { DEFAULT_CONFIG, loadConfigFile, mergeConfig, VERSION } from "./config.js";
import { getAllAdapters, getDisplayName, listAvailableAgentKeys } from "./adapters/index.js";
import { listModes, getMode } from "./modes.js";
import { colors, printBanner, printError, printSection, printSuccess, printWarning, renderTable } from "./ui.js";

export function parseArgs(argv) {
  const args = [...argv];
  let command = "run";

  if (args[0] && !args[0].startsWith("-")) {
    const first = args.shift();
    if (["run", "doctor", "status", "modes", "version", "help"].includes(first)) {
      command = first;
    } else {
      args.unshift(first);
    }
  }

  const cliOptions = {};
  const taskParts = [];
  const excludedAgents = [];
  let file = null;
  let customConfigPath = null;
  let help = false;
  let version = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--help" || arg === "-h") {
      help = true;
    } else if (arg === "--version" || arg === "-v") {
      version = true;
    } else if (arg === "--config" || arg === "-c") {
      customConfigPath = resolve(requiredValue(args[++i], "--config"));
    } else if (arg.startsWith("--config=")) {
      customConfigPath = resolve(arg.slice("--config=".length));
    } else if (arg === "--rounds" || arg === "-r") {
      cliOptions.rounds = parsePositiveInt(args[++i], "--rounds");
    } else if (arg.startsWith("--rounds=")) {
      cliOptions.rounds = parsePositiveInt(arg.slice("--rounds=".length), "--rounds");
    } else if (arg === "--cwd") {
      cliOptions.cwd = resolve(requiredValue(args[++i], "--cwd"));
    } else if (arg.startsWith("--cwd=")) {
      cliOptions.cwd = resolve(arg.slice("--cwd=".length));
    } else if (arg === "--timeout") {
      cliOptions.timeoutMs = parsePositiveInt(args[++i], "--timeout") * 1000;
    } else if (arg.startsWith("--timeout=")) {
      cliOptions.timeoutMs = parsePositiveInt(arg.slice("--timeout=".length), "--timeout") * 1000;
    } else if (arg === "--mode" || arg === "-m") {
      cliOptions.mode = requiredValue(args[++i], "--mode").toLowerCase();
    } else if (arg.startsWith("--mode=")) {
      cliOptions.mode = arg.slice("--mode=".length).toLowerCase();
    } else if (arg === "--flow") {
      cliOptions.flow = requiredValue(args[++i], "--flow").toLowerCase();
    } else if (arg.startsWith("--flow=")) {
      cliOptions.flow = arg.slice("--flow=".length).toLowerCase();
    } else if (arg === "--verify") {
      cliOptions.verify = requiredValue(args[++i], "--verify");
    } else if (arg.startsWith("--verify=")) {
      cliOptions.verify = arg.slice("--verify=".length);
    } else if (arg === "--diff") {
      cliOptions.diff = true;
    } else if (arg === "--json") {
      cliOptions.json = true;
    } else if (arg === "--max-output-chars") {
      cliOptions.maxOutputChars = parsePositiveInt(args[++i], "--max-output-chars");
    } else if (arg.startsWith("--max-output-chars=")) {
      cliOptions.maxOutputChars = parsePositiveInt(arg.slice("--max-output-chars=".length), "--max-output-chars");
    } else if (arg === "--out" || arg === "-o") {
      cliOptions.out = resolve(requiredValue(args[++i], "--out"));
    } else if (arg.startsWith("--out=")) {
      cliOptions.out = resolve(arg.slice("--out=".length));
    } else if (arg === "--file" || arg === "-f") {
      file = resolve(requiredValue(args[++i], "--file"));
    } else if (arg.startsWith("--file=")) {
      file = resolve(arg.slice("--file=".length));
    } else if (arg === "--no-stream") {
      cliOptions.stream = false;
    } else if (arg === "--show-logs") {
      cliOptions.showLogs = true;
    } else if (arg === "--dry-run") {
      cliOptions.dryRun = true;
    } else if (arg === "--execute" || arg === "-e") {
      cliOptions.execute = true;
    } else if (arg === "--executor") {
      cliOptions.executor = requiredValue(args[++i], "--executor").toLowerCase();
    } else if (arg.startsWith("--executor=")) {
      cliOptions.executor = arg.slice("--executor=".length).toLowerCase();
    } else if (arg === "--synthesizer") {
      cliOptions.synthesizer = requiredValue(args[++i], "--synthesizer").toLowerCase();
    } else if (arg.startsWith("--synthesizer=")) {
      cliOptions.synthesizer = arg.slice("--synthesizer=".length).toLowerCase();
    } else if (arg === "--agents" || arg === "--only") {
      cliOptions.agents = parseList(requiredValue(args[++i], arg));
    } else if (arg.startsWith("--agents=") || arg.startsWith("--only=")) {
      cliOptions.agents = parseList(arg.split("=")[1]);
    } else if (arg === "--without") {
      excludedAgents.push(...parseList(requiredValue(args[++i], "--without")));
    } else if (arg.startsWith("--without=")) {
      excludedAgents.push(...parseList(arg.slice("--without=".length)));
    } else if (arg === "--model") {
      cliOptions.model = requiredValue(args[++i], "--model");
    } else if (arg.startsWith("--model=")) {
      cliOptions.model = arg.slice("--model=".length);
    } else if (arg.startsWith("--") && arg.endsWith("-model")) {
      const agentKey = arg.slice(2, -"-model".length).toLowerCase();
      cliOptions.models = cliOptions.models || {};
      cliOptions.models[agentKey] = requiredValue(args[++i], arg);
    } else if (arg === "--") {
      taskParts.push(...args.slice(i + 1));
      break;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}. Use --help to view all options.`);
    } else {
      taskParts.push(arg);
    }
  }

  // Load config file
  const { config: fileConfig, path: configPath } = loadConfigFile(customConfigPath, cliOptions.cwd || process.cwd());
  const options = mergeConfig(DEFAULT_CONFIG, fileConfig, cliOptions);
  options.configPath = configPath;

  // Handle excluded agents
  if (excludedAgents.length > 0) {
    const excluded = new Set(excludedAgents.map((a) => a.toLowerCase()));
    options.agents = options.agents.filter((a) => !excluded.has(a.toLowerCase()));
  }

  if (options.agents.length === 0) {
    throw new Error("No agents selected. Please specify at least one agent with --agents or --only.");
  }

  // Validate mode
  getMode(options.mode);

  return { command, options, taskParts, file, help, version };
}

export async function readTask(parsed) {
  let task = parsed.taskParts.join(" ");
  if (parsed.file) {
    if (!existsSync(parsed.file)) throw new Error(`Task file not found: ${parsed.file}`);
    const fileContent = readFileSync(parsed.file, "utf8");
    task = task ? `${task}\n\n${fileContent}` : fileContent;
  }
  if (!task && !process.stdin.isTTY) {
    task = await readStdin();
  }
  return task.trim();
}

function readStdin() {
  return new Promise((resolveStdin) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolveStdin(data));
  });
}

export function runDoctor(options) {
  printBanner("Triad Meeting Doctor", "Environment & Agent Diagnostic");

  const isWSL = Boolean(process.env.WSL_DISTRO_NAME || (os.release().toLowerCase().includes("microsoft") && os.platform() === "linux"));
  console.log(`${colors.bold("Platform:")}     ${os.type()} ${os.release()} (${os.arch()})${isWSL ? colors.cyan(" [WSL Native]") : ""}`);
  console.log(`${colors.bold("Node.js:")}      ${process.version}`);
  console.log(`${colors.bold("Working Dir:")}  ${options.cwd}`);
  if (options.configPath) {
    console.log(`${colors.bold("Config File:")}  ${options.configPath}`);
  } else {
    console.log(`${colors.bold("Config File:")}  ${colors.dim("None (using defaults)")}`);
  }
  console.log("");

  printSection("Available Agent CLI Status");

  const adapters = getAllAdapters(options);
  const rows = [];

  for (const [key, adapter] of Object.entries(adapters)) {
    const check = adapter.checkAvailable(options);
    const statusText = check.ok ? colors.green("✔ READY") : colors.yellow("✖ MISSING");
    const versionText = check.ok ? colors.dim(check.version) : colors.red(check.error || "Not in PATH");
    rows.push([
      getDisplayName(key, options),
      adapter.resolveCommand(),
      statusText,
      versionText,
    ]);
  }

  renderTable(["Agent", "Command", "Status", "Details"], rows);

  console.log("\n" + colors.bold("Environment Overrides:"));
  console.log("  TRIAD_<AGENT>_CMD  - Override executable path (e.g. TRIAD_CLAUDE_CMD=/usr/local/bin/claude)");
  console.log("  TRIAD_<AGENT>_ARGS - Pass persistent CLI arguments (e.g. TRIAD_CODEX_ARGS=\"--profile work\")");
  console.log("");
}

export function runModesList() {
  printBanner("Triad Meeting Modes", "Pre-packaged Deliberation Archetypes");
  const modes = listModes();
  for (const m of modes) {
    console.log(colors.bold(colors.cyan(`▶ ${m.key}`)) + colors.white(` - ${m.name}`));
    console.log(`  ${colors.dim(m.description)}\n`);
  }
}

export function printHelp() {
  console.log(`
${colors.bold(colors.cyan("triad-meeting"))} ${colors.gray(`v${VERSION}`)}
${colors.dim("Multi-Agent Consensus & Adversarial Peer Review Orchestrator")}

${colors.bold("USAGE:")}
  ${colors.green("triad-meeting run")} [options] "your task description"
  ${colors.green("triad-meeting run")} [options] --file task.md
  ${colors.green("triad-meeting doctor")}
  ${colors.green("triad-meeting modes")}

${colors.bold("CORE OPTIONS:")}
  -r, --rounds <N>        Discussion rounds before synthesis (default: 2)
  -m, --mode <mode>       Meeting archetype: adversarial, consensus, audit, refactor, brainstorm (default: adversarial)
  --flow <flow>           Deliberation flow: sequential (default, turn-based debate) or parallel
  --agents, --only <list> Comma-separated agents: claude, codex, opencode, aider, gemini (default: claude,codex,opencode)
  --without <list>        Exclude specific agents from the meeting
  --cwd <dir>             Shared workspace root (default: current directory)
  -e, --execute           Let the selected executor implement changes following consensus
  --executor <agent>      Agent assigned to execute implementation (default: codex)
  --synthesizer <agent>   Agent to summarize consensus, or "none" (default: codex)
  --verify <command>      Run automated verification command after execution (e.g. "npm test")
  --diff                  Display git diff summary after execution
  -o, --out <file>        Custom output path for Markdown transcript
  -f, --file <file>       Read task prompt from file
  --dry-run               Preview command calls and prompts without invoking LLMs
  --json                  Also generate a structured .json transcript
  --show-logs             Stream agent stderr logs live to terminal
  --no-stream             Disable live output streaming

${colors.bold("MODEL SELECTION:")}
  --model <name>          Default model for agents that accept it
  --claude-model <name>   Specific model for Claude Code
  --codex-model <name>    Specific model for Codex
  --opencode-model <name> Specific model for OpenCode
  --aider-model <name>    Specific model for Aider

${colors.bold("EXAMPLES:")}
  ${colors.dim("# 1. Adversarial RFC architecture review with Claude, Codex & Aider")}
  triad-meeting run --agents claude,codex,aider --mode adversarial --rounds 2 "Review auth RFC and find race conditions"

  ${colors.dim("# 2. Security audit on repository")}
  triad-meeting run --mode audit "Audit SQL queries and API route authorization"

  ${colors.dim("# 3. Debate, synthesize, execute, and verify with tests")}
  triad-meeting run --execute --executor codex --verify "npm test" --diff "Fix failing tests in user-auth.test.ts"
`);
}

function parsePositiveInt(val, optionName) {
  const n = Number.parseInt(requiredValue(val, optionName), 10);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`${optionName} must be a positive integer.`);
  }
  return n;
}

function parseList(val) {
  if (!val) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

function requiredValue(val, optionName) {
  if (val === undefined || val === null || val === "") {
    throw new Error(`${optionName} requires an argument value.`);
  }
  return val;
}
