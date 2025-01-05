import type { ReclineAskResponse } from "@shared/WebviewMessage";
import type { ReclineAsk, ReclineMessage, ReclineSay } from "@shared/ExtensionMessage";

import type { ReclineState } from "./ReclineState";
import type { ReclineProvider } from "./webview/ReclineProvider";
import type { ReclineOrchestrator } from "./ReclineOrchestrator";

import * as path from "node:path";
import * as fs from "node:fs/promises";

import pWaitFor from "p-wait-for";

import { GlobalFileNames } from "@extension/constants";

import { sanitizeUserInput } from "../utils/sanitize";


export class ReclineWebview {
  private askResponse?: ReclineAskResponse;
  private askResponseImages?: string[];
  private askResponseText?: string;
  private lastMessageTs?: number;

  constructor(private readonly orchestrator: ReclineOrchestrator) {}

  private async addToReclineMessages(message: ReclineMessage): Promise<void> {
    this.orchestrator.stateManager.reclineMessages.push(message);
    await this.saveReclineMessages();
    await this.orchestrator.provider.postStateToWebview();
  }

  private async ensureTaskDirectoryExists(): Promise<string> {
    const globalStoragePath = this.orchestrator.provider.context.globalStorageUri.fsPath;
    if (!globalStoragePath) {
      throw new Error("Global storage uri is invalid");
    }
    const taskDir = path.join(globalStoragePath, "tasks", this.orchestrator.stateManager.taskId);
    await fs.mkdir(taskDir, { recursive: true });
    return taskDir;
  }

  private resetResponseState(): void {
    this.askResponse = undefined;
    this.askResponseText = undefined;
    this.askResponseImages = undefined;
  }

  private async saveReclineMessages(): Promise<void> {
    try {
      const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.uiMessages);
      await fs.writeFile(filePath, JSON.stringify(this.orchestrator.stateManager.reclineMessages));
    }
    catch (error) {
      console.error("Failed to save recline messages:", error);
      throw error; // Re-throw to handle at higher level
    }
  }

  async ask(
    type: ReclineAsk,
    text?: string,
    partial?: boolean
  ): Promise<{ response: ReclineAskResponse; text?: string; images?: string[] }> {
    if (this.orchestrator.stateManager.abort) {
      throw new Error("Recline instance aborted");
    }

    let askTs: number;
    const lastMessage = this.orchestrator.stateManager.reclineMessages.at(-1);
    const isUpdatingPreviousPartial = lastMessage && lastMessage.partial && lastMessage.type === "ask" && lastMessage.ask === type;

    if (partial) {
      if (isUpdatingPreviousPartial) {
        lastMessage.text = text;
        lastMessage.partial = partial;
        await this.orchestrator.provider.postMessageToWebview({
          type: "partialMessage",
          partialMessage: lastMessage
        });
        throw new Error("Current ask promise was ignored - partial update");
      }
      else {
        askTs = Date.now();
        this.lastMessageTs = askTs;
        await this.addToReclineMessages({ ts: askTs, type: "ask", ask: type, text, partial });
        throw new Error("Current ask promise was ignored - new partial message");
      }
    }
    else {
      if (isUpdatingPreviousPartial) {
        this.resetResponseState();
        askTs = lastMessage.ts; // Maintain stable ts to prevent UI flickering
        this.lastMessageTs = askTs;
        lastMessage.text = text;
        lastMessage.partial = false;
        await this.saveReclineMessages();
        await this.orchestrator.provider.postMessageToWebview({
          type: "partialMessage",
          partialMessage: lastMessage
        });
      }
      else {
        this.resetResponseState();
        askTs = Date.now();
        this.lastMessageTs = askTs;
        await this.addToReclineMessages({ ts: askTs, type: "ask", ask: type, text });
      }
    }

    await pWaitFor(() => this.askResponse !== undefined || this.lastMessageTs !== askTs, { interval: 100 });
    if (this.lastMessageTs !== askTs) {
      throw new Error("Current ask promise was ignored - message timestamp mismatch");
    }

    const result = {
      response: this.askResponse!,
      text: this.askResponseText,
      images: this.askResponseImages
    };
    this.resetResponseState();
    return result;
  }

  async handleWebviewAskResponse(askResponse: ReclineAskResponse, text?: string, images?: string[]): Promise<void> {
    this.askResponse = askResponse;
    this.askResponseText = text != null ? sanitizeUserInput(text) : text;
    this.askResponseImages = images;
  }

  async say(type: ReclineSay, text?: string, images?: string[], partial?: boolean): Promise<undefined> {
    if (this.orchestrator.stateManager.abort) {
      throw new Error("Recline instance aborted");
    }

    const lastMessage = this.orchestrator.stateManager.reclineMessages.at(-1);
    const isUpdatingPreviousPartial = lastMessage && lastMessage.partial && lastMessage.type === "say" && lastMessage.say === type;

    if (partial) {
      if (isUpdatingPreviousPartial) {
        lastMessage.text = text;
        lastMessage.images = images;
        lastMessage.partial = partial;
        await this.orchestrator.provider.postMessageToWebview({
          type: "partialMessage",
          partialMessage: lastMessage
        });
      }
      else {
        const sayTs = Date.now();
        this.lastMessageTs = sayTs;
        await this.addToReclineMessages({ ts: sayTs, type: "say", say: type, text, images, partial });
      }
    }
    else {
      if (isUpdatingPreviousPartial) {
        this.lastMessageTs = lastMessage.ts;
        lastMessage.text = text;
        lastMessage.images = images;
        lastMessage.partial = false;
        await this.saveReclineMessages();
        await this.orchestrator.provider.postMessageToWebview({
          type: "partialMessage",
          partialMessage: lastMessage
        });
      }
      else {
        const sayTs = Date.now();
        this.lastMessageTs = sayTs;
        await this.addToReclineMessages({ ts: sayTs, type: "say", say: type, text, images });
      }
    }
  }
}
