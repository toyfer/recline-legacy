import type {
  ApiHandlerOptions,
  MessageParamWithTokenCount,
  ModelInfo
} from "@shared/api";

import type { ModelProvider } from "@extension/api";
import type { ApiStream } from "@extension/api/transform/stream";

import * as vscode from "vscode";

import { stringifyVsCodeLmModelSelector } from "@shared/vsCodeSelectorUtils";

import { calculateApiCost } from "@extension/utils/cost";
import { convertToVsCodeLmMessages } from "@extension/api/transform/vscode-lm-format";


const ERROR_PREFIX = "Recline <Language Model API>";

export class VSCodeLmModelProvider implements ModelProvider {

  private client: vscode.LanguageModelChat | null;
  private configurationWatcher: vscode.Disposable | null;
  private currentRequestCancellation: vscode.CancellationTokenSource | null;
  private options: ApiHandlerOptions;
  private systemPromptTokenCache: Map<string, number>;

  constructor(options: ApiHandlerOptions) {

    this.options = options;
    this.client = null;
    this.configurationWatcher = null;
    this.currentRequestCancellation = null;
    this.systemPromptTokenCache = new Map();

    try {

      // Set up configuration change listener with proper error boundary
      this.configurationWatcher = vscode.workspace.onDidChangeConfiguration(
        (event: vscode.ConfigurationChangeEvent): void => {
          try {
            if (event.affectsConfiguration("lm")) {
              this.releaseCurrentCancellation();
              this.client = null;
            }
          }
          catch (listenerError) {
            console.warn(
              "Recline <Language Model API>: Error handling configuration change:",
              listenerError instanceof Error ? listenerError.message : "Unknown error"
            );
          }
        }
      );
    }
    catch (error) {

      // Clean up resources if initialization fails
      this.dispose();

      throw new Error(
        `Recline <Language Model API>: Failed to initialize handler: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async calculateInputTokens(systemPrompt: string, messages: MessageParamWithTokenCount[]): Promise<number> {

    let totalTokens = 0;

    // Hash the system prompt using Web Crypto API (available in both Node.js and browser)
    const encoder = new TextEncoder();
    const data = encoder.encode(systemPrompt);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    // Check cache using hash
    const cached = this.systemPromptTokenCache.get(hash);
    if (cached !== undefined) {

      totalTokens = cached;
    }
    else {

      totalTokens = await this.countTokens(systemPrompt);
      this.systemPromptTokenCache.set(hash, totalTokens);
    }

    for (const msg of messages) {

      if (msg.tokenCount !== undefined) {

        totalTokens += msg.tokenCount;
        continue;
      }

      const messageContent: string = Array.isArray(msg.content)
        ? msg.content
          .filter(block => block.type === "text")
          .map(block => block.text)
          .join("\n")
        : msg.content;

      const tokenCount: number = await this.countTokens(messageContent);
      msg.tokenCount = tokenCount;
      totalTokens += tokenCount;
    }

    return totalTokens;
  }

  private async countTokens(text: string | vscode.LanguageModelChatMessage): Promise<number> {

    // Early exit if client or cancellation token is missing
    if (!this.client || !this.currentRequestCancellation) {

      return 0;
    }

    try {

      // Count tokens
      const tokenCount: number = await this.client.countTokens(
        text,
        this.currentRequestCancellation.token
      );

      return tokenCount;
    }
    catch (error) {

      // Re-throw cancellation errors
      if (error instanceof vscode.CancellationError) {
        throw error;
      }

      // Soft fail on token counting errors that are not manually cancelled
      console.warn("Token counting failed:", error);
      return 0;
    }
  }

  private async getClient(): Promise<vscode.LanguageModelChat> {

    if (!this.options.vsCodeLmModelSelector) {

      throw new Error(`${ERROR_PREFIX} The 'vsCodeLmModelSelector' option is required for the 'vscode-lm' provider.`);
    }

    if (!this.client) {

      try {

        this.client = await this.selectBestModel(this.options.vsCodeLmModelSelector);
      }
      catch (error) {

        throw new Error(`${ERROR_PREFIX} Failed to create client: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    return this.client;
  }

  private async *processStreamChunks(response: vscode.LanguageModelChatResponse, contentBuilder: string[]): ApiStream {

    try {

      const stream = response.stream;

      for await (const chunk of stream) {

        if (this.currentRequestCancellation?.token.isCancellationRequested) {

          break;
        }

        if (chunk instanceof vscode.LanguageModelTextPart && chunk.value) {

          contentBuilder.push(chunk.value);

          yield {
            type: "text" as const,
            text: chunk.value
          };
        }
      }
    }
    catch (error) {

      if (error instanceof vscode.CancellationError) {

        throw new TypeError(`${ERROR_PREFIX}: Request cancelled by user`);
      }

      throw error;
    }
    finally {

      this.releaseCurrentCancellation();
    }
  }

  private releaseCurrentCancellation(): void {

    if (this.currentRequestCancellation) {

      this.currentRequestCancellation.cancel();
      this.currentRequestCancellation.dispose();
      this.currentRequestCancellation = null;
    }
  }

  private async selectBestModel(selector: vscode.LanguageModelChatSelector): Promise<vscode.LanguageModelChat> {

    const models: vscode.LanguageModelChat[] = await vscode.lm.selectChatModels(selector);

    if (models.length === 0) {
      throw new Error(`${ERROR_PREFIX} No models found matching the specified selector.`);
    }

    return models.reduce(

      (best, current) =>
        current.maxInputTokens > best.maxInputTokens ? current : best
      ,
      models[0]
    );
  }

  async *createMessage(systemPrompt: string, messages: MessageParamWithTokenCount[]): ApiStream {

    try {

      this.releaseCurrentCancellation();

      const client: vscode.LanguageModelChat = await this.getClient();
      const model = await this.getModel();
      this.currentRequestCancellation = new vscode.CancellationTokenSource();

      const totalInputTokens: number = await this.calculateInputTokens(systemPrompt, messages);
      const vsCodeLmMessages: vscode.LanguageModelChatMessage[] = [
        vscode.LanguageModelChatMessage.User(systemPrompt), // VSCode Language Model API does not support system prompts yet.
        ...convertToVsCodeLmMessages(messages)
      ];

      const contentBuilder: string[] = [];
      const response: vscode.LanguageModelChatResponse = await client.sendRequest(
        vsCodeLmMessages,
        {
          justification: `${client.name} from ${client.vendor} will be used by Recline.\n\nClick 'Allow' to proceed.`
        },
        this.currentRequestCancellation.token
      );

      // Process stream chunks with proper error handling
      const streamGenerator: ApiStream = this.processStreamChunks(response, contentBuilder);
      for await (const chunk of streamGenerator) {
        yield chunk;
      }

      // Only calculate and yield usage if stream completed successfully
      if (!this.currentRequestCancellation?.token.isCancellationRequested) {
        const outputTokens: number = await this.countTokens(contentBuilder.join(""));

        yield {
          type: "usage",
          inputTokens: totalInputTokens,
          outputTokens,
          totalCost: calculateApiCost(
            model.info,
            totalInputTokens,
            outputTokens
          )
        };
      }
    }
    catch (error) {

      this.releaseCurrentCancellation();

      throw new Error(
        `${ERROR_PREFIX}: Response stream error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async dispose(): Promise<void> {

    // Clean up resources in a deterministic order
    this.releaseCurrentCancellation();

    if (this.configurationWatcher) {

      this.configurationWatcher.dispose();
      this.configurationWatcher = null;
    }

    this.client = null; // Release client reference
    this.systemPromptTokenCache.clear(); // Clear token cache
  }

  async getModel(): Promise<{ id: string; info: ModelInfo }> {

    const client: vscode.LanguageModelChat = await this.getClient();

    return {
      id: stringifyVsCodeLmModelSelector(client),
      info: {
        maxTokens: client.maxInputTokens, // VSCode Language Model API does not provide output token limit. Going with the context window size.
        contextWindow: client.maxInputTokens,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 0,
        outputPrice: 0
      }
    };
  }
}
