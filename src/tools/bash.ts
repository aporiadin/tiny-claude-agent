import { exec } from "node:child_process";
import { promisify } from "node:util";
import { WORKSPACE } from "../config.ts";
import type { AgentTool } from "./types.ts";
import { childEnv } from "./workspace.ts";

const execAsync = promisify(exec);

const TIMEOUT_MS = 30_000;
const MAX_OUTPUT_CHARS = 20_000; // long output costs tokens on every later turn

/**
 * Runs any shell command, starting in workspace/. Unlike the file tools, nothing stops a
 * command from reaching outside the workspace: it has the same permissions as your user.
 */
export const bash: AgentTool = {
  definition: {
    name: "bash",
    description:
      "Run a shell command and return its exit code and output. Every call starts a new shell in the " +
      "workspace folder, so `cd` and variables don't carry over between calls. Commands time out after 30 seconds.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "The shell command to run" },
      },
      required: ["command"],
      additionalProperties: false,
    },
  },

  async run(input) {
    if (typeof input.command !== "string" || input.command.trim() === "") {
      throw new Error("`command` must be a non-empty string");
    }

    try {
      const { stdout, stderr } = await execAsync(input.command, {
        cwd: WORKSPACE,
        env: childEnv(),
        timeout: TIMEOUT_MS,
      });
      return truncate(`exit code: 0\n${stdout}${stderr}`);
    } catch (err) {
      // A non-zero exit code is a normal result the model should see, not a tool failure.
      const e = err as { code?: number | string; killed?: boolean; stdout?: string; stderr?: string; message: string };
      if (e.killed) {
        return truncate(`Command timed out after ${TIMEOUT_MS / 1000}s and was stopped.\n${e.stdout ?? ""}${e.stderr ?? ""}`);
      }
      return truncate(`exit code: ${e.code ?? "unknown"}\n${e.stdout ?? ""}${e.stderr || e.message}`);
    }
  },
};

function truncate(output: string): string {
  if (output.length <= MAX_OUTPUT_CHARS) return output;
  const hidden = output.length - MAX_OUTPUT_CHARS;
  return `${output.slice(0, MAX_OUTPUT_CHARS)}\n[output truncated: ${hidden} more characters]`;
}
