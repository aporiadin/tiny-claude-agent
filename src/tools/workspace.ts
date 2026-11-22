import path from "node:path";
import { WORKSPACE } from "../config.ts";

/** Resolve a workspace-relative path, refusing anything that escapes the workspace. */
export function resolveInWorkspace(p: unknown): string {
  if (typeof p !== "string" || p.length === 0) {
    throw new Error("`path` must be a non-empty string");
  }
  const full = path.resolve(WORKSPACE, p);
  if (full !== WORKSPACE && !full.startsWith(WORKSPACE + path.sep)) {
    throw new Error(`Path is outside the workspace: ${p}`);
  }
  return full;
}

/**
 * Environment for commands the agent runs: everything except ANTHROPIC_* variables.
 * Without this, a command like `env` would put your API key into a tool result, which is
 * sent to the API and saved in runs/.
 */
export function childEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("ANTHROPIC_")));
}
