# tiny-claude-agent

A minimal coding agent built on the Claude API. It reads a small TypeScript project, finds a bug, fixes it and runs the tests to confirm.

## Structure

```
src/
├── index.ts        entry point: reads the task, starts the agent
├── config.ts       model, effort, limits, system prompt, default task
├── agent.ts        the loop: call Claude, run the tools it asks for, repeat
├── usage.ts        per-turn token usage and the summary table
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

After every request the agent prints one line, followed by the tools that request asked for. At the end it prints a table for the whole run. This is a real run of the default task:

```
[turn 1] tool_use (2 tool calls) · in 779 · out 50 · 1.8s
[tool] list_files ""
[tool] run_tests ""

[turn 2] tool_use (2 tool calls) · in 1,323 · out 101 · 1.7s
[tool] read_file "calc.ts"
[tool] read_file "calc.test.ts"

[turn 3] tool_use (2 tool calls) · in 1,571 · out 119 · 1.8s
[tool] write_file "calc.ts"
[tool] run_tests ""

[turn 4] end_turn · in 1,855 · out 134 · 2.3s
I fixed the failing test, and the suite now passes (1 of 1).
...

── Usage: claude-opus-5-5, effort medium ──
turn   stop             tools     input    output      time
1      tool_use             2       779        50      1.8s
2      tool_use             2     1,323       101      1.7s
3      tool_use             2     1,571       119      1.8s
4      end_turn             0     1,855       134      2.3s
total  4 turns              6     5,528       404      7.6s
```

- **input** is the whole prompt sent on that turn (system prompt, tool definitions and the full history), so it grows every turn: the API keeps no state, and the agent resends everything. The conversation never passes ~1,900 tokens, but the run sends 5,528 in total.
- **output** counts every token the model generated, including thinking it doesn't show, so it can be much larger than the printed text. Here it stays small: on an easy task at `medium` effort the model barely thinks.

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

## Seeing the raw payloads

Each run also saves the exact request body the agent sends on every turn and the full response it gets back, one folder per run:

```
runs/2026-11-21T21-06-24_claude-opus-5-5_medium/
├── turn-01-request.json    the body sent to the API on turn 1
├── turn-01-response.json   the full response that came back
├── turn-02-request.json
└── ...
```

Things to point out when walking through them:

- **Each request file contains the whole conversation so far.** The files get bigger every turn (about 2 KB on turn 1, 6 KB on turn 4), because the API keeps no state and the agent resends everything.
- **A request is just `model`, `max_tokens`, `output_config`, `system`, `tools` and `messages`.** There is nothing else behind the scenes on the client side.
- **Tool calls and results are linked by id.** A `tool_use` block in a response has an `id`, and the agent's next request answers it with a `tool_result` carrying the same `tool_use_id`.
- **`usage` in each response** holds the token counts behind the table, including `output_tokens_details.thinking_tokens`, which shows how much of the output was hidden thinking.
- **Thinking blocks look empty.** At higher effort, responses can contain `thinking` blocks with an empty `thinking` field and a long `signature`. That's expected: the model thinks, but its thinking text isn't returned by default. The agent sends the blocks back unchanged in the next request.
- **This is the client side, not the model's literal input.** The API turns the request into the model's actual input on its side, including instructions it adds for tool use. That's why turn 1 costs about 790 input tokens for a fairly small file.

To show what a single turn adds, compare two consecutive requests:

```bash
diff runs/<run>/turn-03-request.json runs/<run>/turn-04-request.json
```

The only difference is at the end of `messages`: the model's last response and the tool results that answer it. Everything before that is resent unchanged.

Only the request body is saved, never the HTTP headers, so your API key isn't written to disk. Tool results can include local file paths (from test stack traces, for example), so check the files before sharing them. `runs/` is in `.gitignore`.

## How it works

1. `agent.ts` sends the task to Claude along with four tool definitions.
2. When Claude replies with `stop_reason: "tool_use"`, the agent runs each requested tool and sends all results back in one message.
3. This repeats until Claude replies without asking for a tool.

**The model decides what to do; the harness decides how it happens.** One response can ask for several tools at once. Here they run one at a time, in the order Claude listed them. That's what makes turn 3 above work: `write_file` saves the fix before `run_tests` starts. Run them in parallel instead and the tests could see the old file and fail, and the model would have no way to know why. Real agents usually run read-only tools in parallel and anything that changes state one at a time.

**This is not a sandbox.** The file tools refuse any path that leads outside `workspace/`, but `run_tests` runs whatever code is in `workspace/` with your user's permissions, and Claude can write that code. Run it only with tasks you're comfortable letting run on your machine.

## Resetting the demo

A successful run fixes the bug in `workspace/calc.ts`. To see what the agent changed and start over:

```bash
git diff workspace/   # review the agent's fix
npm run reset         # restore workspace/ to the committed (buggy) state
```

## Adding a tool

Create `src/tools/<name>.ts` exporting an `AgentTool` (a `definition` Claude sees and a `run` function), then add it to the list in `src/tools/index.ts`.
