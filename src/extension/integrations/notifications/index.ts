import * as vscode from "vscode";


interface NotificationAction {
  title: string;
  callback: () => void | Promise<void>;
}

interface NotificationOptions {
  title?: string;
  subtitle?: string;
  message: string;
  type?: "info" | "warning" | "error"; // Type of notification to show
  modal?: boolean; // Whether to show as modal dialog (for immediate user attention)
  actions?: NotificationAction[]; // Optional actions for the notification
  doNotShowAgainKey?: string; // Unique key to store "Don't Show Again" preference
}

/**
 * Shows a system notification using VSCode's native API
 * Following VSCode guidelines:
 * - Use modal dialogs only for immediate user attention
 * - Support "Don't Show Again" for repeated notifications
 * - Allow actions for user interaction
 * - Show either error or info notifications based on context
 *
 * @param context VSCode extension context for storing preferences
 * @param options Configuration for the notification
 */
export async function showSystemNotification(
  context: vscode.ExtensionContext,
  options: NotificationOptions
): Promise<void> {
  try {
    const {
      title = "Recline",
      subtitle,
      message,
      type = "info",
      modal = false,
      actions = [],
      doNotShowAgainKey
    } = options;

    if (!message) {
      throw new Error("Message is required");
    }

    // Check if notification should be suppressed
    if (doNotShowAgainKey && context.globalState.get(`notification.${doNotShowAgainKey}.suppress`)) {
      return;
    }

    const fullMessage = subtitle ? `${subtitle}\n${message}` : message;

    // Prepare notification items including actions and "Don't Show Again"
    const items: vscode.MessageItem[] = [
      ...actions.map(action => ({
        title: action.title,
        isCloseAffordance: false
      }))
    ];

    // Only add "Don't Show Again" for non-modal notifications with a storage key
    if (!modal && doNotShowAgainKey) {
      items.push({
        title: "Don't Show Again",
        isCloseAffordance: true
      });
    }

    // Show notification using VSCode's native system notification API
    let notificationFn: typeof vscode.window.showInformationMessage;
    switch (type) {
      case "error":
        notificationFn = vscode.window.showErrorMessage;
        break;
      case "warning":
        notificationFn = vscode.window.showWarningMessage;
        break;
      case "info":
      default:
        notificationFn = vscode.window.showInformationMessage;
    }

    const selection = await notificationFn(
      fullMessage,
      {
        modal,
        detail: title
      },
      ...items
    );

    // Handle selection
    if (selection) {
      if (selection.title === "Don't Show Again" && doNotShowAgainKey) {
        await context.globalState.update(`notification.${doNotShowAgainKey}.suppress`, true);
      }
      else {
        // Find and execute the matching action callback
        const action = actions.find(a => a.title === selection.title);
        if (action) {
          await action.callback();
        }
      }
    }
  }
  catch (error) {
    console.error("Could not show system notification", error);
  }
}
