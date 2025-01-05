import type { McpHub } from "@extension/services/mcp/McpHub";

import type { Model, ModelProvider } from "../api";
import type { ApiStream } from "../api/transform/stream";

import type { ReclineOrchestrator } from "./ReclineOrchestrator";

import pWaitFor from "p-wait-for";
import { serializeError } from "serialize-error";

import { buildApiHandler } from "@extension/api";
import { workspaceRoot } from "@extension/constants";
import { calculateApiCost } from "@extension/utils/cost";
import { OpenAIModelProvider } from "@extension/api/providers/openai";

import { SYSTEM_PROMPT } from "./prompts/system";
import { USER_SYSTEM_PROMPT } from "./prompts/user-system";
import { truncateHalfConversation } from "./sliding-window";


export class ReclineApi {

  private readonly api: ModelProvider;

  constructor(private readonly orchestrator: ReclineOrchestrator) {
    this.api = buildApiHandler(orchestrator.apiConfiguration);
  }

  async *attemptApiRequest(previousApiReqIndex: number): ApiStream {

    const mcpHub = await this.ensureMCPConnection();
    const model: Model = await this.api.getModel();

    let systemPrompt: string = await SYSTEM_PROMPT(workspaceRoot, model.info.supportsComputerUse ?? false, mcpHub);
    const reclineRulesFileInstructions: string | undefined = await this.orchestrator.getReclineRulesFileInstructions();

    if (
      (this.orchestrator.customInstructions != null && this.orchestrator.customInstructions.length > 0)
      || (reclineRulesFileInstructions != null && reclineRulesFileInstructions.length > 0)
    ) {
      // altering the system prompt mid-task will break the prompt cache, but in the grand scheme this will not change often so it's better to not pollute user messages with it the way we have to with <potentially relevant details>
      systemPrompt += USER_SYSTEM_PROMPT(this.orchestrator.customInstructions, reclineRulesFileInstructions);
    }

    // If the previous API request's total token usage is close to the context window, truncate the conversation history to free up space for the new request
    if (previousApiReqIndex >= 0) {

      const previousRequest = this.orchestrator.taskManager.reclineMessages[previousApiReqIndex];

      if (previousRequest != null && previousRequest.text != null && previousRequest.text.length > 0) {

        const { tokensIn, tokensOut, cacheWrites, cacheReads }: any = JSON.parse(previousRequest.text); // @TODO Validate with zod?
        const totalTokens = (tokensIn || 0) + (tokensOut || 0) + (cacheWrites || 0) + (cacheReads || 0);

        let contextWindow = model.info.contextWindow || 128_000;

        // FIXME: hack to get anyone using openai compatible with deepseek to have the proper context window instead of the default 128k. We need a way for the user to specify the context window for models they input through openai compatible
        if (this.api instanceof OpenAIModelProvider && model.id.toLowerCase().includes("deepseek")) {
          contextWindow = 64_000;
        }

        let maxAllowedSize: number;
        switch (contextWindow) {
          case 64_000: // deepseek models
            maxAllowedSize = contextWindow - 27_000;
            break;
          case 128_000: // most models
            maxAllowedSize = contextWindow - 30_000;
            break;
          case 200_000: // claude models
            maxAllowedSize = contextWindow - 40_000;
            break;
          default:
            maxAllowedSize = Math.max(contextWindow - 40_000, contextWindow * 0.8); // for deepseek, 80% of 64k meant only ~10k buffer which was too small and resulted in users getting context window errors.
        }

        if (totalTokens >= maxAllowedSize) {
          const truncatedMessages = truncateHalfConversation(this.apiConversationHistory);
          await this.overwriteApiConversationHistory(truncatedMessages);
        }
      }
    }

    const stream = this.api.createMessage(systemPrompt, this.apiConversationHistory);
    const iterator = stream[Symbol.asyncIterator]();

    try {
      // awaiting first chunk to see if it will throw an error
      const firstChunk = await iterator.next();
      yield firstChunk.value;
    }
    catch (error) {
      // note that this api_req_failed ask is unique in that we only present this option if the api hasn't streamed any content yet (ie it fails on the first chunk due), as it would allow them to hit a retry button. However if the api failed mid-stream, it could be in any arbitrary state where some tools may have executed, so that error is handled differently and requires cancelling the task entirely.
      const { response } = await this.webviewManager.ask(
        "api_req_failed",
        error.message ?? JSON.stringify(serializeError(error), null, 2)
      );
      if (response !== "yesButtonClicked") {
        // this will never happen since if noButtonClicked, we will clear current task, aborting this instance
        throw new Error("API request failed");
      }
      await this.webviewManager.say("api_req_retried");
      // delegate generator output from the recursive call
      yield * this.attemptApiRequest(previousApiReqIndex);
      return;
    }

    // no error, so we can continue to yield all remaining chunks
    // (needs to be placed outside of try/catch since it we want caller to handle errors not with api_req_failed as that is reserved for first chunk failures only)
    // this delegates to another generator or iterable object. In this case, it's saying "yield all remaining values from this iterator". This effectively passes along all subsequent chunks from the original stream.
    yield * iterator;
  }

  async calculateApiCost(
    inputTokens: number,
    outputTokens: number,
    cacheWriteTokens: number,
    cacheReadTokens: number
  ): Promise<number> {
    const model = await this.api.getModel();
    return calculateApiCost(
      model.info,
      inputTokens,
      outputTokens,
      cacheWriteTokens,
      cacheReadTokens
    );
  }

  async ensureMCPConnection(): Promise<McpHub> {
    const mcpHub = this.orchestrator.provider.mcpHub;
    if (mcpHub == null) {
      throw new Error("MCP hub not available");
    }

    await pWaitFor((): boolean => this.orchestrator.provider.mcpHub!.isConnecting !== true, { timeout: 10_000 }).catch(() => {
      console.error("MCP servers failed to connect in time");
    });

    return mcpHub;
  }

  async getModel(): Promise<Model> {
    return this.api.getModel();
  }
}
