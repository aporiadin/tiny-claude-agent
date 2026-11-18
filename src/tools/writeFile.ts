import { writeFile as fsWriteFile } from "node:fs/promises";
import type { AgentTool } from "./types.ts";
import { resolveInWorkspace } from "./workspace.ts";

export const writeFile: AgentTool = {
  definition: {
    name: "write_file",
    description: "Overwrite a file in the workspace with the given full contents.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path relative to the workspace root" },
        content: { type: "string", description: "The complete new file contents" },
      },
      required: ["path", "content"],
      additionalProperties: false,
    },
  },

  async run(input) {
    if (typeof input.content !== "string") {
      throw new Error("`content` must be a string");
    }
    await fsWriteFile(resolveInWorkspace(input.path), input.content, "utf8");
    return `Wrote ${input.path}`;
  },
};
