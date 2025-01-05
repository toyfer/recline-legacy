import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import { z } from "zod";
import * as vscode from "vscode";

import { BaseReclineTool } from "../ReclineTool";


const executeCommandParamsSchema = z.object({
  command: z.string().min(1, "Command cannot be empty"),
  requires_approval: z.string().refine(
    val => val.toLowerCase() === "true" || val.toLowerCase() === "false",
    "requires_approval must be 'true' or 'false'"
  )
});

type ExecuteCommandParams = z.infer<typeof executeCommandParamsSchema> & ToolParams;

export class ExecuteCommandTool extends BaseReclineTool {


  abort = async (): Promise<void> => {
    // TODO: Only dispose specific terminal, so multiple agents can work together (in theory at least... This is still a long way off).
    this.toolsOrchestrator.terminalManager.disposeAll();
  };

  constructor(
    toolsOrchestrator: ReclineToolsOrchestrator,
    context: ToolContext
  ) {
    super("execute_command", toolsOrchestrator, context);
  }

  private formatDenied(command: string): string {
    return `The user denied executing the command: ${command}`;
  }

  private formatDeniedWithFeedback(command: string, feedback?: string): string {
    return `The user denied executing the command: ${command}\nFeedback: ${feedback ?? "No feedback provided"}`;
  }

  async execute(params: ExecuteCommandParams, partial?: boolean): Promise<ToolResponse> {
    const command = params.command;
    const requiresApproval = params.requires_approval.toLowerCase() === "true";

    // Handle partial command streaming
    if (partial) {
      if (this.context.shouldAutoApproveTool(this.name) && !requiresApproval) {
        await this.context.say("command", command, undefined, true);
      }
      else {
        await this.context.ask("command", command, true);
      }
      return "";
    }

    // Get approval if needed
    if (!this.context.shouldAutoApproveTool(this.name) || requiresApproval) {
      const { response, text, images } = await this.context.ask(
        "command",
        `${command}${this.context.shouldAutoApproveTool(this.name) && requiresApproval ? " (requires approval)" : ""}`,
        false
      );

      if (response !== "yesButtonClicked") {
        if (response === "messageResponse") {
          await this.context.say("user_feedback", text ?? "", images);
          return this.formatDeniedWithFeedback(command, text);
        }
        return this.formatDenied(command);
      }
    }
    else {
      await this.context.say("command", command, undefined, false);
    }

    // Execute command
    try {
      const terminalInfo = await this.toolsOrchestrator.terminalManager.getOrCreateTerminal(this.context.cwd);
      terminalInfo.terminal.show();

      const outputGenerator = await this.toolsOrchestrator.terminalManager.runCommand(terminalInfo, command);

      let result = "";
      let userFeedback: { text?: string; images?: string[] } | undefined;
      let didContinue = false;

      try {
        for await (const line of outputGenerator) {
          result += `${line}\n`;

          if (!didContinue) {
            try {
              const { response, text, images } = await this.context.ask("command_output", line);
              if (response !== "yesButtonClicked") {
                userFeedback = { text, images };
              }
              didContinue = true;
              this.toolsOrchestrator.terminalManager.continueterminalProcess(terminalInfo.id);
            }
            catch {
              // Promise was ignored, continue silently
              this.toolsOrchestrator.terminalManager.continueterminalProcess(terminalInfo.id);
            }
          }
          else {
            await this.context.say("command_output", line);
          }
        }
      }
      catch (error) {
        // Type guard to ensure error is Error instance before accessing message
        if (error instanceof Error) {
          if (error.message === "No shell integration available") {
            await this.context.say("shell_integration_warning");
          }
          else {
            throw error;
          }
        }
        else {
          throw new TypeError("Unknown error occurred");
        }
      }

      result = result.trim();

      if (userFeedback) {
        await this.context.say("user_feedback", userFeedback.text ?? "", userFeedback.images);
        return `Command is still running in the user's terminal.${
          result.length > 0 ? `\nHere's the output so far:\n${result}` : ""
        }\n\nThe user provided the following feedback:\n<feedback>\n${userFeedback.text}\n</feedback>`;
      }

      return `Command executed.${result.length > 0 ? `\nOutput:\n${result}` : ""}`;
    }
    catch (error) {
      return this.formatError(
        `Error executing command: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = executeCommandParamsSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
