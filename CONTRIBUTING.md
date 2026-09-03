# Contributing to triad-meeting

Thank you for your interest in improving `triad-meeting`! We welcome contributions of all kinds: new agent adapters, meeting modes, documentation improvements, and bug fixes.

---

## 🛠 Development Setup

`triad-meeting` is designed with **zero external runtime dependencies** for maximum portability, security, and startup performance.

### Prerequisites
- Node.js >= 18.0.0
- Git

### Getting Started

1. Clone your fork:
   ```bash
   git clone https://github.com/Lucian-ming/triad-meeting.git
   cd triad-meeting
   ```

2. Run tests:
   ```bash
   npm test
   ```

3. Run diagnostic check:
   ```bash
   node bin/triad-meeting.mjs doctor
   ```

---

## 🧩 Adding a New Agent Adapter

To add support for a new AI CLI tool:

1. Create `src/adapters/<new-agent>.js` extending `BaseAdapter`.
2. Implement `buildInvocation({ prompt, phase, options })`:
   - `phase === "discuss"`: Configure read-only / planning mode.
   - `phase === "execute"`: Configure workspace-write / execution permissions.
3. Register the adapter in `src/adapters/index.js`.
4. Add unit tests in `tests/adapters.test.js`.
5. Update `doctor` command and README documentation.

---

## 🧪 Testing Guidelines

- All tests use Node.js's native test runner (`node:test` and `node:assert/strict`).
- Run all tests before submitting a pull request:
  ```bash
  npm test
  ```
- Make sure CI passes across Ubuntu, macOS, and Windows.

---

## 📜 Code Style

- Modern ES Modules (`import`/`export`).
- Clean, self-documenting code.
- Keep external runtime dependencies at **zero**.
