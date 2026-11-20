import Anthropic from "@anthropic-ai/sdk";
import { EFFORT, MAX_TOKENS, MAX_TURNS, MODEL, SYSTEM_PROMPT } from "./config.ts";
import { runTool, toolDefinitions } from "./tools/index.ts";
import type { ToolInput } from "./tools/types.ts";
import { UsageLog } from "./usage.ts";

// Reads ANTHROPIC_API_KEY (or an `ant auth login` profile) from the environment.
const client = new Anthropic();

/** Run the agent loop on a task. Returns true if Claude finished on its own. */
export async function runAgent(task: string): Promise<boolean> {
  const usage = new UsageLog();
  try {
    return await loop(task, usage);
  } finally {
    usage.printSummary(`${MODEL}, effort ${EFFORT}`);
  }
}

async function loop(task: string, usage: UsageLog): Promise<boolean> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: task }];

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const started = performance.now();
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      output_config: { effort: EFFORT },
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

    // Keep the full content (including thinking blocks) in the history.
    messages.push({ role: "assistant", content: response.content });
    usage.record(turn, response, performance.now() - started);
    printText(response);

    switch (response.stop_reason) {
      case "tool_use":
        messages.push({ role: "user", content: await runToolCalls(response) });
        continue;
      case "refusal":
        console.error("Request was declined:", response.stop_details?.explanation);
        return false;
      case "max_tokens":
        console.error("Response hit max_tokens; stopping.");
        return false;
      default:
        return true; // end_turn: Claude is done
    }
  }

  console.error(`Stopped after ${MAX_TURNS} turns without finishing.`);
  return false;
}

/**
 * Run every tool call in a response; all results go back in one user message.
 * Calls run one at a time, in the order Claude listed them, so a write finishes
 * before a test run that comes after it in the same response.
 */
async function runToolCalls(response: Anthropic.Message): Promise<Anthropic.ToolResultBlockParam[]> {
  const results: Anthropic.ToolResultBlockParam[] = [];

  for (const block of response.content) {
    if (block.type !== "tool_use") continue;

    const input = block.input as ToolInput;
    console.log(`[tool] ${block.name} ${JSON.stringify(input.path ?? "")}`);

    try {
      const output = await runTool(block.name, input);
      results.push({ type: "tool_result", tool_use_id: block.id, content: output });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`[tool error] ${message}`);
      results.push({ type: "tool_result", tool_use_id: block.id, content: message, is_error: true });
    }
  }

  return results;
}

function printText(response: Anthropic.Message): void {
  for (const block of response.content) {
    if (block.type === "text") console.log(block.text);
  }
}
