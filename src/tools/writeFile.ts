import { mkdir, writeFile as fsWriteFile } from "node:fs/promises";
import path from "node:path";
import type { AgentTool } from "./types.ts";
import { resolveInWorkspace } from "./workspace.ts";

export const writeFile: AgentTool = {
  definition: {
    name: "write_file",
    description:
      "Create or overwrite a file in the workspace with the given full contents. Missing folders are created.",
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
    const full = resolveInWorkspace(input.path);
    await mkdir(path.dirname(full), { recursive: true });
    await fsWriteFile(full, input.content, "utf8");
    return `Wrote ${input.path}`;
  },
};
