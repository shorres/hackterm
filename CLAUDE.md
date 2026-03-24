# CLAUDE.md — HACKTERM Codebase Guide

This file provides context for AI assistants (Claude, Copilot, etc.) working in this repository.

---

## Project Overview

**HACKTERM** is a browser-based incremental terminal hacking game inspired by Hacknet. Players issue CLI-style commands to scan, probe, exploit, and exfiltrate simulated networks while managing a heat meter that triggers law-enforcement consequences. The game features a prestige system with three ending types that carry bonuses into subsequent runs.

- Fully client-side (no backend/API)
- ~2,800 lines of TypeScript
- All state persisted to browser localStorage via Zustand

---

## Repository Layout

```
/                          # Git root
├── README.md              # Project overview and gameplay reference
├── CLAUDE.md              # This file
└── hackterm/              # All application code lives here
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
    ├── eslint.config.js
    ├── index.html
    ├── public/            # Static assets (favicon, icons)
    └── src/
        ├── main.tsx           # React 19 entry point
        ├── App.tsx            # Root component, game lifecycle, 1 s tick interval
        ├── types/index.ts     # All shared TypeScript interfaces and enums
        ├── store/
        │   ├── gameStore.ts       # Zustand store — current run state
        │   └── prestigeStore.ts   # Zustand store — persistent career meta
        ├── engine/
        │   ├── gameLoop.ts        # Tick logic: heat decay, FBI bands, admin patches
        │   ├── networkGen.ts      # Seeded procedural network generation
        │   └── commands/          # One file per CLI command handler
        │       ├── index.ts       # Command registry and context type
        │       ├── exploit.ts     # exploit --loud / --silent flags
        │       ├── backdoor.ts    # Passive income installation
        │       ├── market.ts      # Zero-days and crew bots
        │       └── ...            # ~20 more commands
        ├── data/
        │   ├── marketItems.ts     # Zero-day and crew bot definitions
        │   ├── upgrades.ts        # Hardware upgrade specs and cost formulas
        │   └── nodeTemplates.ts   # Node type templates with vulnerabilities
        └── components/
            ├── Terminal/
            │   ├── TerminalInput.tsx   # Input with arrow-key history
            │   └── TerminalOutput.tsx  # Colored scrollable output (≤500 lines)
            ├── HUD/HUD.tsx             # Real-time money/heat/IP overlay
            ├── BootScreen.tsx          # Animated boot + seed entry + resume
            ├── PrestigeScreen.tsx      # End-of-run stats + prestige menu
            ├── RunIntroScreen.tsx      # Per-run lore screen
            └── DebugPanel.tsx          # Developer debug toggle
```

---

## Technology Stack

| Layer | Library / Tool | Version |
|---|---|---|
| UI framework | React | 19.2.4 |
| Language | TypeScript | 5.9.3 |
| Build tool | Vite | 8.0.1 |
| State management | Zustand | 5.0.12 |
| Styling | Tailwind CSS | 3.4.19 |
| ID generation | nanoid | 5.1.7 |
| Seeded RNG | seedrandom | 3.0.5 |
| Linting | ESLint 9 (flat config) + typescript-eslint | 9.39.4 / 8.57.0 |

---

## Development Workflows

### Setup

```bash
cd hackterm
npm install
```

### Common Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server at http://localhost:5173 (HMR) |
| `npm run host` | Dev server exposed on network interface |
| `npm run build` | `tsc -b` then Vite production bundle → `dist/` |
| `npm run lint` | ESLint with TypeScript rules |
| `npm run preview` | Serve the `dist/` build locally |

### No Tests

There is currently no automated test suite. All commands, game mechanics, and state mutations must be manually verified in the browser.

### No CI/CD

No GitHub Actions workflows or other CI pipelines exist. Checks (lint, build) must be run locally before pushing.

---

## Architecture & Key Conventions

### State Management

Two Zustand stores handle all runtime state:

**`gameStore.ts`** — ephemeral per-run state
- Holds: `money`, `heat`, `network`, `upgrades`, `activeOperation`, `terminalLines`, `commandHistory`, `backdooredNodes`, etc.
- Persisted key: `hackterm-game` (localStorage)
- 40+ action methods; import and call via `useGameStore.getState()` inside engine code and via `useGameStore()` hook in React components.

**`prestigeStore.ts`** — persistent career meta across runs
- Holds: `totalRuns`, `incomeMultiplier`, `retainedMoney`, `clearanceLevel`, `legendRuns`, `fbiRuns`, `counterHackedRuns`
- Persisted key: `hackterm-prestige` (localStorage)
- Updated by `recordEnding(type)` when a run ends.

### Game Loop (1 second tick)

`App.tsx` calls `tickGameLoop(store)` every 1000 ms via `setInterval`. The tick handles:
1. Heat decay (0.5/tick idle, 0.2/tick connected)
2. FBI escalation in 5 bands (each 20% heat)
3. Counter-hack detection (0.1% base, 3× with crew bots)
4. Admin patch events on T2/T3 compromised nodes (0.15–0.3%/tick, 3× if logs dirty)
5. Passive income from backdoored nodes
6. `fbi_closing` prestige phase countdown

### Command System

Each command lives in `src/engine/commands/<name>.ts` and exports a function:

```typescript
export async function myCommand(
  args: string[],
  context: CommandContext
): Promise<void>
```

`CommandContext` provides: `store`, `addLine`, `addLines`, `currentNode`, `currentPath`.

Register new commands in `src/engine/commands/index.ts`.

### Procedural Generation

`networkGen.ts` takes a numeric seed and produces a deterministic network of 10 subnets (10.0.0.x – 10.0.9.x), each containing 3–8 nodes. Node tier (1–3) controls difficulty, income, and vulnerability types. The same seed always produces the same world.

### Output Line Types

Terminal lines are typed (`OutputType`) for color rendering in `TerminalOutput.tsx`:

| Type | Usage |
|---|---|
| `default` | Normal command output |
| `success` | Positive result (green) |
| `error` | Failures and bad args (red) |
| `warning` | Caution messages (yellow) |
| `info` | Neutral system info (cyan) |
| `system` | Game engine events |
| `prompt` | User input echo |
| `data` | Structured data (ports, files) |
| `progress` | Operation progress bars |

### Upgrade Formula Conventions

Defined in `data/upgrades.ts`. Upgrade effects follow these patterns:
- Passive income: `baseIncome × (1 + cpu × 0.2)`
- Exploit speed: `× (1 + cpu × 0.3)`
- Max backdoors: `2 + ram × 2`
- Scan subnet range: `1 + nic` subnets

---

## Game Mechanics Reference

### Core Loop

```
nmap → probe <ip> → exploit <ip> <vuln> → connect <ip>
  → ls / cd / cat → exfiltrate <file> → backdoor → disconnect
  → clearlog (reduces heat)
```

### Prestige Endings

| Ending | Trigger | Persistent Bonus |
|---|---|---|
| **Legend** | `retire` command with `money ≥ $25,000` | +0.5× income multiplier per run |
| **FBI Raid** | Heat reaches 100% | +1 clearance level (max 5) |
| **Counter-Hacked** | Random event (0.1%/tick base) | Retain 15% money (stacks, capped 60%) |

### Heat System

- Actions that generate heat: exploit, exfiltrate, clearlog failure, loud mode
- Heat decay: 0.5/tick (idle), 0.2/tick (connected)
- FBI escalation: 5 pressure bands at 0/20/40/60/80% heat
- `clearlog` command reduces heat; effectiveness scaled by logWiper upgrade level

### Market Items

**Zero-days** (6 types, tier 1–3, $800–$5,500): Grant exploitable vulnerabilities on nodes.

**Crew bots** (3 types): Script Kiddie / Hired Hand / Insider
- Generate passive income
- Increase counter-hack detection chance (3× base rate)

---

## TypeScript Conventions

- **Strict mode** enabled: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- All shared interfaces live in `src/types/index.ts`; do not scatter type definitions across files
- Target: ES2023, DOM + DOM.Iterable libs, React JSX transform (`react-jsx`)
- Prefer `import type` for type-only imports
- ESLint flat config (`eslint.config.js`) enforces React hooks rules and react-refresh

---

## Styling Conventions

- **Tailwind CSS utility classes** only; avoid custom CSS unless adding a new animation
- Custom theme defined in `tailwind.config.js`: terminal color palette, monospace font stack, `blink` / `scan-line` / `fade-in` keyframe animations
- Global resets in `index.css` (Tailwind directives); component-specific overrides in `App.css`
- Terminal window background: near-black (`#0a0a0a`); primary text: terminal green (`#00ff41`)

---

## Git Conventions

- **Branch naming:** `feature/<short-description>` for new features
- **Commit messages:** lowercase, action-oriented, imperative present tense
  - Good: `add --loud flag to exploit command`
  - Avoid: `Added the loud flag`, `WIP`, `fix stuff`
- **Merge via PR** — direct pushes to `main` are discouraged
- **No force-push** to `main` or shared branches

---

## Important Constraints for AI Assistants

1. **Do not introduce network requests.** The game is intentionally 100% client-side with no backend.
2. **Do not add real CVE identifiers or real exploit techniques.** Use fictional names only (see README disclaimer).
3. **Maintain seeded RNG determinism.** Any new procedural content in `networkGen.ts` must use the `rng()` function derived from the seed, never `Math.random()`.
4. **Cap terminal lines at 500.** `gameStore.ts` trims `terminalLines` to prevent DOM bloat; do not remove this cap.
5. **Preserve Zustand persistence keys.** Changing `hackterm-game` or `hackterm-prestige` keys breaks existing saves.
6. **TypeScript strict mode is non-negotiable.** Fix type errors; do not use `any` or `@ts-ignore` without a documented reason.
7. **Run `npm run lint` and `npm run build` before committing.** There is no CI to catch errors automatically.
8. **New commands require registration.** After creating `src/engine/commands/<name>.ts`, add the entry to the registry in `src/engine/commands/index.ts`.
