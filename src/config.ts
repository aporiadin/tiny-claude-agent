import path from "node:path";

/** Override per run to compare models: MODEL=claude-sonnet-5-5 npm start */
export const MODEL = process.env.MODEL || "claude-opus-5-5";
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
