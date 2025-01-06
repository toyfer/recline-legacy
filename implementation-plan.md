**implementation-plan.md**

---
# High-Level Refactor & Modularization Roadmap

The goal is to split

Recline.ts

 into multiple maintainable and focused modules, retaining all features and functionality, improving performance, and moving toward an event-driven stack via [mitt](https://www.npmjs.com/package/mitt). All modules will be wired together through:
1. **ReclineOrchestrator:** Gateway to the entire feature set (drop-in replacement).
2. **ReclineToolOrchestrator:** Orchestrates tool usage (tools are classes implementing an interface).

Below is a phased plan to ensure every existing feature, method, and nuance is captured and properly integrated.

---

## Phase 1: Project Structure & Preparation

1. **Create Folders for Separation**
   - `src/extension/recline/orchestrator` (for `ReclineOrchestrator` and `ReclineToolOrchestrator`)
   - `src/extension/recline/modules` (for new modules: e.g., `ConversationModule`, `TaskModule`, `TerminalModule`, etc.)
   - `src/extension/recline/tools` (for tool classes: each implementing an abstract class or interface)
   - `src/extension/recline/events` (for event bus / mitt setup)

2. **Introduce an Event Emitter**
   - Add a minimal `EventBus` wrapper around `mitt()`:
     ```ts
     // filepath: /path/to/src/extension/recline/events/EventBus.ts
     import mitt from "mitt";

     tinterface Events {
       taskAborted: undefined;
       // more events as needed
     }

     export const eventBus = mitt<Events>();
     ```
   - Replace the numerous `didSomething` /

didEditFile

 /

didAlreadyUseTool

 booleans with event emissions and event listeners.

3. **Interface & Abstract Class Conventions**
   - Tools will follow an abstract class for consistency:
     ```ts
     // filepath: /path/to/src/extension/recline/tools/BaseReclineTool.ts
     import { z } from "zod";

     export abstract class BaseReclineTool {
       abstract paramSchema: z.ZodSchema<any>;
       abstract execute(validatedParams: any): Promise<string | void>;

       validateParams(params: unknown) {
         return this.paramSchema.parse(params);
       }
     }
     ```

---

## Phase 2: Core Modules Extraction

Each of the large functionalities in

Recline.ts

 becomes its own module to keep logic cohesive and maintainable:

1. **ConversationModule**
   - Maintains:
     -

apiConversationHistory


     - Methods:

saveApiConversationHistory

,

getSavedApiConversationHistory

,

overwriteApiConversationHistory

, etc.
     - Logic that deals with streaming, chunking.
   - Exposes minimal methods to load, update, and manage conversation history.

2. **ReclineMessagesModule**
   - Handles:
     -

reclineMessages

,

saveReclineMessages

,

getSavedReclineMessages

,

addToReclineMessages

, etc.
     - Methods for updating user/assistant messages plus reading from disk.
   - Possibly merges with `ConversationModule` if it’s simpler, but can remain separate for clarity.

3. **TaskModule**
   - Manages the overall “task loop” from

initiateTaskLoop

,

resumeTaskFromHistory

,

startTask

,

abortTask

, etc.
   - Plans calls to other modules (like conversation or tool usage).
   - Notifies other modules via event bus when tasks start, stop, or resume.

4. **TerminalModule**
   - Responsible for

terminalManager

,

executeCommandTool

, and related terminal logic.
   - Manages creation, disposal, and concurrency of terminals.
   - Exposes methods for running commands, retrieving output, etc.
   - Raises events such as `commandExecutionLaunched`, `commandExecutionCompleted` for better decoupling.

5. **DiffModule**
   - Responsible for

diffViewProvider

 logic, rolling back changes if an operation is aborted, etc.
   - Exposes methods like

revertChanges

, `showDiff`, etc.
   - Tracks changes, file modifications, and triggers events such as `diffModified` or `diffReverted`.

6. **BrowserSessionModule**
   - Isolates the

browserSession

 (previously in

Recline.ts

).
   - Manages events like `browserSessionStarted`, `browserSessionClosed`, etc.
   - Provides abstracted methods for quickly launching, closing, reusing browser sessions.

7. **EnvironmentModule**
   - Encapsulates code that fetches environment details:
     - “VSCode Visible Files”, “Open Tabs”, “Terminals in use,” etc.
   - Possibly includes logic for environment snapshots or advanced environment queries.
   - Minimizes duplication across modules that need environment info.

8. **ApiRequestModule**
   - Focuses on generating system prompts, creating messages for the model.
   - Contains

attemptApiRequest

,

createMessage

, etc.
   - Interacts with an external LLM via

api

 field in the new orchestrator.
   - Responsible for partial stream handling, context window limits, etc.

9. **Event-Driven Booleans Removal**  
   - Confirm every legacy boolean (e.g. `didEditFile`, `didAlreadyUseTool`) is replaced with events.  
   - Emphasize consistent naming for events (e.g. `fileEdited`, `toolUsed`).  
   - Each module publishes or subscribes to events instead of toggling booleans.

In each module, ensure all relevant logic (including any references to booleans or partial states) is replaced with events or local state. All blocks that appear inside

Recline.ts

 are combed out into these modules, preserving functionality.

---

## Phase 3: Orchestration Layers

### 3.1 ReclineOrchestrator

- **Purpose**: Provides the same methods and signatures as the original

Recline

 class while delegating to the new modules.
- **Responsibilities**: The orchestrator shouldn’t maintain internal booleans or logic—it only coordinates calls and event subscriptions.
- **Example Skeleton**:
  ```ts
  // filepath: /path/to/src/extension/recline/orchestrator/ReclineOrchestrator.ts
  import { TaskModule } from '../modules/TaskModule';
  import { ConversationModule } from '../modules/ConversationModule';
  // ...other imports

  export class ReclineOrchestrator {
    private taskModule: TaskModule;
    private conversationModule: ConversationModule;
    // ...other modules

    constructor(...) {
      // Construct submodules here
      this.taskModule = new TaskModule(...);
      this.conversationModule = new ConversationModule(...);
      // ...
    }

    // Mirror original methods:
    public async startTask(...) {
      return this.taskModule.startTask(...);
    }

    public async abortTask(...) {
      return this.taskModule.abortTask(...);
    }

    // etc...
  }
  ```

- **Events**:
  - Listens to event bus signals, e.g.:
    - `taskAborted` → triggers module cleanup
    - `terminalCompleted` → updates conversation messages

### 3.2 ReclineToolOrchestrator

- **Purpose**: Handles creation, loading, and execution of individual tool classes.
- **Responsibilities**:
  - Maintains a registry or map of all known tools.
  - Provides a single point to call `executeTool(...)` with arguments.
  - Raises standardized events, e.g. `toolExecuted`, `toolFailed`.
- **Skeleton**:
  ```ts
  // filepath: /path/to/src/extension/recline/orchestrator/ReclineToolOrchestrator.ts
  import { BaseReclineTool } from "../tools/BaseReclineTool";

  export class ReclineToolOrchestrator {
    private tools: Record<string, BaseReclineTool> = {};

    reasync executeTool(name: string, params: unknown): Promise<string|void> {
      const tool = this.tools[name];
      if (!tool) throw new Error(`Tool not found: ${name}`);
      const validated = tool.validateParams(params);
      return tool.execute(validated);
    }

    registerTool(name: string, tool: BaseReclineTool) {
      this.tools[name] = tool;
    }
  ```

- Reaffirm that each tool is a class implementing a base abstract:
  - Tools must still remain modular, each with their own validated methods, error handling, etc.
  - Tools should dispatch events (e.g. `toolExecutionStarted`, `toolExecutionFinished`).

---

## Phase 4: Tool Implementation

1. **Create an Abstract Base Tool Class** (`BaseReclineTool` as shown above).
2. **Derive Tools**:
   - Each tool found in the original code (like file I/O, command execution, etc.) becomes its own class.
   - Insert the relevant code from

Recline.ts

 or from the extension’s existing tool logic.
   - For example, a `CommandTool` that uses `TerminalModule` methods, an `EditFileTool` that uses `DiffModule`, etc.

3. **Use Zod** for `validateParams`
   - Example:
     ```ts
     import { z } from "zod";

     import { BaseReclineTool } from "./BaseReclineTool";

     export class CommandExecutionTool extends BaseReclineTool {
       paramSchema = z.object({
         command: z.string(),
         options: z.object({ /* optional fields */ }).optional()
       });

       async execute(validatedParams: { command: string; options?: unknown }) {
         // call TerminalModule to run the command
       }
     }
     ```
4. **Register Tools**
   - In `ReclineToolOrchestrator` constructor or a dedicated method, register all tool classes you have (command, editing, browser, etc.).

### New Tools or Extended Tools
- Ensure new or future tools (like code-formatting or advanced file scan) follow the same abstract contract.
- Integrate event bus: e.g. notify orchestrator when tools succeed or fail.

---

## Phase 5: Event-Driven Replacement of Booleans

1. **Identify All Booleans**
   - For example,

didEditFile

,

didAlreadyUseTool

,

didCompleteReadingStream

, etc.
2. **Emit / Listen**
   - Replace “set boolean” with `eventBus.emit('someEvent')`.
   - Replace “if boolean is true” checks in some method with an `eventBus.on('someEvent', ...)`.
   - Example:
     ```ts
     // Old:
     this.didEditFile = true;

     // New:
     eventBus.emit('"fileEdited";
     ```
3. **Event Mappings**
   - “didEditFile” → `fileEdited`
   - “didAlreadyUseTool” → `toolPreviouslyUsed`
   - For multi-step processes (like streaming partial data), create specialized events, e.g.:
     - `streamChunkReceived`
     - `streamComplete`
- Add a standardized approach for partial data events vs. completion events, ensuring no leftover partial states.

---

## Phase 6: Comprehensive Testing & Integration

1. **Unit Tests**
   - Test each module independently (e.g., `TaskModule.test.ts`, `ConversationModule.test.ts`).
   - Ensure calls in `ReclineOrchestrator` properly delegate to modules.
   - Test the tool orchestrator’s registration, validation, and execution.
2. **Integration Tests**
   - Simulate a typical user flow:
     - Start a task, produce partial messages, use tools, finalize the task, etc.
     - Confirm tasks are saved and resumed correctly.
3. **Regression**
   - Compare functionality from old

Recline.ts

 to new orchestrators and modules to confirm no features are lost.
- Testing must confirm that event-driven calls fully replace booleans. 
- Validate that each tool is correctly registered and orchestrated.

---

## Phase 7: Final Cleanup & Documentation

1. **Remove Obsolete Helpers**
   - Verify any “useless helper functions” are truly not needed.
2. **Refine Comments & Docstrings**
   - Provide short docstrings for each public method.
   - Summarize architecture in a central

README.md

 under `src/extension/recline`.
3. **Ensure DRY**
   - Cross-check for repeated code that can be abstracted into appropriate modules or shared utilities.
- Confirm that code duplication is removed (DRY); rely on shared utility modules or the event bus for repeated logic.  

---

## Conclusion

By following the above plan, the old monolithic

Recline.ts

 will be divided into specialized, well-structured modules. All booleans are replaced with events using mitt, and there is a dedicated orchestrator for core logic (`ReclineOrchestrator`) plus a specialized orchestrator for tool handling (`ReclineToolOrchestrator`). This approach keeps every aspect of the extension maintainable, scalable, and consistent with modern design best practices.
