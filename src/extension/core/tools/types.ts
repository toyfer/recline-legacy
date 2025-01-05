import type { Anthropic } from "@anthropic-ai/sdk";

import type { ToolParamName } from "../assistant-message";


export type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>;

export interface ToolParams extends Record<ToolParamName, unknown> {
  [key: string]: unknown;
}

export interface ToolContext {
  cwd: string;
  shouldAutoApproveTool: (toolName: string) => boolean;
  addToReclineMessages: (message: any) => Promise<void>;
  say: (type: string, text?: string, images?: string[], partial?: boolean) => Promise<undefined>;
  ask: (type: string, text?: string, partial?: boolean) => Promise<{ response: string; text?: string; images?: string[] }>;
}
