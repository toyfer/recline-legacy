import type { ReclineProvider } from "@extension/core/webview/ReclineProvider";

import * as path from "node:path";

import * as vscode from "vscode";

import { listFiles } from "@extension/services/fd";
import { workspaceRoot } from "@extension/constants";


interface WorkspaceUpdate {
  type: "workspaceUpdated";
  filePaths: string[];
}

/**
 * Tracks workspace file changes and maintains an up-to-date file list.
 * Handles file creation, deletion, and renaming events.
 */
class WorkspaceTracker {
  private readonly disposables: vscode.Disposable[] = [];
  private readonly filePaths = new Set<string>();
  private readonly pendingUpdates = new Set<Promise<void>>();
  private readonly provider: ReclineProvider;
  private updateDebounceTimeout?: NodeJS.Timeout;

  constructor(provider: ReclineProvider) {
    this.provider = provider;
    this.registerListeners();
  }

  /**
   * Add a file path to tracking
   */
  private async addFilePath(filePath: string): Promise<void> {
    const normalizedPath = this.normalizeFilePath(filePath);

    try {
      const uri = vscode.Uri.file(normalizedPath);
      const stat = await vscode.workspace.fs.stat(uri);
      const isDirectory = (stat.type & vscode.FileType.Directory) !== 0;

      this.filePaths.add(
        isDirectory
          ? this.ensureProperSlashes(`${normalizedPath}/`)
          : this.ensureProperSlashes(normalizedPath)
      );
    }
    catch (error) {
      // Handle case where stat fails (e.g., for newly created files)
      this.filePaths.add(this.ensureProperSlashes(normalizedPath));
      console.warn(`Failed to stat path ${normalizedPath}:`, error);
    }
  }

  /**
   * Ensure proper slash handling for paths
   */
  private ensureProperSlashes(filePath: string): string {
    const normalized = filePath.replace(/\\/g, "/");
    return normalized.endsWith("/") ? normalized : normalized;
  }

  /**
   * Handle file operations and schedule workspace update
   */
  private async handleFileOperations(operations: Promise<void>[]): Promise<void> {
    try {
      await Promise.all(operations);
      await this.scheduleWorkspaceUpdate();
    }
    catch (error) {
      console.error("Error handling file operations:", error);
    }
  }

  /**
   * Normalize file path with proper directory handling
   */
  private normalizeFilePath(filePath: string): string {
    if (workspaceRoot == null || workspaceRoot.length === 0) {
      return path.resolve(filePath);
    }

    // Ensure path is absolute and normalized
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(workspaceRoot, filePath);

    return path.normalize(absolutePath);
  }

  /**
   * Handle file creation events
   */
  private async onFilesCreated(event: vscode.FileCreateEvent): Promise<void> {
    const updates = event.files.map(async file =>
      this.trackOperation(this.addFilePath(file.fsPath))
    );
    await this.handleFileOperations(updates);
  }

  /**
   * Handle file deletion events
   */
  private async onFilesDeleted(event: vscode.FileDeleteEvent): Promise<void> {
    const updates = event.files.map(async file =>
      this.trackOperation(this.removeFilePath(file.fsPath))
    );
    await this.handleFileOperations(updates);
  }

  /**
   * Handle file rename events
   */
  private async onFilesRenamed(event: vscode.FileRenameEvent): Promise<void> {
    const updates = event.files.map(async file =>
      this.trackOperation(
        Promise.all([
          this.removeFilePath(file.oldUri.fsPath),
          this.addFilePath(file.newUri.fsPath)
        ])
      ).then(() => undefined)
    );
    await this.handleFileOperations(updates);
  }

  /**
   * Register workspace file system event listeners
   */
  private registerListeners(): void {
    // Use arrow functions to preserve 'this' context
    this.disposables.push(
      vscode.workspace.onDidCreateFiles(async e => this.onFilesCreated(e)),
      vscode.workspace.onDidDeleteFiles(async e => this.onFilesDeleted(e)),
      vscode.workspace.onDidRenameFiles(async e => this.onFilesRenamed(e))
    );
  }

  /**
   * Remove a file path from tracking
   */
  private async removeFilePath(filePath: string): Promise<void> {
    const normalizedPath = this.normalizeFilePath(filePath);
    const withSlash = this.ensureProperSlashes(`${normalizedPath}/`);
    const withoutSlash = this.ensureProperSlashes(normalizedPath);

    this.filePaths.delete(withSlash);
    this.filePaths.delete(withoutSlash);
  }

  /**
   * Schedule a debounced workspace update
   */
  private async scheduleWorkspaceUpdate(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (this.updateDebounceTimeout) {
        clearTimeout(this.updateDebounceTimeout);
      }

      this.updateDebounceTimeout = setTimeout(
        async (): Promise<void> => {
        // Wait for any pending operations to complete
          if (this.pendingUpdates.size > 0) {
            await Promise.all(this.pendingUpdates);
          }
          await this.workspaceDidUpdate();
          resolve();
        },
        100
      ); // Debounce updates by 100ms
    });
  }

  /**
   * Track operation and add to pending updates
   */
  private async trackOperation<T>(operation: Promise<T>): Promise<void> {
    const tracked = operation
      .then(() => undefined)
      .finally(() => {
        this.pendingUpdates.delete(tracked);
      });
    this.pendingUpdates.add(tracked);
    return tracked;
  }

  /**
   * Notify webview of workspace updates
   */
  private async workspaceDidUpdate(): Promise<void> {
    if (workspaceRoot == null || workspaceRoot.length === 0) {
      return;
    }

    try {
      const update: WorkspaceUpdate = {
        type: "workspaceUpdated",
        filePaths: Array.from(this.filePaths).map((file) => {
          const relativePath = path.relative(workspaceRoot!, file);
          return this.ensureProperSlashes(relativePath);
        })
      };

      await this.provider.postMessageToWebview(update);
    }
    catch (error) {
      console.error("Failed to send workspace update:", error);
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    if (this.updateDebounceTimeout) {
      clearTimeout(this.updateDebounceTimeout);
    }

    for (const disposable of this.disposables) {
      disposable.dispose();
    }

    this.filePaths.clear();
    this.pendingUpdates.clear();
  }

  /**
   * Initialize the file path tracking system
   */
  public async initializeFilePaths(): Promise<void> {
    // Skip initialization if no workspace is selected
    if (workspaceRoot == null || workspaceRoot.length === 0) {
      return;
    }

    try {
      const [files, hasMore] = await listFiles(workspaceRoot, {
        recursive: true,
        limit: 1_000
      });

      if (hasMore) {
        console.warn("Workspace file listing truncated due to size limit");
      }

      // Process all files in batches to avoid blocking
      const batchSize = 100;
      for (let i = 0; i < files.length; i += batchSize) {
        const batch = files.slice(i, i + batchSize);
        await Promise.all(batch.map(async file => this.addFilePath(file)));
      }

      await this.scheduleWorkspaceUpdate();
    }
    catch (error) {
      console.error("Failed to initialize file paths:", error);
      // Still attempt to register listeners even if initial scan fails
    }
  }
}

export default WorkspaceTracker;
