// Claude Code CLI adapter
import { BaseAdapter, shellSplit } from "./base.js";

export class ClaudeAdapter extends BaseAdapter {
  constructor() {
    super("claude", "Claude Code", "claude");
  }

  buildInvocation({ prompt, phase, options }) {
    const commandParts = shellSplit(this.resolveCommand());
    const command = commandParts[0];
    const prefixArgs = commandParts.slice(1);
    const extraArgs = this.resolveExtraArgs();
    const args = [...prefixArgs, "-p"];

    if (phase === "execute") {
      args.push("--permission-mode", "acceptEdits");
    } else {
      args.push("--permission-mode", "plan");
    }

    // Optional model override
    const model = options?.models?.claude || options?.model;
    if (model) {
      args.push("--model", model);
    }

    args.push(...extraArgs, prompt);

    return {
      command,
      args,
      stdin: null,
      outputFile: null,
    };
  }
}
