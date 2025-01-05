import type { ReclineOrchestrator } from "./ReclineOrchestrator";

import os from "node:os";
import * as path from "node:path";

import * as vscode from "vscode";

import { listFiles } from "../services/fd";
import { arePathsEqual, getReadablePath } from "../utils/path";
import { getCachedEnvironmentInfo } from "../integrations/workspace/environment-cache";

import { formatResponse } from "./prompts/responses";


export class ReclineEnvironment {

  getCwd = (): string => {
    return vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath).at(0) ?? path.join(os.homedir(), "Desktop");
  };

  constructor(private readonly recline: ReclineOrchestrator) {}

  async getEnvironmentDetails(includeFileDetails: boolean = false): Promise<string> {
    // Get environment info from cache
    const envInfo = await getCachedEnvironmentInfo();
    let details = "";

    // Add detected environment information if available
    if (envInfo.python != null || envInfo.javascript) {
      details += "\n\n# Development Environment";
      if (envInfo.python != null) {
        details += `\nPython Environment: ${envInfo.python}`;
      }
      if (envInfo.javascript) {
        const js = envInfo.javascript;
        if (js.nodeVersion != null) {
          details += `\nNode.js Version: ${js.nodeVersion}`;
        }
        if (js.typescript) {
          details += `\nTypeScript Version: ${js.typescript.version}`;
        }
        if ((js.packageManagers?.length ?? 0) > 0) {
          details += "\nPackage Managers:";
          js.packageManagers!.forEach((pm) => {
            details += `\n  ${pm.name} ${pm.version}`;
            if (pm.globalPackages.length > 0) {
              details += `\n    Global packages: ${pm.globalPackages.join(", ")}`;
            }
          });
        }
      }
    }

    // It could be useful for recline to know if the user went from one or no file to another between messages, so we always include this context
    details += "\n\n# VSCode Visible Files";
    const visibleFiles = vscode.window.visibleTextEditors
      ?.map(editor => editor.document?.uri?.fsPath)
      .filter(Boolean)
      .map(absolutePath => path.relative(this.getCwd(), absolutePath).toPosix())
      .join("\n");
    if (visibleFiles) {
      details += `\n${visibleFiles}`;
    }
    else {
      details += "\n(No visible files)";
    }

    details += "\n\n# VSCode Open Tabs";
    const openTabs = vscode.window.tabGroups.all
      .flatMap(group => group.tabs)
      .map(tab => (tab.input as vscode.TabInputText)?.uri?.fsPath)
      .filter(Boolean)
      .map(absolutePath => path.relative(this.getCwd(), absolutePath).toPosix())
      .join("\n");
    if (openTabs) {
      details += `\n${openTabs}`;
    }
    else {
      details += "\n(No open tabs)";
    }

    const busyTerminals = this.recline.toolsManager.terminalManager.getTerminals(true);
    const inactiveTerminals = this.recline.toolsManager.terminalManager.getTerminals(false);
    // const allTerminals = [...busyTerminals, ...inactiveTerminals]

    if (busyTerminals.length > 0 && this.recline.stateManager.didEditFile) {
      //  || this.didEditFile
      await delay(300); // delay after saving file to let terminals catch up
    }

    // let terminalWasBusy = false
    if (busyTerminals.length > 0) {
      // wait for terminals to cool down
      // terminalWasBusy = allTerminals.some((t) => this.terminalManager.isProcessHot(t.id))
      await pWaitFor(
        () => busyTerminals.every(t => !this.recline.toolsManager.terminalManager.isProcessHot(t.id)),
        {
          interval: 100,
          timeout: 15_000
        }
      ).catch(() => {});
    }

    // we want to get diagnostics AFTER terminal cools down for a few reasons: terminal could be scaffolding a project, dev servers (compilers like webpack) will first re-compile and then send diagnostics, etc
    /*
    let diagnosticsDetails = ""
    const diagnostics = await this.diagnosticsMonitor.getCurrentDiagnostics(this.didEditFile || terminalWasBusy) // if recline ran a command (ie npm install) or edited the workspace then wait a bit for updated diagnostics
    for (const [uri, fileDiagnostics] of diagnostics) {
      const problems = fileDiagnostics.filter((d) => d.severity === vscode.DiagnosticSeverity.Error)
      if (problems.length > 0) {
        diagnosticsDetails += `\n## ${path.relative(cwd, uri.fsPath)}`
        for (const diagnostic of problems) {
          // let severity = diagnostic.severity === vscode.DiagnosticSeverity.Error ? "Error" : "Warning"
          const line = diagnostic.range.start.line + 1 // VSCode lines are 0-indexed
          const source = diagnostic.source ? `[${diagnostic.source}] ` : ""
          diagnosticsDetails += `\n- ${source}Line ${line}: ${diagnostic.message}`
        }
      }
    }
    */
    this.recline.stateManager.didEditFile = false; // reset, this lets us know when to wait for saved files to update terminals

    // waiting for updated diagnostics lets terminal output be the most up-to-date possible
    let terminalDetails = "";
    if (busyTerminals.length > 0) {
      // terminals are cool, let's retrieve their output
      terminalDetails += "\n\n# Actively Running Terminals";
      for (const busyTerminal of busyTerminals) {
        terminalDetails += `\n## Original command: \`${busyTerminal.lastCommand}\``;
        const newOutput = this.recline.toolsManager.terminalManager.getUnretrievedOutput(busyTerminal.id);
        if (newOutput) {
          terminalDetails += `\n### New Output\n${newOutput}`;
        }
        else {
          // details += `\n(Still running, no new output)` // don't want to show this right after running the command
        }
      }
    }
    // only show inactive terminals if there's output to show
    if (inactiveTerminals.length > 0) {
      const inactiveTerminalOutputs = new Map<number, string>();
      for (const inactiveTerminal of inactiveTerminals) {
        const newOutput = this.recline.toolsManager.terminalManager.getUnretrievedOutput(inactiveTerminal.id);
        if (newOutput) {
          inactiveTerminalOutputs.set(inactiveTerminal.id, newOutput);
        }
      }
      if (inactiveTerminalOutputs.size > 0) {
        terminalDetails += "\n\n# Inactive Terminals";
        for (const [terminalId, newOutput] of inactiveTerminalOutputs) {
          const inactiveTerminal = inactiveTerminals.find(t => t.id === terminalId);
          if (inactiveTerminal) {
            terminalDetails += `\n## ${inactiveTerminal.lastCommand}`;
            terminalDetails += `\n### New Output\n${newOutput}`;
          }
        }
      }
    }

    // details += "\n\n# VSCode Workspace Errors"
    // if (diagnosticsDetails) {
    // 	details += diagnosticsDetails
    // } else {
    // 	details += "\n(No errors detected)"
    // }

    if (terminalDetails) {
      details += terminalDetails;
    }

    if (includeFileDetails) {
      details += `\n\n# Current Working Directory (${this.getCwd().toPosix()}) Files\n`;
      const isDesktop = arePathsEqual(this.getCwd(), path.join(os.homedir(), "Desktop"));
      if (isDesktop) {
        // don't want to immediately access desktop since it would show permission popup
        details += "(Desktop files not shown automatically. Use list_files to explore if needed.)";
      }
      else {
        const [files, didHitLimit] = await listFiles(this.getCwd(), {
          recursive: true,
          limit: 200
        });
        const result = formatResponse.formatFilesList(this.getCwd(), files, didHitLimit);
        details += result;
      }
    }

    return `<environment_details>\n${details.trim()}\n</environment_details>`;
  }

  async loadContext(userContent: UserContent, includeFileDetails: boolean = false): Promise<void> {
    return Promise.all([
      // Process userContent array, which contains various block types:
      // TextBlockParam, ImageBlockParam, ToolUseBlockParam, and ToolResultBlockParam.
      // We need to apply parseMentions() to:
      // 1. All TextBlockParam's text (first user message with task)
      // 2. ToolResultBlockParam's content/context text arrays if it contains "<feedback>" (see formatToolDeniedFeedback, attemptCompletion, executeCommand, and consecutiveMistakeCount >= 3) or "<answer>" (see askFollowupQuestion), we place all user generated content in these tags so they can effectively be used as markers for when we should parse mentions)
      Promise.all(
        userContent.map(async (block) => {
          if (block.type === "text") {
            return {
              ...block,
              text: await parseMentions(block.text, this.getCwd())
            };
          }
          else if (block.type === "tool_result") {
            const isUserMessage = (text: string) => text.includes("<feedback>") || text.includes("<answer>");
            if (typeof block.content === "string" && isUserMessage(block.content)) {
              return {
                ...block,
                content: await parseMentions(block.content, this.getCwd())
              };
            }
            else if (Array.isArray(block.content)) {
              const parsedContent = await Promise.all(
                block.content.map(async (contentBlock) => {
                  if (contentBlock.type === "text" && isUserMessage(contentBlock.text)) {
                    return {
                      ...contentBlock,
                      text: await parseMentions(contentBlock.text, this.getCwd())
                    };
                  }
                  return contentBlock;
                })
              );
              return {
                ...block,
                content: parsedContent
              };
            }
          }
          return block;
        })
      ),
      this.getEnvironmentDetails(includeFileDetails)
    ]);
  }
}
