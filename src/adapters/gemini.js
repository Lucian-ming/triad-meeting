// Google Gemini CLI adapter
import { BaseAdapter, shellSplit } from "./base.js";

export class GeminiAdapter extends BaseAdapter {
  constructor() {
    super("gemini", "Gemini", "gemini");
  }

  buildInvocation({ prompt, phase, options }) {
    const commandParts = shellSplit(this.resolveCommand());
    const command = commandParts[0];
    const prefixArgs = commandParts.slice(1);
    const extraArgs = this.resolveExtraArgs();
    const args = [...prefixArgs];

    const model = options?.models?.gemini || options?.model;
    if (model) {
      args.push("-m", model);
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
