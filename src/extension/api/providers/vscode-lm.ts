import type {
  ApiHandlerOptions,
  MessageParamWithTokenCount,
  ModelInfo
} from "@shared/api";

import type { ModelProvider } from "@extension/api";
import type { ApiStream } from "@extension/api/transform/stream";

import { createHash } from "node:crypto";

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

    this.configurationWatcher = vscode.workspace.onDidChangeConfiguration((event: vscode.ConfigurationChangeEvent) => {
      if (event.affectsConfiguration("lm")) {
        this.releaseCurrentCancellation();
        this.client = null;
      }
    });
  }

  private async calculateInputTokens(systemPrompt: string, messages: MessageParamWithTokenCount[]): Promise<number> {
    let totalTokens = 0;
    const systemPromptHash = createHash("sha1").update(systemPrompt).digest("base64");
    if (!this.systemPromptTokenCache.has(systemPromptHash)) {
      const tokenCount = await this.countTokens(systemPrompt);
      this.systemPromptTokenCache.set(systemPromptHash, tokenCount);
    }
    totalTokens += this.systemPromptTokenCache.get(systemPromptHash)!;

    for (const msg of messages) {
      if (msg.tokenCount !== undefined) {
        totalTokens += msg.tokenCount;
      }
      else {
        // Handle case where msg.tokenCount is not defined
        // This should be rare if token counts are stored persistently
        const messageContent = Array.isArray(msg.content)
          ? msg.content.filter(block => block.type === "text").map(block => block.text).join("\n")
          : msg.content;
        const tokenCount = await this.countTokens(messageContent);
        totalTokens += tokenCount;
      }
    }

    return totalTokens;
  }

  private async countTokens(text: string): Promise<number> {
    if (!this.client || !this.currentRequestCancellation) {
      return 0;
    }

    try {
      return await this.client.countTokens(text, this.currentRequestCancellation.token);
    }
    catch (error) {
      if (error instanceof vscode.CancellationError) {
        throw error;
      }
      console.warn("Token counting failed:", error);
      return 0;
    }
  }

  private async getClient(): Promise<vscode.LanguageModelChat> {
    if (!this.options.vsCodeLmModelSelector) {
      throw new Error(`${ERROR_PREFIX} The 'vsCodeLmModelSelector' option is required for the 'vscode-lm' provider.`);
    }

    if (!this.client) {
      this.client = await this.selectBestModel(this.options.vsCodeLmModelSelector);
    }

    return this.client;
  }

  private async *processStreamChunks(response: vscode.LanguageModelChatResponse, contentBuilder: string[]): ApiStream {
    const stream = response.stream;

    for await (const chunk of stream) {
      if (this.currentRequestCancellation?.token.isCancellationRequested) {
        break;
      }

      if (chunk instanceof vscode.LanguageModelTextPart && chunk.value) {
        contentBuilder.push(chunk.value);
        yield { type: "text", text: chunk.value };
      }
    }

    this.releaseCurrentCancellation();
  }

  private releaseCurrentCancellation(): void {
    if (this.currentRequestCancellation) {
      this.currentRequestCancellation.cancel();
      this.currentRequestCancellation.dispose();
      this.currentRequestCancellation = null;
    }
  }

  private async selectBestModel(selector: vscode.LanguageModelChatSelector): Promise<vscode.LanguageModelChat> {
    const models = await vscode.lm.selectChatModels(selector);
    if (models.length === 0) {
      throw new Error(`${ERROR_PREFIX} No models found matching the specified selector.`);
    }

    return models.reduce((best, current) => current.maxInputTokens > best.maxInputTokens ? current : best, models[0]);
  }

  async *createMessage(systemPrompt: string, messages: MessageParamWithTokenCount[]): ApiStream {
    this.releaseCurrentCancellation();
    const client = await this.getClient();
    const model = await this.getModel();
    this.currentRequestCancellation = new vscode.CancellationTokenSource();

    const totalInputTokens = await this.calculateInputTokens(systemPrompt, messages);
    const vsCodeLmMessages = [
      vscode.LanguageModelChatMessage.User(systemPrompt),
      ...convertToVsCodeLmMessages(messages)
    ];

    const contentBuilder: string[] = [];
    const response = await client.sendRequest(
      vsCodeLmMessages,
      { justification: `${client.name} from ${client.vendor} will be used by Recline. Click 'Allow' to proceed.` },
      this.currentRequestCancellation.token
    );

    const streamGenerator = this.processStreamChunks(response, contentBuilder);
    for await (const chunk of streamGenerator) {
      yield chunk;
    }

    if (!this.currentRequestCancellation?.token.isCancellationRequested) {
      const outputTokens = await this.countTokens(contentBuilder.join(""));
      yield {
        type: "usage",
        inputTokens: totalInputTokens,
        outputTokens,
        totalCost: calculateApiCost(model.info, totalInputTokens, outputTokens)
      };
    }
  }

  async dispose(): Promise<void> {
    this.releaseCurrentCancellation();

    if (this.configurationWatcher) {
      this.configurationWatcher.dispose();
      this.configurationWatcher = null;
    }

    this.client = null;
    this.systemPromptTokenCache.clear();
  }

  async getModel(): Promise<{ id: string; info: ModelInfo }> {
    const client = await this.getClient();
    return {
      id: stringifyVsCodeLmModelSelector(client),
      info: {
        maxTokens: client.maxInputTokens,
        contextWindow: client.maxInputTokens,
        supportsImages: false,
        supportsPromptCache: false,
        inputPrice: 0,
        outputPrice: 0
      }
    };
  }
}
