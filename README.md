<div align="center">

# 🤝 triad-meeting

**Multi-Agent Adversarial Peer Review & Consensus Orchestrator for AI Coding CLIs**

*Convene Claude Code, Codex, OpenCode, Aider, and Gemini in a shared workspace to debate, critique, synthesize, and execute code changes.*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-orange.svg)](CONTRIBUTING.md)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](package.json)

[English](#overview) | [中文说明](#中文使用指南)

</div>

---

## Overview

When a single AI coding agent works in isolation, it easily falls into **hallucinations, local optima, optimistic blind spots, and architectural traps**.

In real-world software engineering, mission-critical decisions undergo **peer review, RFC debate, and red-team critiques**.

`triad-meeting` brings ensemble intelligence and adversarial review directly to your local terminal:
1. Convenes multiple frontier AI coding CLIs (**Claude Code**, **OpenAI Codex**, **OpenCode**, **Aider**, **Gemini**) in your repository.
2. Forces them into multi-round adversarial debate where they **challenge weak assumptions, point out edge cases, and dispute flawed designs**.
3. Enforces a **strict read-only sandbox** during discussion so no files are touched prematurely.
4. Generates an uncompromising, actionable consensus report.
5. *(Optional)* Delegates execution to a designated agent and automatically **runs test suites and inspects git diffs**.

```
                           ┌────────────────────────┐
                           │   Your Task Prompt     │
                           └───────────┬────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │                                             │
      ┌─────────▼─────────┐                         ┌─────────▼─────────┐
      │   Claude Code     │                         │      Codex        │
      │ (Architecture/QA) │ ◄────── Round 1 ──────► │ (Logic/Edge Cases)│
      └─────────┬─────────┘   (Read-Only Sandbox)   └─────────┬─────────┘
                │                                             │
                │              ┌───────────────┐              │
                └─────────────►│ OpenCode/Aider│◄─────────────┘
                               │(Auditing/Perf)│
                               └───────┬───────┘
                                       │
                                    Round 2
                          (Turn-Based Brutal Rebuttal)
                                       │
                                       ▼
                       ┌──────────────────────────────┐
                       │     Executive Synthesis      │
                       │ (Decisions, Rejected Ideas)  │
                       └───────────────┬──────────────┘
                                       │
                                    Execute
                             (--execute --executor)
                                       │
                                       ▼
                       ┌──────────────────────────────┐
                       │     Skeptical Execution      │
                       │    (Code Edits & Patches)    │
                       └───────────────┬──────────────┘
                                       │
                                    Verify
                            (--verify "npm test")
                                       │
                                       ▼
                       ┌──────────────────────────────┐
                       │      Verified Git Diff       │
                       │   & Markdown Report Saved    │
                       └──────────────────────────────┘
```

---

## ✨ Key Features

- 🥊 **Adversarial Peer Review**: Default mode mandates severe critique. No superficial praise, compliments, or false consensus.
- 🔄 **True Turn-Based Deliberation (`--flow sequential`)**: Agents read each other's live statements in real time and challenge specific claims. Eliminates terminal stream collisions.
- 🛡 **Guaranteed Read-Only Discussion**: Strict process sandboxes (`--permission-mode plan`, `--sandbox read-only`) prevent unauthorized file modifications during debate.
- 🎭 **5 Battle-Tested Meeting Modes**:
  - `adversarial`: Brutal red-team vs blue-team review (Default).
  - `consensus`: Architecture design, modularity, and trade-off convergence.
  - `audit`: Deep security, injection, and authorization risk audit.
  - `refactor`: Eliminating technical debt, code smells, and DRY/SOLID violations.
  - `brainstorm`: Divergent solution exploration with pros/cons matrix.
- 🔌 **Pluggable Agent Ecosystem**: Built-in support for `claude`, `codex`, `opencode`, `aider`, `gemini`, plus user-defined custom agents.
- 🧪 **Execution Safeguards**: Automatically run `--verify "<command>"` (e.g. `npm test`, `pytest`, `cargo test`) after execution and generate git diff summaries (`--diff`).
- ⚡ **Zero Runtime Dependencies**: Built entirely with standard Node.js libraries. Installs instantly and starts with zero latency.
- 🌐 **Cross-Platform**: First-class support for WSL, Linux, macOS, and native Windows.

---

## 🚀 Quick Start

### 1. Installation

**Option A: Run via npx (Zero install)**
```bash
npx triad-meeting doctor
```

**Option B: Install globally**
```bash
npm install -g triad-meeting
```

**Option C: Local Git Clone**
```bash
git clone https://github.com/Lucian-ming/triad-meeting.git
cd triad-meeting
npm link
```

### 2. Verify Your Environment

Check which AI coding agents are installed and ready:
```bash
triad-meeting doctor
```

Output:
```text
╔══════════════════════════════════════════════════╗
║  Triad Meeting Doctor                            ║
║  Environment & Agent Diagnostic                  ║
╚══════════════════════════════════════════════════╝

Platform:     Linux 6.6.87 (x64) [WSL Native]
Node.js:      v20.20.2

▶ Available Agent CLI Status
─────────────────────────────────────────────
Agent        │ Command   │ Status     │ Details                    
─────────────┼───────────┼────────────┼────────────────────────────
Claude Code  │ claude    │ ✔ READY    │ 0.2.29                     
Codex        │ codex     │ ✔ READY    │ 0.1.12                     
OpenCode     │ opencode  │ ✔ READY    │ 0.0.8                      
Aider        │ aider     │ ✔ READY    │ aider 0.74.2               
Gemini       │ gemini    │ ✖ MISSING  │ Not in PATH                
```

### 3. Run Your First Meeting

```bash
# Multi-agent architectural review
triad-meeting run --rounds 2 "Review our auth middleware and identify concurrency bottlenecks"

# Security audit with Claude and OpenCode
triad-meeting run --only claude,opencode --mode audit "Audit API route authorization checks"

# Deliberate, implement consensus, and verify with tests
triad-meeting run --execute --executor codex --verify "npm test" --diff "Fix race conditions in SessionManager"
```

---

## 📖 CLI Reference

```text
USAGE:
  triad-meeting run [options] "your task description"
  triad-meeting run [options] --file task.md
  triad-meeting doctor
  triad-meeting modes
  triad-meeting presets

PRESETS & TEMPLATES:
  -p, --preset <name>     Apply workflow shortcut: pr-review, architecture, security, quick-fix, brainstorm

CORE OPTIONS:
  -r, --rounds <N>        Discussion rounds before synthesis (default: 2)
  -m, --mode <mode>       Meeting archetype: adversarial, consensus, audit, refactor, brainstorm (default: adversarial)
  --flow <flow>           Deliberation flow: sequential (default, turn-based debate) or parallel
  --agents, --only <list> Comma-separated agents: claude, codex, opencode, aider, gemini (auto-detects if omitted)
  --without <list>        Exclude specific agents from the meeting
  --cwd <dir>             Shared workspace root (default: current directory)
  -e, --execute           Let the selected executor implement changes following consensus
  --executor <agent>      Agent assigned to execute implementation (default: codex)
  --synthesizer <agent>   Agent to summarize consensus, or "none" (default: codex)
  --verify <command>      Run automated verification command after execution (e.g. "npm test")
  --diff                  Display git diff summary after execution
  -o, --out <file>        Custom output path for Markdown transcript
  -f, --file <file>       Read task prompt from file
  --dry-run               Preview command calls and prompts without invoking LLMs
  --json                  Also generate a structured .json transcript
  --show-logs             Stream agent stderr logs live to terminal
  --no-stream             Disable live output streaming

MODEL SELECTION:
  --model <name>          Default model for agents that accept it
  --claude-model <name>   Specific model for Claude Code
  --codex-model <name>    Specific model for Codex
  --opencode-model <name> Specific model for OpenCode
  --aider-model <name>    Specific model for Aider
```

---

## 🎯 Common Recipes

### Scenario 1: Pre-Merge RFC & Architecture Review
Convene Claude Code, Codex, and Aider for 2 rounds of adversarial critique before writing code:
```bash
triad-meeting run \
  --agents claude,codex,aider \
  --mode consensus \
  --rounds 2 \
  "Review docs/rfc-distributed-lock.md and evaluate Redis vs Raft trade-offs"
```

### Scenario 2: Deep Security & Vulnerability Audit
Scan for OWASP Top 10 vulnerabilities, auth bypasses, and SQL/command injections:
```bash
triad-meeting run \
  --mode audit \
  "Audit all endpoints in src/api/ for authorization bypass and input sanitization"
```

### Scenario 3: Hard Bug Triage with Test Verification
Agents debate the root cause, reach an implementation plan, Codex applies the fix, and `npm test` verifies it:
```bash
triad-meeting run \
  --mode adversarial \
  --rounds 2 \
  --execute \
  --executor codex \
  --verify "npm test" \
  --diff \
  "Investigate memory leak in WebSocket connection pool"
```

---

## ⚙️ Configuration (`.triadrc.json`)

Create a `.triadrc.json` file in your repository root or `~/.config/triad/config.json`:

```json
{
  "rounds": 2,
  "mode": "adversarial",
  "flow": "sequential",
  "agents": ["claude", "codex", "aider"],
  "synthesizer": "codex",
  "executor": "codex",
  "models": {
    "claude": "claude-3-7-sonnet",
    "codex": "o3-mini"
  },
  "customAgents": {
    "local-ollama": {
      "name": "DeepSeek R1",
      "command": "ollama",
      "discussArgs": ["run", "deepseek-r1"],
      "executeArgs": ["run", "deepseek-r1"],
      "stdin": true
    }
  }
}
```

---

<br/>

## 中文使用指南

### 简介

当单个 AI 编程 Agent 独立工作时，经常会出现**幻觉、盲目乐观、陷入局部最优解或破坏现有架构**的问题。

在现实的软件工程中，核心方案需要通过**同行评审 (Peer Review)、RFC 论证与红蓝对抗**。

`triad-meeting` 将这种机制带入你的本地终端：
- 调度 **Claude Code**、**OpenAI Codex**、**OpenCode**、**Aider**、**Gemini** 等多个顶级 AI 编程 CLI 在同一仓库共同开会。
- 强制执行**严苛互评 (Adversarial Review)**，相互挑错、质疑漏洞与边界情况，拒绝表面客套。
- 讨论期间开启**严格只读沙箱**，杜绝随意乱改或污染仓库代码。
- 最终输出经受住考验的高质量共识方案，并可一键委托执行者编写代码，同时自动运行测试套件与 Git Diff 校验。

### 核心亮点

1. **红蓝对抗，消除单模型盲区**：默认要求严苛互评，主动指出对方方案的漏洞与缺失证据。
2. **轮流发言，避免日志冲突 (`--flow sequential`)**：支持真正的多轮递进辩论，后者实时参考前者的最新观点，终端输出清晰无穿插。
3. **5 大专业会议模式**：
   - `adversarial`: 严苛互评 / 红蓝对抗（默认）
   - `consensus`: 架构共识 / 接口协同设计
   - `audit`: 安全审计 / 漏洞与权限排查
   - `refactor`: 代码重构 / 异味消除与设计模式
   - `brainstorm`: 头脑风暴 / 多方案对比分析
4. **执行闭环与测试验证**：支持 `--verify "npm test"` 自动回归测试，支持 `--diff` 查看改动摘要。
5. **零外部依赖 & 跨平台**：纯 Node.js 原生实现，无冗余依赖，即装即用，完美兼容 WSL、Linux、macOS 与 Windows。

### 快速上手

```bash
# 1. 检查各 Agent CLI 可用状态与预设
triad-meeting doctor
triad-meeting presets

# 2. 一键使用快捷工作流预设（如 PR 审查）
triad-meeting run --preset pr-review "审查 PR #42 变更，排查潜在死锁与测试覆盖遗漏"

# 3. 2 轮严苛技术评审（自动选择当前已安装的 Agent）
triad-meeting run --rounds 2 "评审当前项目数据库连接池架构，找出高并发瓶颈"

# 4. 仅限 Claude 和 Aider 进行代码重构评审
triad-meeting run --only claude,aider --mode refactor "重构 payment 模块，消除重复代码"

# 5. 开会达成共识后，由 Codex 实施并运行单元测试验证
triad-meeting run --execute --executor codex --verify "npm test" --diff "修复用户认证过期时的死锁问题"
```

### 配置文件说明

在项目根目录创建 `.triadrc.json` 即可持久化常用配置（支持自定义本地 Agent，如 Ollama/DeepSeek）：
```json
{
  "rounds": 2,
  "mode": "adversarial",
  "flow": "sequential",
  "agents": ["claude", "codex", "opencode"],
  "executor": "codex"
}
```

---

## 🤝 Contributing

Contributions are warmly welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on development setup, adapter architecture, and testing.

## 📄 License

[MIT License](LICENSE) © 2025-2026 Lucian
