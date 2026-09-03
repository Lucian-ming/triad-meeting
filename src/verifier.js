// Post-execution verification and git diff inspection
import { spawnSync } from "node:child_process";
import { colors } from "./ui.js";

export function runVerification(command, cwd) {
  if (!command || !command.trim()) return null;

  const started = Date.now();
  console.log(colors.cyan(`\n▶ Running Verification: `) + colors.bold(command));

  try {
    const result = spawnSync(command, {
      cwd,
      shell: true,
      encoding: "utf8",
      env: { ...process.env, CI: "1" },
      timeout: 300000, // 5 min timeout
    });

    const durationMs = Date.now() - started;
    const success = result.status === 0;

    if (success) {
      console.log(colors.green(`✔ Verification PASSED (${durationMs}ms)`));
    } else {
      console.log(colors.red(`✖ Verification FAILED with exit code ${result.status} (${durationMs}ms)`));
      if (result.stderr) {
        console.error(colors.yellow(`Stderr:\n`) + result.stderr.trim());
      }
      if (result.stdout) {
        console.log(colors.gray(`Stdout:\n`) + result.stdout.trim());
      }
    }

    return {
      command,
      status: result.status,
      success,
      durationMs,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
    };
  } catch (err) {
    return {
      command,
      status: -1,
      success: false,
      durationMs: Date.now() - started,
      stdout: "",
      stderr: err.message,
    };
  }
}

export function inspectGitDiff(cwd) {
  try {
    const statResult = spawnSync("git", ["diff", "--stat"], { cwd, encoding: "utf8" });
    const statusResult = spawnSync("git", ["status", "-s"], { cwd, encoding: "utf8" });

    const diffStat = (statResult.stdout || "").trim();
    const statusShort = (statusResult.stdout || "").trim();

    return {
      hasChanges: Boolean(diffStat || statusShort),
      diffStat,
      statusShort,
    };
  } catch {
    return { hasChanges: false, diffStat: "", statusShort: "" };
  }
}
