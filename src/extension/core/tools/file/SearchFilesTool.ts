import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import * as path from "node:path";

import { z } from "zod";

import { BaseReclineTool } from "../ReclineTool";
import { getReadablePath } from "../../../utils/path";
import { regexSearchFiles } from "../../../services/ripgrep";


const searchFilesParamsSchema = z.object({
  path: z.string().min(1, "Path cannot be empty"),
  regex: z.string().min(1, "Regex pattern cannot be empty"),
  file_pattern: z.string().optional()
});

type SearchFilesParams = z.infer<typeof searchFilesParamsSchema> & ToolParams;

export class SearchFilesTool extends BaseReclineTool {
  constructor(toolsOrchestrator: ReclineToolsOrchestrator, context: ToolContext) {
    super("search_files", toolsOrchestrator, context);
  }

  private formatDenied(path: string, regex: string): string {
    return `The user denied searching files in directory: ${path} for pattern: ${regex}`;
  }

  private formatDeniedWithFeedback(path: string, regex: string, feedback?: string): string {
    return `The user denied searching files in directory: ${path} for pattern: ${regex}\nFeedback: ${feedback ?? "No feedback provided"}`;
  }

  private removePartialClosingTags(text: string | undefined, tagName: string): string {
    if (text === undefined || text === "") {
      return "";
    }
    // This regex matches '</tagName' with any number of characters from tagName, at the end of the string
    return text.replace(new RegExp(`\\/?${tagName}>?$`), "");
  }

  async execute(params: ToolParams, partial?: boolean): Promise<ToolResponse> {
    const typedParams = this.validateParams<SearchFilesParams>(params);
    const relDirPath = typedParams.path;
    const regex = typedParams.regex;
    const filePattern = typedParams.file_pattern;

    const sharedMessageProps = {
      tool: "searchFiles",
      path: getReadablePath(this.context.cwd, this.removePartialClosingTags(relDirPath, "path")),
      regex: this.removePartialClosingTags(regex, "regex"),
      filePattern: (
        filePattern != null
        && filePattern.length > 0
          ? this.removePartialClosingTags(filePattern, "file_pattern")
          : undefined
      )
    };

    try {
      // Handle partial streaming
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
      const results = await regexSearchFiles(this.context.cwd, absolutePath, regex, filePattern);
      const completeMessage = JSON.stringify({
        ...sharedMessageProps,
        content: results
      });

      // Get approval if needed
      if (!this.context.shouldAutoApproveTool(this.name)) {
        const { response, text, images } = await this.context.ask("tool", completeMessage, false);
        if (response !== "yesButtonClicked") {
          if (response === "messageResponse") {
            await this.context.say("user_feedback", text ?? "", images);
            return this.formatDeniedWithFeedback(relDirPath, regex, text);
          }
          return this.formatDenied(relDirPath, regex);
        }
      }
      else {
        await this.context.say("tool", completeMessage, undefined, false);
      }

      return results;
    }
    catch (error) {
      return this.formatError(
        `Error searching files: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = searchFilesParamsSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
