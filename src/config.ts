import path from "node:path";

/** Override per run to compare models: MODEL=claude-sonnet-5-5 npm start */
export const MODEL = process.env.MODEL || "claude-opus-5-5";

/**
 * How hard the model thinks. Pinned so different models are compared at the same setting
 * (left unset, each model uses its own default). Override: EFFORT=high npm start
 */
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export type Effort = (typeof EFFORTS)[number];
export const EFFORT = parseEffort(process.env.EFFORT || "medium");

function parseEffort(value: string): Effort {
  if (!(EFFORTS as readonly string[]).includes(value)) {
    throw new Error(`EFFORT must be one of ${EFFORTS.join(", ")} (got "${value}")`);
  }
  return value as Effort;
}
export const MAX_TOKENS = 16000;
export const MAX_TURNS = 20;

/** The project the agent works on. Tools cannot touch anything outside it. */
export const WORKSPACE = path.resolve("workspace");

export const SYSTEM_PROMPT =
  "You are a coding agent working on a small TypeScript project. " +
  "Use the tools to inspect files, make changes, and run tests. " +
  "Make the smallest change that fixes the problem, and verify it by running the tests before you finish.";

export const DEFAULT_TASK =
  "The test suite in this project is failing. Find the bug, fix it, and confirm the tests pass.";
