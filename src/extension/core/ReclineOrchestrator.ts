import type { Anthropic } from "@anthropic-ai/sdk";

import type { ApiConfiguration } from "@shared/api";
import type { HistoryItem } from "@shared/HistoryItem";
import type { ReclineMessage } from "@shared/ExtensionMessage";
import type { ReclineAskResponse } from "@shared/WebviewMessage";
import type { AutoApprovalSettings } from "@shared/AutoApprovalSettings";

import type { ModelProvider } from "../api/index";

import type { ToolContext } from "./tools/types";
import type { ReclineProvider } from "./webview/ReclineProvider";

import path from "node:path";
import { promises as fs } from "node:fs";

import { fileExistsAtPath } from "@extension/utils/fs";
import { GlobalFileNames, workspaceRoot } from "@extension/constants";

import { ReclineApi } from "./ReclineApi";
import { ReclineTask } from "./ReclineTask";
import { ReclineState } from "./ReclineState";
import { ReclineWebview } from "./ReclineWebview";
import { ReclineEnvironment } from "./ReclineEnvironment";
import { ReclineToolsOrchestrator } from "./ReclineToolsOrchestrator";


export class ReclineOrchestrator {
  public readonly apiManager: ReclineApi;
  public readonly customInstructions?: string;
  public readonly environmentManager: ReclineEnvironment;
  public readonly stateManager: ReclineState;
  public readonly task?: string;
  public readonly taskManager: ReclineTask;
  public readonly toolsManager: ReclineToolsOrchestrator;
  public readonly webviewManager: ReclineWebview;

  constructor(
    // Comments to help the AI understand not to touch the visibility of these fields
    public readonly provider: ReclineProvider, // { public get; private set; }
    public readonly apiConfiguration: ApiConfiguration, // { public get; private set; }
    public readonly autoApprovalSettings: AutoApprovalSettings, // { public get; private set; }
    customInstructions?: string, // { public get; private set; }
    task?: string, // { public get; private set; }
    public readonly images?: string[], // { public get; private set; }
    public readonly historyItem?: HistoryItem // { public get; private set; }
  ) {
    this.stateManager = new ReclineState(this);
    this.webviewManager = new ReclineWebview(this);
    this.taskManager = new ReclineTask(this);
    this.apiManager = new ReclineApi(this);
    this.toolsManager = new ReclineToolsOrchestrator(this);
    this.environmentManager = new ReclineEnvironment(this);

    this.customInstructions = customInstructions?.trim();
    this.task = task?.trim();
  }

  async abortTask(): Promise<void> {

    await this.taskManager.abortTask();
  }

  async getReclineRulesFileInstructions(): Promise<string | undefined> {

    const reclineRulesFilePath = path.resolve(workspaceRoot, GlobalFileNames.reclineRules);

    if (await fileExistsAtPath(reclineRulesFilePath)) {
      try {
        const ruleFileContent = (await fs.readFile(reclineRulesFilePath, "utf8")).trim();
        if (ruleFileContent) {
          return `# .reclinerules\n\nThe following is provided by a root-level .reclinerules file where the user has specified instructions for this working directory (${workspaceRoot.toPosix()})\n\n${ruleFileContent}`;
        }
      }
      catch {
        console.error(`Failed to read .reclinerules file at ${reclineRulesFilePath}`);
      }
    }

    return undefined;
  }

  async handleWebviewAskResponse(
    askResponse: ReclineAskResponse,
    text?: string,
    images?: string[]
  ): Promise<void> {
    await this.webviewManager.handleWebviewAskResponse(askResponse, text, images);
  }

  async recursivelyMakeReclineRequests(
    userContent: Array<
      Anthropic.TextBlockParam | Anthropic.ImageBlockParam | Anthropic.ToolUseBlockParam | Anthropic.ToolResultBlockParam
    >,
    includeFileDetails: boolean = false
  ): Promise<boolean> {
    return this.taskManager.recursivelyMakeReclineRequests(
      userContent,
      includeFileDetails
    );
  }

  async startTask(): Promise<void> {
    if (this.historyItem) {
      await this.taskManager.resumeTaskFromHistory();
    }
    else if (this.task != null || this.images) {
      await this.taskManager.startTask(this.task, this.images, this.customInstructions);
    }
    else {
      throw new Error("Either historyItem or task/images must be provided");
    }
  }
}
