import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import { z } from "zod";

import { BaseReclineTool } from "../ReclineTool";


const accessMcpResourceParamsSchema = z.object({
  server_name: z.string().min(1, "Server name cannot be empty"),
  uri: z.string().min(1, "URI cannot be empty")
});

type AccessMcpResourceParams = z.infer<typeof accessMcpResourceParamsSchema> & ToolParams;

export class AccessMcpResourceTool extends BaseReclineTool {
  constructor(toolsOrchestrator: ReclineToolsOrchestrator, context: ToolContext) {
    super("access_mcp_resource", toolsOrchestrator, context);
  }

  async execute(params: ToolParams): Promise<ToolResponse> {
    try {
      const validatedParams = this.validateParams<AccessMcpResourceParams>(params);
      const { server_name: serverName, uri } = validatedParams;

      // Since this is a higher-level tool, delegate to Recline to handle MCP communication
      await this.context.say("mcp-resource", `Accessing MCP resource '${uri}' from server '${serverName}'...`, undefined, true);

      // Note: In the actual implementation, this would use McpHub to communicate with the server
      // For now, we'll return a placeholder response
      return `MCP resource access completed: ${serverName}/${uri}`;
    }
    catch (error) {
      return this.formatError(`Failed to access MCP resource: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = accessMcpResourceParamsSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
