import type { TerminalInfo } from "./TerminalRegistry";

import * as vscode from "vscode";
import pWaitFor from "p-wait-for";

import { arePathsEqual } from "../../utils/path";

import { TerminalProcess } from "./TerminalProcess";
import { TerminalRegistry } from "./TerminalRegistry";


const SHELL_INTEGRATION_TIMEOUT = 4000;

export class TerminalManager {
  private disposables: vscode.Disposable[] = [];
  private readonly registry = TerminalRegistry.getInstance();
  private terminalIds: Set<number> = new Set();
  private terminalProcesses: Map<number, TerminalProcess> = new Map();

  constructor() {
    this.setupShellIntegrationHandler();
  }

  private async executeCommand(
    terminalProcess: TerminalProcess,
    terminalInfo: TerminalInfo,
    command: string
  ): Promise<AsyncGenerator<string>> {

    await this.waitForShellIntegration(terminalInfo.terminal);
    return terminalProcess.run(terminalInfo.terminal, command);
  }

  private findAvailableTerminal(cwd: string): TerminalInfo | undefined {
    return this.registry.getAllTerminals().find((terminal: TerminalInfo) => {
      if (terminal.busy) {
        return false;
      }

      const terminalCwd = terminal.terminal.shellIntegration?.cwd;
      if (!terminalCwd) {
        return false;
      }

      return arePathsEqual(vscode.Uri.file(cwd).fsPath, terminalCwd.fsPath);
    });
  }

  private handleNoShellIntegration(terminalId: number): void {
    console.warn(`Shell integration not available for terminal ${terminalId}`);
    this.registry.removeTerminal(terminalId);
    this.terminalIds.delete(terminalId);
    this.terminalProcesses.delete(terminalId);
  }

  private setupShellIntegrationHandler(): void {
    try {
      const disposable = vscode.window.onDidStartTerminalShellExecution?.(
        async e => e?.execution?.read()
      );
      if (disposable != null) {
        this.disposables.push(disposable);
      }
    }
    catch (error) {
      console.warn("Shell integration setup failed:", error);
    }
  }

  private async waitForShellIntegration(terminal: vscode.Terminal): Promise<void> {

    const hasShellIntegration = terminal.shellIntegration !== undefined;
    if (!hasShellIntegration) {
      try {
        await pWaitFor(
          () => terminal.shellIntegration !== undefined,
          { timeout: SHELL_INTEGRATION_TIMEOUT }
        );
      }
      catch (error) {
        console.warn("Shell integration timeout:", error);
      }
    }
  }

  private async *wrapterminalProcessOutput(
    terminalProcess: TerminalProcess,
    generator: AsyncGenerator<string>,
    terminalInfo: TerminalInfo
  ): AsyncGenerator<string> {
    try {
      yield * generator;
    }
    catch (error) {
      if (error instanceof Error && error.message === "No shell integration available") {
        this.handleNoShellIntegration(terminalInfo.id);
      }
      else {
        throw error;
      }
    }
    finally {
      terminalInfo.busy = false;
    }
  }

  continueterminalProcess(terminalId: number): void {
    this.terminalProcesses.get(terminalId)?.continue();
  }

  disposeAll(): void {
    this.terminalIds.clear();
    this.terminalProcesses.clear();

    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.disposables = [];
  }

  async getOrCreateTerminal(cwd: string): Promise<TerminalInfo> {
    const availableTerminal = this.findAvailableTerminal(cwd);
    if (availableTerminal) {
      this.terminalIds.add(availableTerminal.id);
      return availableTerminal;
    }

    const newTerminalInfo = this.registry.createTerminal(cwd);
    this.terminalIds.add(newTerminalInfo.id);
    return newTerminalInfo;
  }

  getTerminals(busy: boolean): Array<{ id: number; lastCommand: string }> {
    return Array.from(this.terminalIds)
      .map(id => this.registry.getTerminal(id))
      .filter((t): t is TerminalInfo => t !== undefined && t.busy === busy)
      .map(({ id, lastCommand }) => ({ id, lastCommand }));
  }

  getUnretrievedOutput(terminalId: number): string {
    if (!this.terminalIds.has(terminalId)) {
      return "";
    }
    const terminalProcess = this.terminalProcesses.get(terminalId);
    return terminalProcess ? terminalProcess.getUnretrievedOutput() : "";
  }

  async runCommand(terminalInfo: TerminalInfo, command: string): Promise<AsyncGenerator<string>> {
    terminalInfo.busy = true;
    terminalInfo.lastCommand = command;

    const terminalProcess = new TerminalProcess();
    this.terminalProcesses.set(terminalInfo.id, terminalProcess);

    const outputGenerator = await this.executeCommand(terminalProcess, terminalInfo, command);
    return this.wrapterminalProcessOutput(terminalProcess, outputGenerator, terminalInfo);
  }
}
