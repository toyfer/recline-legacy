import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import * as path from "node:path";

import { z } from "zod";

import { BaseReclineTool } from "../ReclineTool";
import { getReadablePath } from "../../../utils/path";
import { extractTextFromFile } from "../../../integrations/misc/extract-text";


const readFileParamsSchema = z.object({
  path: z.string().min(1, "Path cannot be empty")
});

type ReadFileParams = z.infer<typeof readFileParamsSchema> & ToolParams;

export class ReadFileTool extends BaseReclineTool {
  constructor(toolsOrchestrator: ReclineToolsOrchestrator, context: ToolContext) {
    super("read_file", toolsOrchestrator, context);
  }

  private formatDenied(path: string): string {
    return `The user denied reading file: ${path}`;
  }

  private formatDeniedWithFeedback(path: string, feedback?: string): string {
    return `The user denied reading file: ${path}\nFeedback: ${feedback ?? "No feedback provided"}`;
  }

  private removePartialClosingTag(text: string | undefined): string {
    if (text === undefined || text === "") {
      return "";
    }
    // This regex matches '</path' with any number of characters from 'path', at the end of the string
    return text.replace(/\/?path>?$/, "");
  }

  async execute(params: ToolParams, partial?: boolean): Promise<ToolResponse> {
    const validatedParams = this.validateParams<ReadFileParams>(params);
    const relPath = validatedParams.path;
    const sharedMessageProps = {
      tool: "readFile",
      path: getReadablePath(this.context.cwd, this.removePartialClosingTag(relPath))
    };

    try {
      // Handle partial path streaming
      if (partial) {
        const partialMessage = JSON.stringify({
          ...sharedMessageProps,
          content: undefined
        });

        if (this.context.shouldAutoApproveTool(this.name)) {
          await this.context.say("tool", partialMessage, undefined, true);
        }
        else {
          await this.context.ask("tool", partialMessage, true);
        }
        return "";
      }

      const absolutePath = path.resolve(this.context.cwd, relPath);
      const completeMessage = JSON.stringify({
        ...sharedMessageProps,
        content: absolutePath
      });

      // Get approval if needed
      if (!this.context.shouldAutoApproveTool(this.name)) {
        const { response, text, images } = await this.context.ask("tool", completeMessage, false);
        if (response !== "yesButtonClicked") {
          if (response === "messageResponse") {
            await this.context.say("user_feedback", text ?? "", images);
            return this.formatDeniedWithFeedback(relPath, text);
          }
          return this.formatDenied(relPath);
        }
      }
      else {
        await this.context.say("tool", completeMessage, undefined, false);
      }

      // Read the file
      const content = await extractTextFromFile(absolutePath);
      return content;
    }
    catch (error) {
      return this.formatError(
        `Error reading file: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = readFileParamsSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
