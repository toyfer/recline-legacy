import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import * as path from "node:path";

import { z } from "zod";

import { BaseReclineTool } from "../ReclineTool";
import { getReadablePath } from "../../../utils/path";
import { parseSourceCodeForDefinitionsTopLevel } from "../../../services/tree-sitter";


const listCodeDefinitionsParamsSchema = z.object({
  path: z.string().min(1, "Path cannot be empty")
});

interface ListCodeDefinitionsParams extends ToolParams {
  path: string;
}

export class ListCodeDefinitionsTool extends BaseReclineTool {
  constructor(toolsOrchestrator: ReclineToolsOrchestrator, context: ToolContext) {
    super("list_code_definition_names", toolsOrchestrator, context);
  }

  private formatDenied(path: string): string {
    return `The user denied listing code definitions in directory: ${path}`;
  }

  private formatDeniedWithFeedback(path: string, feedback?: string): string {
    return `The user denied listing code definitions in directory: ${path}\nFeedback: ${feedback ?? "No feedback provided"}`;
  }

  private removePartialClosingTag(text: string | undefined): string {
    if (text === undefined || text === "") {
      return "";
    }
    // This regex matches '</path' with any number of characters from 'path', at the end of the string
    return text.replace(/\/?path>?$/, "");
  }

  async execute(params: ToolParams, partial?: boolean): Promise<ToolResponse> {
    // Cast to our specific params type after validation
    const typedParams = params as ListCodeDefinitionsParams;
    const relDirPath = typedParams.path;
    const sharedMessageProps = {
      tool: "listCodeDefinitionNames",
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
      const result = await parseSourceCodeForDefinitionsTopLevel(absolutePath);
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
        `Error listing code definitions: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = listCodeDefinitionsParamsSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
