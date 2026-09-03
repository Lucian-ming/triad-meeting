// UI, color formatting, and terminal output utilities for triad-meeting
import process from "node:process";

const useColor = () => {
  if (process.env.NO_COLOR !== undefined && process.env.NO_COLOR !== "") return false;
  if (process.env.FORCE_COLOR === "1") return true;
  return Boolean(process.stdout.isTTY);
};

export const colors = {
  reset: (t) => (useColor() ? `\x1b[0m${t}\x1b[0m` : t),
  bold: (t) => (useColor() ? `\x1b[1m${t}\x1b[22m` : t),
  dim: (t) => (useColor() ? `\x1b[2m${t}\x1b[22m` : t),
  italic: (t) => (useColor() ? `\x1b[3m${t}\x1b[23m` : t),
  underline: (t) => (useColor() ? `\x1b[4m${t}\x1b[24m` : t),

  black: (t) => (useColor() ? `\x1b[30m${t}\x1b[39m` : t),
  red: (t) => (useColor() ? `\x1b[31m${t}\x1b[39m` : t),
  green: (t) => (useColor() ? `\x1b[32m${t}\x1b[39m` : t),
  yellow: (t) => (useColor() ? `\x1b[33m${t}\x1b[39m` : t),
  blue: (t) => (useColor() ? `\x1b[34m${t}\x1b[39m` : t),
  magenta: (t) => (useColor() ? `\x1b[35m${t}\x1b[39m` : t),
  cyan: (t) => (useColor() ? `\x1b[36m${t}\x1b[39m` : t),
  white: (t) => (useColor() ? `\x1b[37m${t}\x1b[39m` : t),
  gray: (t) => (useColor() ? `\x1b[90m${t}\x1b[39m` : t),

  bgBlue: (t) => (useColor() ? `\x1b[44m\x1b[37m${t}\x1b[0m` : t),
  bgMagenta: (t) => (useColor() ? `\x1b[45m\x1b[37m${t}\x1b[0m` : t),
  bgCyan: (t) => (useColor() ? `\x1b[46m\x1b[30m${t}\x1b[0m` : t),
  bgGreen: (t) => (useColor() ? `\x1b[42m\x1b[30m${t}\x1b[0m` : t),
  bgYellow: (t) => (useColor() ? `\x1b[43m\x1b[30m${t}\x1b[0m` : t),
};

const AGENT_COLORS = {
  claude: colors.cyan,
  codex: colors.green,
  opencode: colors.yellow,
  aider: colors.blue,
  gemini: colors.magenta,
};

export function getAgentBadge(agentKey, displayName) {
  const colorFn = AGENT_COLORS[agentKey.toLowerCase()] || colors.magenta;
  return colorFn(colors.bold(`[${displayName || agentKey}]`));
}

export function printBanner(title, subtitle = "") {
  const line = "═".repeat(Math.max(50, title.length + 8));
  console.log(colors.cyan(`\n╔${line}╗`));
  console.log(colors.cyan(`║  `) + colors.bold(colors.white(title.padEnd(line.length - 2))) + colors.cyan(`║`));
  if (subtitle) {
    console.log(colors.cyan(`║  `) + colors.dim(subtitle.padEnd(line.length - 2)) + colors.cyan(`║`));
  }
  console.log(colors.cyan(`╚${line}╝\n`));
}

export function printSection(title) {
  console.log(colors.bold(colors.blue(`\n▶ ${title}`)));
  console.log(colors.gray("─".repeat(45)));
}

export function printSuccess(message) {
  console.log(colors.green(`✔ ${message}`));
}

export function printWarning(message) {
  console.log(colors.yellow(`⚠ ${message}`));
}

export function printError(message) {
  console.error(colors.red(`✖ ${message}`));
}

export function formatDuration(ms) {
  if (!ms || ms < 0) return "0ms";
  if (ms < 1000) return `${ms}ms`;
  const sec = (ms / 1000).toFixed(1);
  if (ms < 60000) return `${sec}s`;
  const min = Math.floor(ms / 60000);
  const remSec = Math.round((ms % 60000) / 1000);
  return `${min}m ${remSec}s`;
}

export function makePrefixWriter(prefix, stream) {
  let atLineStart = true;
  return {
    write(text) {
      for (const char of text.replace(/\r/g, "")) {
        if (atLineStart) stream.write(prefix);
        stream.write(char);
        atLineStart = char === "\n";
      }
    },
    flush() {
      // Direct stream write
    },
  };
}

export function renderTable(headers, rows) {
  const colWidths = headers.map((h, i) => {
    let max = h.length;
    for (const row of rows) {
      const cell = String(row[i] || "");
      const cleanCell = cell.replace(/\x1b\[[0-9;]*m/g, "");
      if (cleanCell.length > max) max = cleanCell.length;
    }
    return max + 2;
  });

  const headerRow = headers.map((h, i) => colors.bold(h.padEnd(colWidths[i]))).join("│ ");
  const sep = colWidths.map((w) => "─".repeat(w)).join("┼─");

  console.log(headerRow);
  console.log(colors.gray(sep));
  for (const row of rows) {
    const rowStr = row.map((cell, i) => {
      const str = String(cell || "");
      const visibleLen = str.replace(/\x1b\[[0-9;]*m/g, "").length;
      const pad = " ".repeat(Math.max(0, colWidths[i] - visibleLen));
      return str + pad;
    }).join(colors.gray("│ "));
    console.log(rowStr);
  }
}
