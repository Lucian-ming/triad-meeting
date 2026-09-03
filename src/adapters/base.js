// Base agent adapter interface
import { spawnSync } from "node:child_process";

export class BaseAdapter {
  constructor(key, displayName, defaultCommand) {
    this.key = key;
    this.displayName = displayName;
    this.defaultCommand = defaultCommand;
  }

  getEnvPrefix() {
    return `TRIAD_${this.key.toUpperCase()}`;
  }

  resolveCommand() {
    return process.env[`${this.getEnvPrefix()}_CMD`] || this.defaultCommand;
  }

  resolveExtraArgs() {
    return shellSplit(process.env[`${this.getEnvPrefix()}_ARGS`] || "");
  }

  checkAvailable(options = {}) {
    const commandParts = shellSplit(this.resolveCommand());
    if (commandParts.length === 0) {
      return { ok: false, version: "empty command", error: "Command not configured" };
    }

    const command = commandParts[0];
    const prefixArgs = commandParts.slice(1);

    try {
      const result = spawnSync(command, [...prefixArgs, "--version"], {
        cwd: options.cwd || process.cwd(),
        encoding: "utf8",
        shell: false,
        timeout: 5000,
      });

      if (result.error) {
        return { ok: false, version: "missing", error: result.error.message };
      }

      const version = `${result.stdout || ""}${result.stderr || ""}`.trim().split(/\r?\n/)[0] || `exit ${result.status}`;
      return {
        ok: result.status === 0,
        version,
        error: result.status === 0 ? null : `Exit ${result.status}`,
      };
    } catch (err) {
      return { ok: false, version: "error", error: err.message };
    }
  }

  // To be implemented by subclasses
  buildInvocation(_context) {
    throw new Error(`buildInvocation not implemented for ${this.key}`);
  }
}

export function shellSplit(input) {
  if (!input) return [];
  const parts = [];
  let current = "";
  let quote = null;
  let escaping = false;

  for (const char of input.trim()) {
    if (escaping) {
      current += char;
      escaping = false;
    } else if (char === "\\") {
      escaping = true;
    } else if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === "'" || char === '"') {
      quote = char;
    } else if (/\s/.test(char)) {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (escaping) current += "\\";
  if (quote) throw new Error(`Unclosed quote in command string: ${input}`);
  if (current) parts.push(current);
  return parts;
}

export function shellJoin(parts) {
  return parts.map((part) => {
    if (/^[A-Za-z0-9_./:=@+-]+$/.test(part)) return part;
    return `'${part.replace(/'/g, "'\\''")}'`;
  }).join(" ");
}
