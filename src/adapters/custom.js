// Custom user-defined CLI agent adapter
import { BaseAdapter, shellSplit } from "./base.js";

export class CustomAdapter extends BaseAdapter {
  constructor(key, config = {}) {
    super(key, config.name || key, config.command || key);
    this.config = config;
  }

  buildInvocation({ prompt, phase, options }) {
    const rawCommand = this.resolveCommand();
    const commandParts = shellSplit(rawCommand);
    const command = commandParts[0];
    const prefixArgs = commandParts.slice(1);
    const extraArgs = this.resolveExtraArgs();

    const phaseArgs = phase === "execute" 
      ? (this.config.executeArgs || [])
      : (this.config.discussArgs || []);

    const args = [...prefixArgs, ...phaseArgs, ...extraArgs];
    let stdin = null;

    if (this.config.stdin) {
      stdin = prompt;
    } else {
      args.push(prompt);
    }

    return {
      command,
      args,
      stdin,
      outputFile: null,
    };
  }
}
