import type { HistoryItem } from "@shared/HistoryItem";
import type { MessageParamWithTokenCount } from "@shared/api";
import type { ReclineMessage } from "@shared/ExtensionMessage";

import type { ReclineApi } from "./ReclineApi";
import type { ReclineState } from "./ReclineState";
import type { ReclineWebview } from "./ReclineWebview";
import type { ReclineEnvironment } from "./ReclineEnvironment";
import type { ReclineProvider } from "./webview/ReclineProvider";
import type { ReclineToolsOrchestrator } from "./ReclineToolsOrchestrator";

import * as path from "node:path";
import * as fs from "node:fs/promises";

import { findLastIndex } from "@shared/array";
import { getApiMetrics } from "@shared/getApiMetrics";
import { combineApiRequests } from "@shared/combineApiRequests";
import { combineCommandSequences } from "@shared/combineCommandSequences";

import { GlobalFileNames } from "@extension/constants";

import { fileExistsAtPath } from "../utils/fs";
import { sanitizeUserInput } from "../utils/sanitize";


interface TaskMetrics {
  id: string;
  ts: number;
  task: string;
  tokensIn: number;
  tokensOut: number;
  cacheWrites: number;
  cacheReads: number;
  totalCost: number;
}

export class ReclineTask {
  public apiManager?: ReclineApi;
  public environmentManager?: ReclineEnvironment;
  public globalStoragePath?: string;
  public reclineMessages: ReclineMessage[] = [];
  public taskDir?: string;
  public taskHistory: MessageParamWithTokenCount[] = [];
  public taskId = "";
  public toolsManager?: ReclineToolsOrchestrator;

  constructor(
    private provider: ReclineProvider,
    private stateManager: ReclineState,
    private webviewManager: ReclineWebview,
    private historyItem?: HistoryItem
  ) {}

  // Task Directory Management
  private async ensureTaskDirectoryExists(): Promise<string> {
    const storagePath = this.globalStoragePath;
    if (!storagePath || storagePath.trim() === "") {
      throw new Error("Global storage path is not set");
    }

    const taskDirPath = this.taskDir;
    if (!taskDirPath || taskDirPath.trim() === "") {
      const newTaskDir = path.join(storagePath, "tasks", this.taskId);
      await fs.mkdir(newTaskDir, { recursive: true });
      this.taskDir = newTaskDir;
      return newTaskDir;
    }

    return taskDirPath;
  }

  private async getSavedReclineMessages(): Promise<ReclineMessage[]> {
    try {
      const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.uiMessages);
      if (await fileExistsAtPath(filePath)) {
        const content = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(content) as ReclineMessage[];
        return Array.isArray(parsed) ? parsed : [];
      }

      // Check old location (legacy support)
      const oldPath = path.join(await this.ensureTaskDirectoryExists(), "claude_messages.json");
      if (await fileExistsAtPath(oldPath)) {
        const content = await fs.readFile(oldPath, "utf8");
        const data = JSON.parse(content) as ReclineMessage[];
        await fs.unlink(oldPath); // Remove old file
        return data;
      }

      return [];
    }
    catch (error) {
      console.error("Failed to get saved recline messages:", error);
      return [];
    }
  }

  private async getSavedTaskHistory(): Promise<MessageParamWithTokenCount[]> {
    try {
      const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.apiConversationHistory);
      const exists = await fileExistsAtPath(filePath);
      if (!exists) {
        return [];
      }

      const content = await fs.readFile(filePath, "utf8");
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        return [];
      }

      // Ensure each item matches MessageParamWithTokenCount shape
      return parsed.filter((item): item is MessageParamWithTokenCount => {
        return typeof item === "object" && item !== null;
      });
    }
    catch {
      return [];
    }
  }

  private async resumeTaskFromHistory(): Promise<void> {
    const modifiedReclineMessages = await this.getSavedReclineMessages();

    // Remove any resume messages that may have been added before
    const lastRelevantMessageIndex = findLastIndex(
      modifiedReclineMessages,
      m => !(m.ask === "resume_task" || m.ask === "resume_completed_task")
    );
    if (lastRelevantMessageIndex !== -1) {
      modifiedReclineMessages.splice(lastRelevantMessageIndex + 1);
    }

    // Since we don't use api_req_finished anymore, check if the last api_req_started has a cost value
    // If it doesn't and no cancellation reason to present, remove it since it indicates an incomplete request
    const lastApiReqStartedIndex = findLastIndex(
      modifiedReclineMessages,
      m => m.type === "say" && m.say === "api_req_started"
    );
    if (lastApiReqStartedIndex !== -1) {
      const lastApiReqStarted = modifiedReclineMessages[lastApiReqStartedIndex];
      const parsed = JSON.parse(lastApiReqStarted.text || "{}") as { cost?: number; cancelReason?: string };
      const { cost, cancelReason } = parsed;
      if (cost == null && cancelReason == null) {
        modifiedReclineMessages.splice(lastApiReqStartedIndex, 1);
      }
    }

    await this.overwriteReclineMessages(modifiedReclineMessages);
    this.reclineMessages = await this.getSavedReclineMessages();
  }

  private async saveReclineMessages(): Promise<TaskMetrics> {
    try {
      const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.uiMessages);
      await fs.writeFile(filePath, JSON.stringify(this.reclineMessages));

      // Default metrics for empty or invalid cases
      const defaultMetrics: TaskMetrics = {
        id: this.taskId,
        ts: Date.now(),
        task: "",
        tokensIn: 0,
        tokensOut: 0,
        cacheWrites: 0,
        cacheReads: 0,
        totalCost: 0
      };

      // Calculate task metrics from messages
      const metrics = getApiMetrics(combineApiRequests(combineCommandSequences(this.reclineMessages.slice(1))));

      // First message is always the task
      const taskMessage = this.reclineMessages[0];
      if (!taskMessage) {
        return defaultMetrics;
      }

      // Find last relevant message
      const lastRelevantIndex = findLastIndex(
        this.reclineMessages,
        m => !(m.ask === "resume_task" || m.ask === "resume_completed_task")
      );
      if (lastRelevantIndex === -1) {
        return defaultMetrics;
      }

      const lastRelevantMessage = this.reclineMessages[lastRelevantIndex];

      // Return task metrics with null coalescing for all potentially undefined values
      return {
        id: this.taskId,
        ts: lastRelevantMessage.ts ?? defaultMetrics.ts,
        task: taskMessage.text ?? defaultMetrics.task,
        tokensIn: metrics.totalTokensIn ?? defaultMetrics.tokensIn,
        tokensOut: metrics.totalTokensOut ?? defaultMetrics.tokensOut,
        cacheWrites: metrics.totalCacheWrites ?? defaultMetrics.cacheWrites,
        cacheReads: metrics.totalCacheReads ?? defaultMetrics.cacheReads,
        totalCost: metrics.totalCost ?? defaultMetrics.totalCost
      };
    }
    catch (error) {
      console.error("Failed to save recline messages:", error);
      throw error;
    }
  }

  // Task History Management
  private async saveTaskHistory(): Promise<void> {
    const filePath = path.join(await this.ensureTaskDirectoryExists(), GlobalFileNames.apiConversationHistory);
    await fs.writeFile(filePath, JSON.stringify(this.taskHistory));
  }

  // Task Lifecycle
  private async startNewTask(task?: string, images?: string[]): Promise<void> {
    // Reset state for new task
    this.reclineMessages = [];
    this.taskHistory = [];

    // Initialize task with first message
    await this.addToReclineMessages({
      ts: Date.now(),
      type: "say",
      say: "text",
      text: task ? sanitizeUserInput(task) : undefined,
      images
    });
  }

  async addToReclineMessages(message: ReclineMessage): Promise<TaskMetrics> {
    this.reclineMessages.push(message);
    return this.saveReclineMessages();
  }

  async addToTaskHistory(message: MessageParamWithTokenCount): Promise<void> {
    this.taskHistory.push(message);
    await this.saveTaskHistory();
  }

  async init(
    globalStoragePath: string,
    taskId: string | null = null,
    task?: string,
    images?: string[],
    historyItem?: HistoryItem
  ): Promise<void> {
    if (!globalStoragePath || globalStoragePath.trim() === "") {
      throw new Error("Global storage path is required");
    }
    this.globalStoragePath = globalStoragePath;

    if (historyItem && historyItem.id) {
      this.taskId = historyItem.id;
      await this.resumeTaskFromHistory();
      return;
    }

    const hasInputs = Boolean(task?.trim() || (Array.isArray(images) && images.length > 0));
    if (hasInputs) {
      this.taskId = (taskId && taskId.trim()) || Date.now().toString();
      await this.startNewTask(task, images);
      return;
    }

    throw new Error("Either historyItem or task/images must be provided");
  }

  async overwriteReclineMessages(newMessages: ReclineMessage[]): Promise<TaskMetrics> {
    this.reclineMessages = newMessages;
    return this.saveReclineMessages();
  }

  async overwriteTaskHistory(newHistory: MessageParamWithTokenCount[]): Promise<void> {
    this.taskHistory = newHistory;
    await this.saveTaskHistory();
  }

  public setApiManager(apiManager: ReclineApi): void {
    this.apiManager = apiManager;
  }

  public setEnvironmentManager(environmentManager: ReclineEnvironment): void {
    this.environmentManager = environmentManager;
  }

  public setToolsManager(toolsManager: ReclineToolsOrchestrator): void {
    this.toolsManager = toolsManager;
  };
}
