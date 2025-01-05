import type { ReclineTool } from "./tools/ReclineTool";
import type { ToolContext, ToolParams, ToolResponse } from "./tools/types";

import { TerminalManager } from "@extension/integrations/terminal/TerminalManager";

import { ReadFileTool } from "./tools/file/ReadFileTool";
import { ListFilesTool } from "./tools/file/ListFilesTool";
import { SearchFilesTool } from "./tools/file/SearchFilesTool";
import { WriteToFileTool } from "./tools/file/WriteToFileTool";
import { ReplaceInFileTool } from "./tools/file/ReplaceInFileTool";
import { BrowserActionTool } from "./tools/browser/BrowserActionTool";
import { AttemptCompletionTool } from "./tools/conversational/AttemptCompletionTool";
import { ListCodeDefinitionsTool } from "./tools/architecture/ListCodeDefinitionsTool";
import { AskFollowupQuestionTool } from "./tools/conversational/AskFollowupQuestionTool";


/**
 * Orchestrator class that manages all Recline tools.
 * Handles tool registration, lookup, and execution.
 */
export class ReclineToolsOrchestrator {
  private tools: Map<string, ReclineTool> = new Map();
  public readonly terminalManager: TerminalManager;

  constructor(private readonly context: ToolContext) {

    // Initialize integrations
    this.terminalManager = new TerminalManager();

    // Initialize tools
    this.register(new ListCodeDefinitionsTool(context));
    this.register(new BrowserActionTool(context));
    this.register(new AskFollowupQuestionTool(context));
    this.register(new AttemptCompletionTool(context));
    this.register(new ListFilesTool(context));
    this.register(new ReadFileTool(context));
    this.register(new ReplaceInFileTool(context));
    this.register(new SearchFilesTool(context));
    this.register(new WriteToFileTool(context));
  }

  /**
   * Abort all tools that support abortion
   */
  async abortAll(): Promise<void> {
    const abortPromises = Array.from(this.tools.values())
      .filter(tool => tool.abort != null)
      .map(async tool => tool.abort!());

    await Promise.all(abortPromises);
  }

  /**
   * Abort a specific tool's execution if possible
   */
  async abortTool(toolName: string): Promise<void> {
    const tool = this.tools.get(toolName);
    if (tool?.abort) {
      await tool.abort();
    }
  }

  /**
   * Execute a tool by name with the given parameters
   */
  async execute(toolName: string, params: ToolParams, partial?: boolean): Promise<ToolResponse> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    try {
      // Validate parameters before execution
      tool.validateParams(params);

      // Execute the tool
      return await tool.execute(params, partial);
    }
    catch (error) {
      // Ensure errors are properly formatted as tool responses
      return `Error executing tool '${toolName}': ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Get a list of all registered tool names
   */
  getRegisteredToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool is registered
   */
  hasToolWithName(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Register a tool with the orchestrator
   */
  register(tool: ReclineTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }
}
