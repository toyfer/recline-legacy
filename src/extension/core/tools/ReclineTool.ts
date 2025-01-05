import type { ReclineToolsOrchestrator } from "../ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "./types";


/**
 * Base interface for all Recline tools.
 */
export interface ReclineTool {
  /**
   * The unique name identifying this tool.
   */
  readonly name: string;

  /**
   * Execute the tool with the given parameters.
   * @param params - Tool-specific parameters as key-value pairs
   * @param partial - Whether this is a partial execution
   * @returns A Promise that resolves when the tool execution is complete
   */
  execute: (params: ToolParams, partial?: boolean) => Promise<ToolResponse>;

  /**
   * Verify that required parameters are present and valid using Zod.
   * @param params - Parameters to verify
   * @returns The valid parameters object that matches the tool's schema
   * @throws ZodError if required parameters are missing or invalid
   */
  validateParams: <T extends ToolParams>(params: ToolParams) => T;

  /**
   * Clean up any resources when tool execution is aborted.
   */
  abort?: () => Promise<void>;
}

/**
 * Base abstract class providing common functionality for Recline tools.
 */
export abstract class BaseReclineTool implements ReclineTool {

  abort?: (() => Promise<void>) | undefined;

  constructor(
    public readonly name: string,
    protected readonly toolsOrchestrator: ReclineToolsOrchestrator,
    protected readonly context: ToolContext
  ) { }

  protected formatError(message: string): ToolResponse {
    return `Error: ${message}`;
  }

  abstract execute(params: ToolParams, partial?: boolean): Promise<ToolResponse>;

  abstract validateParams<T extends ToolParams>(params: ToolParams): T;
}
