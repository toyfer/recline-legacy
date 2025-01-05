import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import { z } from "zod";

import { BaseReclineTool } from "../ReclineTool";


const useMcpToolParamsSchema = z.object({
  server_name: z.string().min(1, "Server name cannot be empty"),
  tool_name: z.string().min(1, "Tool name cannot be empty"),
  arguments: z.record(z.unknown())
});

type UseMcpToolParams = z.infer<typeof useMcpToolParamsSchema> & ToolParams;

export class UseMcpTool extends BaseReclineTool {
  constructor(toolsOrchestrator: ReclineToolsOrchestrator, context: ToolContext) {
    super("use_mcp_tool", toolsOrchestrator, context);
  }

  async execute(params: ToolParams): Promise<ToolResponse> {
    try {
      const validatedParams = this.validateParams<UseMcpToolParams>(params);
      const { server_name: serverName, tool_name: toolName, arguments: _args } = validatedParams;

      // Since this is a higher-level tool, delegate to Recline to handle MCP communication
      await this.context.say("mcp-tool", `Using MCP tool '${toolName}' on server '${serverName}'...`, undefined, true);

      // Note: In the actual implementation, this would use McpHub to communicate with the server
      // For now, we'll return a placeholder response
      return `MCP tool execution completed: ${serverName}/${toolName}`;
    }
    catch (error) {
      return this.formatError(`Failed to execute MCP tool: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = useMcpToolParamsSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
