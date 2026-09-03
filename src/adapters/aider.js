// Aider CLI adapter (https://github.com/paul-gauthier/aider)
import { BaseAdapter, shellSplit } from "./base.js";

export class AiderAdapter extends BaseAdapter {
  constructor() {
    super("aider", "Aider", "aider");
  }

  buildInvocation({ prompt, phase, options }) {
    const commandParts = shellSplit(this.resolveCommand());
    const command = commandParts[0];
    const prefixArgs = commandParts.slice(1);
    const extraArgs = this.resolveExtraArgs();
    const args = [...prefixArgs, "--exit", "--no-check-update"];

    if (phase === "execute") {
      args.push("--yes-always");
    } else {
      args.push("--read-only", "--no-auto-commits");
    }

    const model = options?.models?.aider || options?.model;
    if (model) {
      args.push("--model", model);
    }

    args.push(...extraArgs, "--message", prompt);

    return {
      command,
      args,
      stdin: null,
      outputFile: null,
    };
  }
}
