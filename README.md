# tiny-claude-agent

A minimal coding agent built on the Claude API. It reads a small TypeScript project, finds a bug, fixes it and runs the tests to confirm.

## Structure

```
src/
├── index.ts        entry point: reads the task, starts the agent
├── config.ts       model, limits, system prompt, default task
├── agent.ts        the loop: call Claude, run the tools it asks for, repeat
└── tools/
    ├── index.ts      collects all tools, exports toolDefinitions + runTool()
    ├── types.ts      AgentTool = { definition, run }
    ├── workspace.ts  path guard that keeps tools inside workspace/
    ├── listFiles.ts
    ├── readFile.ts
    ├── writeFile.ts
    └── runTests.ts
workspace/          the project the agent works on
├── calc.ts         add() has a bug (a - b)
└── calc.test.ts
```

## Setup

Requires Node 23.6+ (runs `.ts` files natively, no build step).

```bash
npm install
cp .env.example .env    # then add your ANTHROPIC_API_KEY
```

## Usage

```bash
npm start                                   # default task: fix the failing test
npm start -- "Add a multiply function with a test"
npm run dev                                 # same as start, restarts on file changes
npm test                                    # run the workspace tests yourself
npm run reset                               # restore workspace/ to its original state
npm run typecheck
```

The agent prints Claude's messages and each tool call (`[tool] read_file "calc.ts"`) as it works. It stops when Claude finishes, after 20 turns, or if a response is declined or cut off.

## Watching the token usage

After every request the agent prints one line, and at the end a table for the whole run:

```
[turn 2] tool_use (1 tool call) · in 1,342 · out 118 · 2.1s
...
── Usage: claude-opus-5-5 ──
turn   stop             tools     input    output      time
1      tool_use             1       812        95      1.9s
...
total  5 turns              4     7,040       930     11.4s
```

- **input** is the whole prompt sent on that turn (system prompt, tool definitions and the full history), so it grows every turn: the API keeps no state, and the agent resends everything.
- **output** counts every token the model generated, including thinking it doesn't show. That's why it can be much larger than the text printed.

To compare models, run the same task with a different `MODEL` (then `npm run reset` between runs):

```bash
MODEL=claude-sonnet-5-5 npm start
MODEL=claude-haiku-5-5 npm start
```

Effort is pinned to `medium` so every model runs at the same setting; otherwise each would use its own default. Change it with `EFFORT` (`low`, `medium`, `high`, `xhigh` or `max`):

```bash
EFFORT=high MODEL=claude-sonnet-5-5 npm start
```

The same level isn't the same amount of thinking on every model: each model calibrates its own levels. Comparing at one setting shows how the models behave when you configure them identically, which is what you'd do in practice.

## How it works

1. `agent.ts` sends the task to Claude along with four tool definitions.
2. When Claude replies with `stop_reason: "tool_use"`, the agent runs each requested tool and sends all results back in one message.
3. This repeats until Claude replies without asking for a tool.

Tools can only touch files inside `workspace/`; any path that leads outside it is refused.

## Resetting the demo

A successful run fixes the bug in `workspace/calc.ts`. To see what the agent changed and start over:

```bash
git diff workspace/   # review the agent's fix
npm run reset         # restore workspace/ to the committed (buggy) state
```

## Adding a tool

Create `src/tools/<name>.ts` exporting an `AgentTool` (a `definition` Claude sees and a `run` function), then add it to the list in `src/tools/index.ts`.
