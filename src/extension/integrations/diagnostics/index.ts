import * as path from "node:path";

import * as vscode from "vscode";
import { isEqual } from "es-toolkit";


type FileDiagnostics = [vscode.Uri, vscode.Diagnostic[]][];

/**
 * Monitors workspace diagnostics and provides utilities for comparing and formatting them.
 * Combines real-time monitoring with pure functional comparison and formatting.
 */
export class DiagnosticsMonitor {
  private diagnosticsChangeEmitter: vscode.EventEmitter<FileDiagnostics> = new vscode.EventEmitter<FileDiagnostics>();
  private disposables: vscode.Disposable[] = [];
  private lastDiagnostics: FileDiagnostics = [];

  constructor() {
    // Listen for diagnostic changes and emit the new diagnostics
    this.disposables.push(
      vscode.languages.onDidChangeDiagnostics(() => {
        const currentDiagnostics = this.getDiagnostics();
        // Only emit if diagnostics actually changed
        if (!isEqual(this.lastDiagnostics, currentDiagnostics)) {
          this.lastDiagnostics = currentDiagnostics;
          this.diagnosticsChangeEmitter.fire(currentDiagnostics);
        }
      })
    );
  }

  /**
   * Determines appropriate timeout based on diagnostic state.
   */
  private determineTimeout(diagnostics: FileDiagnostics): number {
    const hasErrors = diagnostics.some(([_, diags]) =>
      diags.some(d => d.severity === vscode.DiagnosticSeverity.Error)
    );
    // Longer timeout when errors exist as they might take longer to resolve
    return hasErrors ? 10_000 : 300;
  }

  /**
   * Gets current diagnostics, filtered to only include errors.
   */
  private getDiagnostics(): FileDiagnostics {
    return vscode.languages.getDiagnostics()
      .filter(([_, diagnostics]) =>
        diagnostics.some(d => d.severity === vscode.DiagnosticSeverity.Error)
      )
      .map(([uri, diagnostics]) => [
        uri,
        diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error)
      ]);
  }

  /**
   * Gets a human-readable label for diagnostic severity.
   */
  private getSeverityLabel(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return "Error";
      case vscode.DiagnosticSeverity.Warning:
        return "Warning";
      case vscode.DiagnosticSeverity.Information:
        return "Information";
      case vscode.DiagnosticSeverity.Hint:
        return "Hint";
      default:
        return "Diagnostic";
    }
  }

  /**
   * Waits for updated diagnostics with a timeout.
   */
  private async waitForUpdatedDiagnostics(timeout: number): Promise<FileDiagnostics> {
    return new Promise<FileDiagnostics>((resolve) => {
      const timer = setTimeout(() => {
        cleanup();
        const finalDiagnostics = this.getDiagnostics();
        this.lastDiagnostics = finalDiagnostics;
        resolve(finalDiagnostics);
      }, timeout);

      const disposable = this.diagnosticsChangeEmitter.event((newDiagnostics) => {
        cleanup();
        this.lastDiagnostics = newDiagnostics;
        resolve(newDiagnostics);
      });

      const cleanup = () => {
        clearTimeout(timer);
        disposable.dispose();
      };
    });
  }

  public dispose() {
    this.disposables.forEach(d => d.dispose());
    this.disposables = [];
    this.diagnosticsChangeEmitter.dispose();
  }

  /**
   * Formats diagnostics into a human-readable string.
   */
  public formatDiagnostics(
    diagnostics: FileDiagnostics,
    severities: vscode.DiagnosticSeverity[],
    cwd: string
  ): string {
    let result = "";

    for (const [uri, fileDiagnostics] of diagnostics) {
      const problems = fileDiagnostics.filter(d => severities.includes(d.severity));
      if (problems.length > 0) {
        result += `\n\n${path.relative(cwd, uri.fsPath)}`;

        for (const diagnostic of problems) {
          const label = this.getSeverityLabel(diagnostic.severity);
          const line = diagnostic.range.start.line + 1;
          const source = diagnostic.source ? `${diagnostic.source} ` : "";
          result += `\n- [${source}${label}] Line ${line}: ${diagnostic.message}`;
        }
      }
    }

    return result.trim();
  }

  /**
   * Gets the current diagnostics, optionally waiting for changes if requested.
   */
  public async getCurrentDiagnostics(shouldWaitForChanges: boolean): Promise<FileDiagnostics> {
    const currentDiagnostics = this.getDiagnostics();

    if (!shouldWaitForChanges) {
      this.lastDiagnostics = currentDiagnostics;
      return currentDiagnostics;
    }

    // If diagnostics changed since last check, return immediately
    if (!isEqual(this.lastDiagnostics, currentDiagnostics)) {
      this.lastDiagnostics = currentDiagnostics;
      return currentDiagnostics;
    }

    // Determine appropriate timeout based on current diagnostic state
    const timeout = this.determineTimeout(currentDiagnostics);
    return this.waitForUpdatedDiagnostics(timeout);
  }

  /**
   * Gets new diagnostics by comparing old and new states.
   */
  public getNewDiagnostics(oldDiagnostics: FileDiagnostics, newDiagnostics: FileDiagnostics): FileDiagnostics {
    const newProblems: FileDiagnostics = [];
    const oldMap = new Map(oldDiagnostics);

    for (const [uri, newDiags] of newDiagnostics) {
      const oldDiags = oldMap.get(uri) || [];
      const newProblemsForUri = newDiags.filter(
        newDiag => !oldDiags.some(oldDiag => isEqual(oldDiag, newDiag))
      );

      if (newProblemsForUri.length > 0) {
        newProblems.push([uri, newProblemsForUri]);
      }
    }

    return newProblems;
  }
}

// Create a singleton instance and export it
const diagnosticsMonitor = new DiagnosticsMonitor();
export default diagnosticsMonitor;
