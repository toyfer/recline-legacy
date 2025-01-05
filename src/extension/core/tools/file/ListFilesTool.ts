import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import * as path from "node:path";

import { z } from "zod";

import { BaseReclineTool } from "../ReclineTool";
import { listFiles } from "../../../services/fd";
import { getReadablePath } from "../../../utils/path";


const listFilesParamsSchema = z.object({
  path: z.string().min(1, "Path cannot be empty"),
  recursive: z.string()
    .optional()
    .refine(
      val => val === undefined || val.toLowerCase() === "true" || val.toLowerCase() === "false",
      "recursive parameter must be 'true' or 'false' if provided"
    )
});

type ListFilesParams = z.infer<typeof listFilesParamsSchema> & ToolParams;

export class ListFilesTool extends BaseReclineTool {
  constructor(toolsOrchestrator: ReclineToolsOrchestrator, context: ToolContext) {
    super("list_files", toolsOrchestrator, context);
  }

  private formatDenied(path: string): string {
    return `The user denied listing files in directory: ${path}`;
  }

  private formatDeniedWithFeedback(path: string, feedback?: string): string {
    return `The user denied listing files in directory: ${path}\nFeedback: ${feedback ?? "No feedback provided"}`;
  }

  private formatFilesList(basePath: string, files: string[], didHitLimit: boolean): string {
    let result = files
      .map((file) => {
        const relativePath = path.relative(basePath, file).toPosix();
        return relativePath;
      })
      .join("\n");

    if (didHitLimit) {
      result += "\n\n(File list truncated. Use list_files on specific subdirectories if you need to explore further.)";
    }

    return result;
  }

  private removePartialClosingTag(text: string | undefined): string {
    if (text === undefined || text === "") {
      return "";
    }
    // This regex matches '</path' with any number of characters from 'path', at the end of the string
    return text.replace(/\/?path>?$/, "");
  }

  async execute(params: ToolParams, partial?: boolean): Promise<ToolResponse> {
    const typedParams = this.validateParams<ListFilesParams>(params);
    const relDirPath = typedParams.path;
    const recursive = typedParams.recursive?.toLowerCase() === "true";
    const sharedMessageProps = {
      tool: !recursive ? "listFilesTopLevel" : "listFilesRecursive",
      path: getReadablePath(this.context.cwd, this.removePartialClosingTag(relDirPath))
    };

    try {
      // Handle partial path streaming
      if (partial) {
        const partialMessage = JSON.stringify({
          ...sharedMessageProps,
          content: ""
        });

        if (this.context.shouldAutoApproveTool(this.name)) {
          await this.context.say("tool", partialMessage, undefined, true);
        }
        else {
          await this.context.ask("tool", partialMessage, true);
        }
        return "";
      }

      const absolutePath = path.resolve(this.context.cwd, relDirPath);
      const [files, didHitLimit] = await listFiles(absolutePath, {
        recursive,
        limit: 200
      });

      const result = this.formatFilesList(absolutePath, files, didHitLimit);
      const completeMessage = JSON.stringify({
        ...sharedMessageProps,
        content: result
      });

      // Get approval if needed
      if (!this.context.shouldAutoApproveTool(this.name)) {
        const { response, text, images } = await this.context.ask("tool", completeMessage, false);
        if (response !== "yesButtonClicked") {
          if (response === "messageResponse") {
            await this.context.say("user_feedback", text ?? "", images);
            return this.formatDeniedWithFeedback(relDirPath, text);
          }
          return this.formatDenied(relDirPath);
        }
      }
      else {
        await this.context.say("tool", completeMessage, undefined, false);
      }

      return result;
    }
    catch (error) {
      return this.formatError(
        `Error listing files: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = listFilesParamsSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
