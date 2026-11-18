import { readFile as fsReadFile } from "node:fs/promises";
import type { AgentTool } from "./types.ts";
import { resolveInWorkspace } from "./workspace.ts";

export const readFile: AgentTool = {
  definition: {
    name: "read_file",
    description: "Read a file from the workspace and return its full contents.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to the workspace root" },
      },
      required: ["path"],
      additionalProperties: false,
    },
  },

  async run(input) {
    return fsReadFile(resolveInWorkspace(input.path), "utf8");
  },
};
