import type { Anthropic } from "@anthropic-ai/sdk";

import * as vscode from "vscode";


/**
 * Safely converts a value into a plain object.
 *
 * @param value - Any value to convert into an object
 * @returns A plain object representation of the input value
 */
function asObjectSafe(value: any): object {
  if (value == null) {
    return {};
  }
  try {
    if (typeof value === "string") {
      return JSON.parse(value) as object;
    }
    if (typeof value === "object") {
      return Object.assign({}, value) as object;
    }
    return {};
  }
  catch (error) {
    console.warn("Recline <Language Model API>: Failed to parse object:", error);
    return {};
  }
}

/**
 * Helper to parse user message parts (tool_result, text, image).
 */
function parseUserContentParts(
  parts: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.ToolResultBlockParam)[]
): (vscode.LanguageModelToolResultPart | vscode.LanguageModelTextPart)[] {
  const toolResultParts: vscode.LanguageModelToolResultPart[] = [];
  const textParts: vscode.LanguageModelTextPart[] = [];

  for (const part of parts) {
    if (part.type === "tool_result") {
      const contentArr = typeof part.content === "string"
        ? [new vscode.LanguageModelTextPart(part.content)]
        : (part.content?.map((sub) => {
          if (sub.type === "image") {
            return new vscode.LanguageModelTextPart(`[Image (${sub.source?.type || ""}): ${sub.source?.media_type || ""}]`);
          }
          return new vscode.LanguageModelTextPart(sub.text);
        }) ?? []);
      toolResultParts.push(new vscode.LanguageModelToolResultPart(part.tool_use_id, contentArr));
    }
    else if (part.type === "image") {
      textParts.push(new vscode.LanguageModelTextPart(`[Image (${part.source?.type || ""}): ${part.source?.media_type || ""}]`));
    }
    else {
      textParts.push(new vscode.LanguageModelTextPart(part.text));
    }
  }
  return [...toolResultParts, ...textParts];
}

/**
 * Helper to parse assistant message parts (tool_use, text, image).
 */
function parseAssistantContentParts(
  parts: (Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.ToolUseBlockParam)[]
): (vscode.LanguageModelToolCallPart | vscode.LanguageModelTextPart)[] {
  const toolCallParts: vscode.LanguageModelToolCallPart[] = [];
  const textParts: vscode.LanguageModelTextPart[] = [];

  for (const part of parts) {
    if (part.type === "tool_use") {
      toolCallParts.push(
        new vscode.LanguageModelToolCallPart(part.id, part.name, asObjectSafe(part.input))
      );
    }
    else if (part.type === "image") {
      textParts.push(new vscode.LanguageModelTextPart("[Image generation not supported by VSCode LM API]"));
    }
    else {
      textParts.push(new vscode.LanguageModelTextPart(part.text));
    }
  }
  return [...toolCallParts, ...textParts];
}

/**
 * Converts an array of Anthropic message parameters into VSCode Language Model chat messages.
 *
 * @param anthropicMessages - An array of Anthropic message parameters to be converted
 * @returns An array of converted {@link LanguageModelChatMessage} objects
 */
export function convertToVsCodeLmMessages(anthropicMessages: Anthropic.Messages.MessageParam[]): vscode.LanguageModelChatMessage[] {
  const vsCodeLmMessages: vscode.LanguageModelChatMessage[] = [];

  for (const anthropicMessage of anthropicMessages) {
    // Handle simple string messages
    if (typeof anthropicMessage.content === "string") {
      vsCodeLmMessages.push(
        anthropicMessage.role === "assistant"
          ? vscode.LanguageModelChatMessage.Assistant(anthropicMessage.content)
          : vscode.LanguageModelChatMessage.User(anthropicMessage.content)
      );
      continue;
    }

    // Handle complex message structures
    switch (anthropicMessage.role) {
      case "user": {
        const userParts = anthropicMessage.content.filter(
          part => part.type !== "tool_use"
        );
        const contentParts = parseUserContentParts(userParts);
        vsCodeLmMessages.push(vscode.LanguageModelChatMessage.User(contentParts));
        break;
      }
      case "assistant": {
        const assistantParts = anthropicMessage.content.filter(
          part => part.type !== "tool_result"
        );
        const contentParts = parseAssistantContentParts(assistantParts);
        vsCodeLmMessages.push(vscode.LanguageModelChatMessage.Assistant(contentParts));
        break;
      }
    }
  }

  return vsCodeLmMessages;
}

/**
 * Converts a VSCode Language Model chat message role to its corresponding Anthropic role string.
 * @param vsCodeLmMessageRole - The VSCode Language Model chat message role to convert
 * @returns The Anthropic role string ("assistant" or "user") if the role can be mapped, null otherwise
 */
export function convertToAnthropicRole(vsCodeLmMessageRole: vscode.LanguageModelChatMessageRole): string | null {
  switch (vsCodeLmMessageRole) {
    case vscode.LanguageModelChatMessageRole.Assistant:
      return "assistant";
    case vscode.LanguageModelChatMessageRole.User:
      return "user";
    default:
      return null;
  }
}

/**
 * Converts a VS Code Language Model chat message to an Anthropic message format.
 *
 * @param vsCodeLmMessage - The VS Code Language Model chat message to convert
 * @returns An Anthropic message object conforming to the Anthropic.Messages.Message interface
 * @throws {Error} When the message role is not "assistant"
 */
export async function convertToAnthropicMessage(vsCodeLmMessage: vscode.LanguageModelChatMessage): Promise<Anthropic.Messages.Message> {
  const anthropicRole: string | null = convertToAnthropicRole(vsCodeLmMessage.role);
  if (anthropicRole !== "assistant") {
    throw new Error("Recline <Language Model API>: Only assistant messages are supported.");
  }

  return {
    id: crypto.randomUUID(),
    type: "message",
    model: "vscode-lm",
    role: anthropicRole,
    content: vsCodeLmMessage.content
      .map((part): Anthropic.ContentBlock | null => {
        if (part instanceof vscode.LanguageModelTextPart) {
          return {
            type: "text",
            text: part.value
          };
        }
        if (part instanceof vscode.LanguageModelToolCallPart) {
          return {
            type: "tool_use",
            id: part.callId || crypto.randomUUID(),
            name: part.name,
            input: asObjectSafe(part.input)
          };
        }
        return null;
      })
      .filter((part): part is Anthropic.ContentBlock => part !== null),
    stop_reason: ((): null => null)(),
    stop_sequence: null,
    usage: {
      input_tokens: (vsCodeLmMessage as any).__tokenCount?.inputTokens || 0,
      output_tokens: (vsCodeLmMessage as any).__tokenCount?.outputTokens || 0
    }
  };
}
