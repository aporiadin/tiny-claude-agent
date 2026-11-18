import type Anthropic from "@anthropic-ai/sdk";
import { listFiles } from "./listFiles.ts";
import { readFile } from "./readFile.ts";
import { runTests } from "./runTests.ts";
import type { ToolInput } from "./types.ts";
import { writeFile } from "./writeFile.ts";

const allTools = [listFiles, readFile, writeFile, runTests];

/** Tool definitions sent to Claude. */
export const toolDefinitions: Anthropic.Tool[] = allTools.map((tool) => tool.definition);

/** Execute a tool Claude asked for, by name. */
export async function runTool(name: string, input: ToolInput): Promise<string> {
  const tool = allTools.find((t) => t.definition.name === name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.run(input);
}
