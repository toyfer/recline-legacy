import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import { dirname } from "node:path";
import { promises as fs } from "node:fs";

import { z } from "zod";

import { BaseReclineTool } from "../ReclineTool";


const writeToFileParamsSchema = z.object({
  path: z.string().min(1, "Path cannot be empty"),
  content: z.string().min(1, "Content cannot be empty")
});

type WriteToFileParams = z.infer<typeof writeToFileParamsSchema> & ToolParams;

export class WriteToFileTool extends BaseReclineTool {
  constructor(toolsOrchestrator: ReclineToolsOrchestrator, context: ToolContext) {
    super("write_to_file", toolsOrchestrator, context);
  }

  async execute(params: ToolParams): Promise<ToolResponse> {
    try {
      const validatedParams = this.validateParams<WriteToFileParams>(params);
      const { path, content } = validatedParams;

      // Ensure the path is relative to cwd
      const fullPath = `${this.context.cwd}/${path}`;

      // Create parent directories if they don't exist
      await fs.mkdir(dirname(fullPath), { recursive: true });

      // Write the file
      await fs.writeFile(fullPath, content, "utf8");

      return `Successfully wrote to ${path}`;
    }
    catch (error) {
      return this.formatError(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = writeToFileParamsSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
