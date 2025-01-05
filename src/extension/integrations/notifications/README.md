# VS Code Notifications

This module provides a consistent interface for showing VS Code notifications following the [VS Code Notification Guidelines](https://code.visualstudio.com/api/ux-guidelines/notifications).

## Basic Usage

```typescript
import { showError, showInfo, showWarning } from "./notifications";

// Simple information message
await showInfo({
  message: "Operation completed successfully"
});

// Warning with title
await showWarning({
  title: "Configuration",
  message: "Some settings need to be updated"
});

// Error with actions
const result = await showError({
  title: "Build Failed",
  message: "Unable to compile project",
  actions: ["Retry", "Show Logs", "Cancel"]
});

// Handle user action
if (result === "Retry") {
  // Handle retry
}
else if (result === "Show Logs") {
  // Show logs
}
```

## Modal Dialogs

Use modal dialogs when immediate user attention is required:

```typescript
const result = await showWarning({
  title: "File Modified",
  message: "Save changes before closing?",
  actions: ["Save", "Don't Save", "Cancel"],
  modal: true
});
```

## Progress Notifications

Show progress for long-running operations:

```typescript
await withProgress("Building project", async (progress) => {
  progress.report({ message: "Compiling..." });
  await compile();

  progress.report({ message: "Running tests..." });
  await runTests();

  return buildResult;
});
```

## Input and Selection

Get user input:

```typescript
// Text input
const name = await showInputBox({
  prompt: "Enter your name",
  placeHolder: "John Doe"
});

// Quick pick selection
const choice = await showQuickPick(
  ["Option 1", "Option 2", "Option 3"],
  { placeHolder: "Select an option" }
);
```

## Best Practices

1. Use notifications sparingly to respect user attention
2. Keep messages clear and concise
3. Use appropriate notification types:
   - Information: Successful operations, neutral information
   - Warning: Important messages that need attention
   - Error: Failed operations, critical issues
4. Provide actions when the user can take meaningful steps
5. Use modal dialogs only when immediate user input is required
6. Keep progress notifications updated with specific status messages
7. Always handle action results appropriately
