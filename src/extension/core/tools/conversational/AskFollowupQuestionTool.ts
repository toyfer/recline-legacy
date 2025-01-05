import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import { z } from "zod";

import { BaseReclineTool } from "../ReclineTool";


const askFollowupQuestionParamsSchema = z.object({
  question: z.string().min(1, "Question cannot be empty")
});

type AskFollowupQuestionParams = z.infer<typeof askFollowupQuestionParamsSchema> & ToolParams;


export class AskFollowupQuestionTool extends BaseReclineTool {
  constructor(toolsOrchestrator: ReclineToolsOrchestrator, context: ToolContext) {
    super("ask_followup_question", toolsOrchestrator, context);
  }

  async execute(params: ToolParams): Promise<ToolResponse> {
    try {
      const validatedParams = this.validateParams<AskFollowupQuestionParams>(params);
      const { question } = validatedParams;

      // Use the context.ask method to present the question to the user
      const result = await this.context.ask("followup-question", question);

      return result.text ?? result.response;
    }
    catch (error) {
      return this.formatError(`Failed to ask followup question: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = askFollowupQuestionParamsSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
