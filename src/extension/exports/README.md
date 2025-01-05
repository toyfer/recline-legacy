# Recline API

The Recline extension exposes an API that can be used by other extensions. To use this API in your extension:

1. Copy `src/extension-api/recline.d.ts` to your extension's source directory.
2. Include `recline.d.ts` in your extension's compilation.
3. Get access to the API with the following code:

```ts
const reclineExtension = vscode.extensions.getExtension<ReclineAPI>("julesmons.recline");

if (!reclineExtension?.isActive) {
  throw new Error("Recline extension is not activated");
}

const recline = reclineExtension.exports;

if (recline) {
  // Now you can use the API

  // Set custom instructions
  await recline.setCustomInstructions("Talk like a pirate");

  // Get custom instructions
  const instructions = await recline.getCustomInstructions();
  console.log("Current custom instructions:", instructions);

  // Start a new task with an initial message
  await recline.startNewTask("Hello, Recline! Let's make a new project...");

  // Start a new task with an initial message and images
  await recline.startNewTask("Use this design language", ["data:image/webp;base64,..."]);

  // Send a message to the current task
  await recline.sendMessage("Can you fix the problems?");

  // Simulate pressing the primary button in the chat interface (e.g. 'Save' or 'Proceed While Running')
  await recline.pressPrimaryButton();

  // Simulate pressing the secondary button in the chat interface (e.g. 'Reject')
  await recline.pressSecondaryButton();
}
else {
  console.error("Recline API is not available");
}
```
**Note:** To ensure that the `julesmons.recline` extension is activated before your extension, add it to the `extensionDependencies` in your `package.json`:

```json
{
  "extensionDependencies": [
    "julesmons.recline"
  ]
}
```

For detailed information on the available methods and their usage, refer to the `recline.d.ts` file.
