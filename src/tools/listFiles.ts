import { readdir } from "node:fs/promises";
import path from "node:path";
import { WORKSPACE } from "../config.ts";
import type { AgentTool } from "./types.ts";

export const listFiles: AgentTool = {
  definition: {
    name: "list_files",
    description: "List all files in the project workspace (paths relative to the workspace root).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },

  async run() {
    const entries = await readdir(WORKSPACE, { recursive: true, withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.relative(WORKSPACE, path.join(entry.parentPath, entry.name)))
      .join("\n");
  },
};
