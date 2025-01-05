import type { ApiConfiguration } from "./api";
import type { AutoApprovalSettings } from "./AutoApprovalSettings";


export interface WebviewMessage {
  type:
    | "apiConfiguration"
    | "customInstructions"
    | "webviewDidLaunch"
    | "newTask"
    | "askResponse"
    | "clearTask"
    | "didShowAnnouncement"
    | "selectImages"
    | "exportCurrentTask"
    | "showTaskWithId"
    | "deleteTaskWithId"
    | "exportTaskWithId"
    | "resetState"
    | "requestOllamaModels"
    | "requestLmStudioModels"
    | "requestVsCodeLmSelectors"
    | "openImage"
    | "openFile"
    | "openMention"
    | "cancelTask"
    | "refreshOpenRouterModels"
    | "openMcpSettings"
    | "restartMcpServer"
    | "autoApprovalSettings";
  text?: string;
  askResponse?: ReclineAskResponse;
  apiConfiguration?: ApiConfiguration;
  images?: string[];
  bool?: boolean;
  autoApprovalSettings?: AutoApprovalSettings;
}

export type ReclineAskResponse = "yesButtonClicked" | "noButtonClicked" | "messageResponse";
