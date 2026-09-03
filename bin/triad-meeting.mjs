#!/usr/bin/env node
import process from "node:process";
import { parseArgs, printHelp, readTask, runDoctor, runModesList, runPresetsList } from "../src/cli.js";
import { runMeeting } from "../src/engine.js";
import { VERSION } from "../src/config.js";
import { colors, printError } from "../src/ui.js";

async function main() {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    printError(err.message);
    process.exit(1);
  }

  if (parsed.help) {
    printHelp();
    return;
  }

  if (parsed.version) {
    console.log(`triad-meeting v${VERSION}`);
    return;
  }

  if (parsed.command === "doctor" || parsed.command === "status") {
    runDoctor(parsed.options);
    return;
  }

  if (parsed.command === "modes") {
    runModesList();
    return;
  }

  if (parsed.command === "presets" || parsed.command === "templates") {
    runPresetsList();
    return;
  }

  if (parsed.command !== "run") {
    printError(`Unknown command: "${parsed.command}". Use --help for guidance.`);
    process.exit(1);
  }

  let task;
  try {
    task = await readTask(parsed);
  } catch (err) {
    printError(err.message);
    process.exit(1);
  }

  if (!task) {
    printError("No task was provided. Pass a task string, --file <path>, or pipe via stdin.");
    process.exit(1);
  }

  try {
    await runMeeting(task, parsed.options);
  } catch (err) {
    printError(err.message);
    if (process.env.DEBUG) {
      console.error(err);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(colors.red(`Fatal: ${err.message}`));
  process.exit(1);
});
