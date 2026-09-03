// OpenCode CLI adapter
import { BaseAdapter, shellSplit } from "./base.js";

export class OpenCodeAdapter extends BaseAdapter {
  constructor() {
    super("opencode", "OpenCode", "opencode");
  }

  buildInvocation({ prompt, phase, options }) {
    const commandParts = shellSplit(this.resolveCommand());
    const command = commandParts[0];
    const prefixArgs = commandParts.slice(1);
    const extraArgs = this.resolveExtraArgs();
    const args = [...prefixArgs, "run", "--dir", options.cwd || process.cwd()];

    if (phase === "execute") {
      args.push("--dangerously-skip-permissions");
    }

    // Optional model override
    const model = options?.models?.opencode || options?.model;
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
