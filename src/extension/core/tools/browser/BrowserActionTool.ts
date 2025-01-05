import type { Anthropic } from "@anthropic-ai/sdk";

import type { BrowserAction, BrowserActionResult } from "@shared/ExtensionMessage";

import type { ReclineToolsOrchestrator } from "@extension/core/ReclineToolsOrchestrator";

import type { ToolContext, ToolParams, ToolResponse } from "../types";

import * as process from "node:process";

import { z } from "zod";
import * as vscode from "vscode";

import { BaseReclineTool } from "../ReclineTool";
import { BrowserSession } from "../../../integrations/browser/BrowserSession";


// Create a minimal implementation of EnvironmentVariableCollection that implements Symbol.iterator
function createEnvVarCollection(): vscode.EnvironmentVariableCollection {
  return {
    *[Symbol.iterator](): Iterator<[variable: string, mutator: vscode.EnvironmentVariableMutator]> {
      return [][Symbol.iterator]();
    },
    append: (_variable: string, _value: string): void => {},
    clear: (): void => {},
    delete: (_variable: string): void => {},
    forEach: (_callback: (variable: string, mutator: vscode.EnvironmentVariableMutator, collection: vscode.EnvironmentVariableCollection) => any): void => {},
    get: (_variable: string): vscode.EnvironmentVariableMutator | undefined => undefined,
    prepend: (_variable: string, _value: string): void => {},
    replace: (_variable: string, _value: string): void => {},
    description: undefined,
    persistent: true
  };
}

interface BrowserContext {
  extensionPath: string;
  subscriptions: { dispose: () => any }[];
  storagePath: string;
  logPath: string;
  globalStoragePath: string;
  asAbsolutePath: (path: string) => string;
  extensionUri: vscode.Uri;
  globalState: vscode.Memento & { setKeysForSync: (keys: readonly string[]) => void };
  workspaceState: vscode.Memento & { setKeysForSync: (keys: readonly string[]) => void };
  extension: vscode.Extension<any>;
  environmentVariableCollection: vscode.GlobalEnvironmentVariableCollection;
  extensionMode: vscode.ExtensionMode;
  logUri: vscode.Uri;
  storageUri: vscode.Uri;
  globalStorageUri: vscode.Uri;
  secrets: vscode.SecretStorage;
  languageModelAccessInformation: vscode.LanguageModelAccessInformation;
}

const browserActions = ["launch", "click", "type", "scroll_down", "scroll_up", "close"] as const;

// Base schema for all browser actions
const baseBrowserActionSchema = z.object({
  action: z.enum(browserActions)
});

// Specific schemas for each action type
const launchActionSchema = baseBrowserActionSchema.extend({
  action: z.literal("launch"),
  url: z.string().min(1, "URL is required for launch action")
});

const clickActionSchema = baseBrowserActionSchema.extend({
  action: z.literal("click"),
  coordinate: z.string().min(1, "Coordinate is required for click action")
});

const typeActionSchema = baseBrowserActionSchema.extend({
  action: z.literal("type"),
  text: z.string().min(1, "Text is required for type action")
});

const simpleActionSchema = baseBrowserActionSchema.extend({
  action: z.enum(["scroll_down", "scroll_up", "close"])
});

// Combined schema for all possible browser actions
const browserActionSchema = z.discriminatedUnion("action", [
  launchActionSchema,
  clickActionSchema,
  typeActionSchema,
  simpleActionSchema
]);

type BrowserActionParams = z.infer<typeof browserActionSchema> & ToolParams;

export class BrowserActionTool extends BaseReclineTool {
  private browserSession: BrowserSession;

  abort: (() => Promise<void>) = async () => {
    await this.browserSession.closeBrowser();
  };

  constructor(toolsOrchestrator: ReclineToolsOrchestrator, context: ToolContext) {
    super("browser_action", toolsOrchestrator, context);
    // Create a minimal ExtensionContext-like object that satisfies BrowserSession requirements
    const browserContext: BrowserContext = {
      extensionPath: process.cwd(),
      storagePath: process.cwd(),
      logPath: process.cwd(),
      globalStoragePath: process.cwd(),
      subscriptions: [],
      asAbsolutePath: (relativePath: string) => relativePath,
      extensionUri: vscode.Uri.file(process.cwd()),
      globalState: {
        get: () => undefined,
        update: async () => Promise.resolve(),
        keys: () => [],
        setKeysForSync: () => {}
      } as vscode.Memento & { setKeysForSync: (keys: readonly string[]) => void },
      workspaceState: {
        get: () => undefined,
        update: async () => Promise.resolve(),
        keys: () => [],
        setKeysForSync: () => {}
      } as vscode.Memento & { setKeysForSync: (keys: readonly string[]) => void },
      extension: {
        id: "recline",
        extensionUri: vscode.Uri.file(process.cwd()),
        extensionPath: process.cwd(),
        isActive: true,
        packageJSON: {},
        extensionKind: vscode.ExtensionKind.Workspace,
        activate: async () => undefined,
        exports: undefined,
        deactivate: undefined
      } as unknown as vscode.Extension<any>,
      environmentVariableCollection: (() => {
        const envVarCollection = createEnvVarCollection();
        return {
          ...envVarCollection,
          persistent: true,
          getScoped: () => createEnvVarCollection()
        };
      })() as vscode.GlobalEnvironmentVariableCollection,
      extensionMode: vscode.ExtensionMode.Production,
      logUri: vscode.Uri.file(process.cwd()),
      storageUri: vscode.Uri.file(process.cwd()),
      globalStorageUri: vscode.Uri.file(process.cwd()),
      secrets: {
        get: async () => "",
        store: async () => {},
        delete: async () => {},
        onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
      } as vscode.SecretStorage,
      languageModelAccessInformation: {
        forSystem: "",
        onDidChange: new vscode.EventEmitter<void>().event,
        canSendRequest: () => true
      }
    } as BrowserContext;
    this.browserSession = new BrowserSession(browserContext);
  }

  private formatBrowserActionResult(action: string, result: BrowserActionResult): ToolResponse {
    const baseText = `The browser action has been executed. The console logs and screenshot have been captured for your analysis.

Console logs:
${result.logs || "(No new logs)"}

(REMEMBER: if you need to proceed to using non-\`browser_action\` tools or launch a new browser, you MUST first close this browser. For example, if after analyzing the logs and screenshot you need to edit a file, you must first close the browser before you can use the write_to_file tool.)`;

    if (result.screenshot) {
      return [
        { type: "text", text: baseText },
        // Note: For Anthropic blocks, property name is url not image
        { type: "image", source: { type: "base64", media_type: "image/png", data: result.screenshot } } as Anthropic.ImageBlockParam
      ];
    }

    return baseText;
  }

  private formatDenied(action: string, detail?: string): string {
    return `The user denied browser action: ${action}${detail ? ` (${detail})` : ""}`;
  }

  private formatDeniedWithFeedback(action: string, detail: string | undefined, feedback?: string): string {
    return `The user denied browser action: ${action}${detail ? ` (${detail})` : ""}\nFeedback: ${feedback ?? "No feedback provided"}`;
  }

  private removePartialClosingTags(text: string | undefined, tagName: string): string {
    return text?.replace(new RegExp(`\\/?${tagName}>?$`), "") ?? "";
  }

  async execute(params: ToolParams, partial?: boolean): Promise<ToolResponse> {
    // Validate and type the params first
    const validatedParams = this.validateParams<BrowserActionParams>(params);
    const { action, url, coordinate, text } = validatedParams;

    // Close browser if it's not one of our supported actions
    if (!["launch", "click", "type", "scroll_down", "scroll_up", "close"].includes(action)) {
      await this.browserSession.closeBrowser();
    }

    try {
      if (action === "launch") {
        if (partial) {
          const partialUrl = String(url ?? "");
          const cleanUrl = partialUrl.length > 0 ? this.removePartialClosingTags(partialUrl, "url") : "";
          if (this.context.shouldAutoApproveTool(this.name)) {
            await this.context.say("browser_action_launch", cleanUrl, undefined, true);
          }
          else {
            await this.context.ask("browser_action_launch", cleanUrl, true);
          }
          return "";
        }

        // Launch requires a URL
        if (!url) {
          throw new Error("URL is required for launch action");
        }

        // Get approval for launch
        if (!this.context.shouldAutoApproveTool(this.name)) {
          const { response, text: feedback, images } = await this.context.ask("browser_action_launch", url, false);
          if (response !== "yesButtonClicked") {
            if (response === "messageResponse") {
              const safeText = feedback ?? "";
              await this.context.say("user_feedback", safeText, images);
              return this.formatDeniedWithFeedback("launch", url ?? "", safeText);
            }
            return this.formatDenied("launch", url ?? "");
          }
        }
        else {
          await this.context.say("browser_action_launch", url, undefined, false);
        }

        await this.context.say("browser_action_result", "");
        await this.browserSession.launchBrowser();
        const result = await this.browserSession.navigateToUrl(url);
        await this.context.say("browser_action_result", JSON.stringify(result));
        return this.formatBrowserActionResult("launch", result);
      }
      else {
        // Handle other browser actions
        if (partial) {
          await this.context.say(
            "browser_action",
            JSON.stringify({
              action,
              coordinate: String(coordinate ?? ""),
              text: String(text ?? "")
            }),
            undefined,
            true
          );
          return "";
        }

        // Validate action-specific parameters
        if (action === "click" && (!coordinate || coordinate.trim().length === 0)) {
          throw new Error("Coordinate is required for click action");
        }
        if (action === "type" && (!text || text.trim().length === 0)) {
          throw new Error("Text is required for type action");
        }

        await this.context.say(
          "browser_action",
          JSON.stringify({
            action,
            coordinate,
            text
          }),
          undefined,
          false
        );

        let result;
        // Zod validation ensures these are non-null when required
        switch (action) {
          case "click":
            result = await this.browserSession.click(coordinate);
            break;
          case "type":
            result = await this.browserSession.type(text);
            break;
          case "scroll_down":
            result = await this.browserSession.scrollDown();
            break;
          case "scroll_up":
            result = await this.browserSession.scrollUp();
            break;
          case "close":
            result = await this.browserSession.closeBrowser();
            break;
          default:
            throw new Error(`Unknown browser action: ${action}`);
        }

        if (action !== "close") {
          await this.context.say("browser_action_result", JSON.stringify(result));
          return this.formatBrowserActionResult(action, result);
        }
        return "The browser has been closed. You may now proceed to using other tools.";
      }
    }
    catch (error) {
      await this.browserSession.closeBrowser();
      return this.formatError(
        `Error executing browser action: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  validateParams<T extends ToolParams>(params: ToolParams): T {
    const validatedData = browserActionSchema.parse(params);
    return { ...params, ...validatedData } as T;
  }
}
