import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import { z } from "zod";

import { BaseReclineTool } from "../ReclineTool";


const attemptCompletionParamsSchema = z.object({
  result: z.string().min(1, "Result cannot be empty"),
  command: z.string().min(1, "Command cannot be empty if provided").optional()
});

type AttemptCompletionParams = z.infer<typeof attemptCompletionParamsSchema> & ToolParams;


export class AttemptCompletionTool extends BaseReclineTool {
  constructor(toolsOrchestrator: ReclineToolsOrchestrator, context: ToolContext) {
    super("attempt_completion", toolsOrchestrator, context);
  }

  async execute(params: ToolParams): Promise<ToolResponse> {
    try {
      const validatedParams = this.validateParams<AttemptCompletionParams>(params);
      const { result, command } = validatedParams;

      // Present the completion result to the user
      await this.context.say("completion", result);

      // If a command was provided to demonstrate the result, return it
      if (command !== undefined && command.length > 0) {
        return `Completion result presented successfully. You can view the result by running: ${command}`;
      }

      return "Completion result presented successfully";
    }
    catch (error) {
      return this.formatError(`Failed to present completion: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = attemptCompletionParamsSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
