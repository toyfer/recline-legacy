import type { ReclineMessage } from "@shared/ExtensionMessage";

import type { AssistantMessageContent } from "./types";


export class ReclineState {
  abort: boolean = false;
  // Assistant message state
  assistantMessage: string = "";

  assistantMessageContent: AssistantMessageContent[] = [];
  // Error tracking
  consecutiveAutoApprovedRequestsCount: number = 0;
  consecutiveMistakeCount: number = 0;
  currentStreamingContentIndex = 0;
  // Tool execution state
  didAlreadyUseTool = false;
  didCompleteReadingStream = false;
  didEditFile: boolean = false;

  didRejectTool = false;
  presentAssistantMessageHasPendingUpdates = false;
  presentAssistantMessageLocked = false;

  // UI state
  reclineMessages: ReclineMessage[] = [];

  // Core state
  readonly taskId: string;
  userMessageContentReady = false;

  constructor() {
    this.taskId = Date.now().toString();
  }

  // Methods to manage error tracking
  incrementAutoApprovedCount(): void {
    this.consecutiveAutoApprovedRequestsCount++;
  }

  incrementMistakeCount(): void {
    this.consecutiveMistakeCount++;
  }

  lockAssistantMessage(): void {
    this.presentAssistantMessageLocked = true;
  }

  markFileEdited(): void {
    this.didEditFile = true;
  }

  markToolRejected(): void {
    this.didRejectTool = true;
  }

  markToolUsed(): void {
    this.didAlreadyUseTool = true;
  }

  // Methods to manage assistant message state
  resetAssistantMessageState(): void {
    this.assistantMessage = "";
    this.assistantMessageContent = [];
    this.currentStreamingContentIndex = 0;
    this.didCompleteReadingStream = false;
    this.presentAssistantMessageHasPendingUpdates = false;
    this.presentAssistantMessageLocked = false;
    this.userMessageContentReady = false;
  }

  resetAutoApprovedCount(): void {
    this.consecutiveAutoApprovedRequestsCount = 0;
  }

  resetMistakeCount(): void {
    this.consecutiveMistakeCount = 0;
  }

  // Methods to manage tool state
  resetToolState(): void {
    this.didAlreadyUseTool = false;
    this.didRejectTool = false;
    this.didEditFile = false;
  }

  unlockAssistantMessage(): void {
    this.presentAssistantMessageLocked = false;
  }
}
