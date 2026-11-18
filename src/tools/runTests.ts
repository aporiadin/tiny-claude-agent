import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { WORKSPACE } from "../config.ts";
import type { AgentTool } from "./types.ts";

const execFileAsync = promisify(execFile);

export const runTests: AgentTool = {
  definition: {
    name: "run_tests",
    description: "Run the workspace test suite (node --test) and return its output and pass/fail status.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },

  async run() {
    try {
      const { stdout, stderr } = await execFileAsync("node", ["--test", WORKSPACE], {
        timeout: 60_000,
      });
      return `PASSED\n${stdout}${stderr}`;
    } catch (err) {
      // node --test exits non-zero when tests fail; that's a normal result, not a tool error.
      const e = err as { stdout?: string; stderr?: string; message: string };
      return `FAILED\n${e.stdout ?? ""}${e.stderr ?? e.message}`;
    }
  },
};
