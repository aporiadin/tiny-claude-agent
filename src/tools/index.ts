import type Anthropic from "@anthropic-ai/sdk";
import { TOOLS } from "../config.ts";
import { bash } from "./bash.ts";
import { listFiles } from "./listFiles.ts";
import { readFile } from "./readFile.ts";
import { runTests } from "./runTests.ts";
import type { AgentTool, ToolInput } from "./types.ts";
import { writeFile } from "./writeFile.ts";

const allTools: AgentTool[] = [listFiles, readFile, writeFile, runTests, bash];

/** The tools named in TOOLS (see config.ts). Claude only sees, and can only call, these. */
const enabledTools = TOOLS.map((name) => {
  const tool = allTools.find((t) => t.definition.name === name);
  if (!tool) {
    const available = allTools.map((t) => t.definition.name).join(", ");
    throw new Error(`Unknown tool in TOOLS: "${name}". Available: ${available}`);
  }
  return tool;
});

/** Tool definitions sent to Claude. */
export const toolDefinitions: Anthropic.Tool[] = enabledTools.map((tool) => tool.definition);

/** Execute a tool Claude asked for, by name. */
export async function runTool(name: string, input: ToolInput): Promise<string> {
  const tool = enabledTools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.run(input);
}
