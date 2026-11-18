import type Anthropic from "@anthropic-ai/sdk";

export type ToolInput = Record<string, unknown>;

/** A tool = what Claude sees (definition) + what we execute (run). */
export interface AgentTool {
  definition: Anthropic.Tool;
  run(input: ToolInput): Promise<string>;
}
