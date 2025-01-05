// type that represents json data that is sent from extension to webview, called ExtensionMessage and has 'type' enum which can be 'plusButtonClicked' or 'settingsButtonClicked' or 'hello'

import type * as vscode from "vscode";

import type { McpServer } from "./mcp";
import type { HistoryItem } from "./HistoryItem";
import type { ApiConfiguration, ModelInfo } from "./api";
import type { AutoApprovalSettings } from "./AutoApprovalSettings";


// webview will hold state
export interface ExtensionMessage {
  type:
    | "action"
    | "state"
    | "selectedImages"
    | "ollamaModels"
    | "lmStudioModels"
    | "theme"
    | "workspaceUpdated"
    | "invoke"
    | "partialMessage"
    | "openRouterModels"
    | "mcpServers"
    | "vsCodeLmSelectors";
  text?: string;
  action?:
    | "chatButtonClicked"
    | "mcpButtonClicked"
    | "settingsButtonClicked"
    | "historyButtonClicked"
    | "didBecomeVisible";
  invoke?: "sendMessage" | "primaryButtonClick" | "secondaryButtonClick";
  state?: ExtensionState;
  images?: string[];
  ollamaModels?: string[];
  lmStudioModels?: string[];
  filePaths?: string[];
  partialMessage?: ReclineMessage;
  openRouterModels?: Record<string, ModelInfo>;
  mcpServers?: McpServer[];
  vsCodeLmSelectors?: vscode.LanguageModelChatSelector[];
}

export interface ExtensionState {
  version: string;
  apiConfiguration?: ApiConfiguration;
  customInstructions?: string;
  uriScheme?: string;
  reclineMessages: ReclineMessage[];
  taskHistory: HistoryItem[];
  shouldShowAnnouncement: boolean;
  autoApprovalSettings: AutoApprovalSettings;
}

export interface ReclineMessage {
  ts: number;
  type: "ask" | "say";
  ask?: ReclineAsk;
  say?: ReclineSay;
  text?: string;
  images?: string[];
  partial?: boolean;
}

export type ReclineAsk =
  | "followup"
  | "command"
  | "command_output"
  | "completion_result"
  | "tool"
  | "api_req_failed"
  | "resume_task"
  | "resume_completed_task"
  | "mistake_limit_reached"
  | "auto_approval_max_req_reached"
  | "browser_action_launch"
  | "use_mcp_server";

export type ReclineSay =
  | "task"
  | "error"
  | "api_req_started"
  | "api_req_finished"
  | "text"
  | "completion_result"
  | "user_feedback"
  | "user_feedback_diff"
  | "api_req_retried"
  | "command"
  | "command_output"
  | "tool"
  | "shell_integration_warning"
  | "browser_action_launch"
  | "browser_action"
  | "browser_action_result"
  | "mcp_server_request_started"
  | "mcp_server_response"
  | "use_mcp_server"
  | "diff_error";

export interface ReclineSayTool {
  tool:
    | "editedExistingFile"
    | "newFileCreated"
    | "readFile"
    | "listFilesTopLevel"
    | "listFilesRecursive"
    | "listCodeDefinitionNames"
    | "searchFiles";
  path?: string;
  diff?: string;
  content?: string;
  regex?: string;
  filePattern?: string;
}

// must keep in sync with system prompt
export const browserActions = ["launch", "click", "type", "scroll_down", "scroll_up", "close"] as const;
export type BrowserAction = (typeof browserActions)[number];

export interface ReclineSayBrowserAction {
  action: BrowserAction;
  coordinate?: string;
  text?: string;
}

export interface BrowserActionResult {
  screenshot?: string;
  logs?: string;
  currentUrl?: string;
  currentMousePosition?: string;
}

export interface ReclineAskUseMcpServer {
  serverName: string;
  type: "use_mcp_tool" | "access_mcp_resource";
  toolName?: string;
  arguments?: string;
  uri?: string;
}

export interface ReclineApiReqInfo {
  request?: string;
  tokensIn?: number;
  tokensOut?: number;
  cacheWrites?: number;
  cacheReads?: number;
  cost?: number;
  cancelReason?: ReclineApiReqCancelReason;
  streamingFailedMessage?: string;
}

export type ReclineApiReqCancelReason = "streaming_failed" | "user_cancelled";
