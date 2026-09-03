// OpenAI Codex CLI adapter
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";
import { BaseAdapter, shellSplit } from "./base.js";

export class CodexAdapter extends BaseAdapter {
  constructor() {
    super("codex", "Codex", "codex");
  }

  buildInvocation({ prompt, phase, options }) {
    const commandParts = shellSplit(this.resolveCommand());
    const command = commandParts[0];
    const prefixArgs = commandParts.slice(1);
    const extraArgs = this.resolveExtraArgs();
    const args = [...prefixArgs, "exec"];

    args.push("--sandbox", phase === "execute" ? "workspace-write" : "read-only");
    args.push("--skip-git-repo-check", "--cd", options.cwd || process.cwd());

    // Optional model override
    const model = options?.models?.codex || options?.model;
    if (model) {
      args.push("--model", model);
    }

    const outputFile = join(mkdtempSync(join(os.tmpdir(), "triad-meeting-codex-")), "last-message.txt");
    args.push("--output-last-message", outputFile);
    args.push(...extraArgs, "-");

    return {
      command,
      args,
      stdin: prompt,
      outputFile,
    };
  }
}
