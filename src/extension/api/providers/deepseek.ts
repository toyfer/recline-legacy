import type { Anthropic } from "@anthropic-ai/sdk";

import type { ApiHandlerOptions, DeepSeekModelId, ModelInfo } from "@shared/api";

import type { ModelProvider } from "../";
import type { ApiStream } from "../transform/stream";

import OpenAI from "openai";

import { deepSeekDefaultModelId, deepSeekModels } from "@shared/api";

import { convertToOpenAiMessages } from "../transform/openai-format";


export class DeepSeekModelProvider implements ModelProvider {
  private client: OpenAI;
  private options: ApiHandlerOptions;

  constructor(options: ApiHandlerOptions) {
    this.options = options;
    this.client = new OpenAI({
      baseURL: "https://api.deepseek.com/v1",
      apiKey: this.options.deepSeekApiKey
    });
  }

  async *createMessage(systemPrompt: string, messages: Anthropic.Messages.MessageParam[]): ApiStream {
    const model = await this.getModel();
    const stream = await this.client.chat.completions.create({
      model: model.id,
      max_completion_tokens: model.info.maxTokens,
      temperature: 0,
      messages: [{ role: "system", content: systemPrompt }, ...convertToOpenAiMessages(messages)],
      stream: true,
      stream_options: { include_usage: true }
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        yield {
          type: "text",
          text: delta.content
        };
      }

      if (chunk.usage) {
        yield {
          type: "usage",
          inputTokens: chunk.usage.prompt_tokens || 0, // (deepseek reports total input AND cache reads/writes, see context caching: https://api-docs.deepseek.com/guides/kv_cache) where the input tokens is the sum of the cache hits/misses, while anthropic reports them as separate tokens. This is important to know for 1) context management truncation algorithm, and 2) cost calculation (NOTE: we report both input and cache stats but for now set input price to 0 since all the cost calculation will be done using cache hits/misses)
          outputTokens: chunk.usage.completion_tokens || 0,
          // @ts-ignore-next-line
          cacheReadTokens: chunk.usage.prompt_cache_hit_tokens || 0,
          // @ts-ignore-next-line
          cacheWriteTokens: chunk.usage.prompt_cache_miss_tokens || 0
        };
      }
    }
  }

  async getModel(): Promise<{ id: DeepSeekModelId; info: ModelInfo }> {
    const modelId = this.options.apiModelId;
    if (modelId && modelId in deepSeekModels) {
      const id = modelId as DeepSeekModelId;
      return { id, info: deepSeekModels[id] };
    }
    return { id: deepSeekDefaultModelId, info: deepSeekModels[deepSeekDefaultModelId] };
  }
}
