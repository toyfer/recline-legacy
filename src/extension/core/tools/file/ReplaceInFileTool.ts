import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import { resolve } from "node:path";
import { promises as fs } from "node:fs";

import { z } from "zod";

import { BaseReclineTool } from "../ReclineTool";
import { getReadablePath } from "../../../utils/path";


interface SearchReplaceBlock {
  search: string;
  replace: string;
}

const replaceInFileParamsSchema = z.object({
  path: z.string().min(1, "Path cannot be empty"),
  diff: z.string().min(1, "Diff cannot be empty")
});

type ReplaceInFileParams = z.infer<typeof replaceInFileParamsSchema> & ToolParams;


export class ReplaceInFileTool extends BaseReclineTool {
  constructor(toolsOrchestrator: ReclineToolsOrchestrator, context: ToolContext) {
    super("replace_in_file", toolsOrchestrator, context);
  }

  private formatDenied(filePath: string): string {
    return `The user denied replacing content in file: ${filePath}`;
  }

  private formatDeniedWithFeedback(filePath: string, feedback?: string): string {
    return `The user denied replacing content in file: ${filePath}\nFeedback: ${feedback ?? "No feedback provided"}`;
  }

  /**
   * Parse a diff string containing one or more search/replace blocks into structured data
   */
  private parseDiff(diff: string): SearchReplaceBlock[] {
    const blocks: SearchReplaceBlock[] = [];
    const lines = diff.split(/\r?\n/);

    let currentBlock: Partial<SearchReplaceBlock> = {};
    let collecting: "search" | "replace" | null = null;
    let blockContent: string[] = [];

    for (const line of lines) {
      if (line === "<<<<<<< SEARCH") {
        // Start collecting search content
        collecting = "search";
        blockContent = [];
      }
      else if (line === "=======") {
        // Switch from search to replace
        if (collecting === "search") {
          currentBlock.search = blockContent.join("\n");
          collecting = "replace";
          blockContent = [];
        }
      }
      else if (line === ">>>>>>> REPLACE") {
        // Finish the current block
        if (collecting === "replace") {
          currentBlock.replace = blockContent.join("\n");
          if (currentBlock.search !== undefined) {
            blocks.push(currentBlock as SearchReplaceBlock);
          }
          currentBlock = {};
          collecting = null;
        }
      }
      else if (collecting) {
        // Collect content lines
        blockContent.push(line);
      }
    }

    return blocks;
  }

  private removePartialClosingTags(text: string | undefined, tagName: string): string {
    if (text === undefined || text === "") {
      return "";
    }
    return text.replace(new RegExp(`\\/?${tagName}>?$`), "");
  }

  async execute(params: ToolParams, partial?: boolean): Promise<ToolResponse> {
    try {
      const validatedParams = this.validateParams<ReplaceInFileParams>(params);
      const { path, diff } = validatedParams;

      // Handle partial streaming
      const sharedMessageProps = {
        tool: "replaceInFile",
        path: getReadablePath(this.context.cwd, this.removePartialClosingTags(path, "path")),
        diff: this.removePartialClosingTags(diff, "diff")
      };

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

      // Ensure the path is relative to cwd
      const fullPath = resolve(this.context.cwd, path);
      const completeMessage = JSON.stringify({
        ...sharedMessageProps,
        content: fullPath
      });

      // Get approval if needed
      if (!this.context.shouldAutoApproveTool(this.name)) {
        const { response, text, images } = await this.context.ask("tool", completeMessage, false);
        if (response !== "yesButtonClicked") {
          if (response === "messageResponse") {
            await this.context.say("user_feedback", text ?? "", images);
            return this.formatDeniedWithFeedback(path, text);
          }
          return this.formatDenied(path);
        }
      }
      else {
        await this.context.say("tool", completeMessage, undefined, false);
      }

      // Read the current file content
      const content = await fs.readFile(fullPath, "utf8");

      // Parse and apply each search/replace block
      const blocks = this.parseDiff(diff);
      if (blocks.length === 0) {
        throw new Error("No valid search/replace blocks found in diff");
      }

      // Apply replacements in sequence
      let modifiedContent = content;
      for (const block of blocks) {
        if (!modifiedContent.includes(block.search)) {
          throw new Error("Search content not found in file. Make sure it matches exactly, including whitespace and line endings.");
        }
        modifiedContent = modifiedContent.replace(block.search, block.replace);
      }

      // Write the modified content back to the file after final approval
      const result = `Successfully applied ${blocks.length} replacement${blocks.length === 1 ? "" : "s"} to ${path}`;
      await this.context.say("tool_result", result);
      await fs.writeFile(fullPath, modifiedContent, "utf8");
      return result;
    }
    catch (error) {
      return this.formatError(`Failed to replace in file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = replaceInFileParamsSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
