import type { Mention, MentionContent } from "./types";

import fs from "node:fs/promises";
import * as path from "node:path";

import * as vscode from "vscode";
import { isBinaryFile } from "isbinaryfile";

import diagnosticsMonitor from "@extension/integrations/diagnostics";
import { urlToMarkdown } from "@extension/services/browser/urlToMarkdown";
import { extractTextFromFile } from "@extension/integrations/misc/extract-text";

import { FileAccessError, MentionType, UrlFetchError } from "./types";


export class MentionContentFetcher {

  constructor(private readonly cwd: string) {}

  /**
   * Fetches content for a single mention
   */
  private async fetchSingleMention(mention: Mention): Promise<MentionContent> {
    switch (mention.type) {
      case MentionType.File:
      case MentionType.Folder:
        return {
          mention,
          content: await this.getFileOrFolderContent(mention.value)
        };

      case MentionType.Url:
        try {
          const markdown = await urlToMarkdown(mention.value);
          return { mention, content: markdown };
        }
        catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          throw new UrlFetchError(`Failed to fetch URL content: ${message}`);
        }

      case MentionType.Problems:
        return {
          mention,
          content: this.getWorkspaceProblems()
        };

      default:
        return {
          mention,
          content: `Unsupported mention type: ${mention.type}`
        };
    }
  }

  /**
   * Gets content from a file or folder path
   */
  private async getFileOrFolderContent(mentionPath: string): Promise<string> {
    const absPath = path.resolve(this.cwd, mentionPath);

    try {
      const stats = await fs.stat(absPath);

      if (stats.isFile()) {
        const isBinary = await isBinaryFile(absPath).catch(() => false);
        if (isBinary) {
          return "(Binary file, unable to display content)";
        }
        return await extractTextFromFile(absPath);
      }

      if (stats.isDirectory()) {
        const entries = await fs.readdir(absPath, { withFileTypes: true });
        let folderContent = "";
        const fileContentPromises: Promise<string | undefined>[] = [];

        entries.forEach((entry, index) => {
          const isLast = index === entries.length - 1;
          const linePrefix = isLast ? "└── " : "├── ";

          // Add entry to tree view
          if (entry.isFile()) {
            folderContent += `${linePrefix}${entry.name}\n`;
            const filePath = path.join(mentionPath, entry.name);
            const absoluteFilePath = path.resolve(absPath, entry.name);

            // Queue file content extraction
            fileContentPromises.push(this.tryGetFileContent(absoluteFilePath, filePath));
          }
          else if (entry.isDirectory()) {
            folderContent += `${linePrefix}${entry.name}/\n`;
          }
          else {
            folderContent += `${linePrefix}${entry.name}\n`;
          }
        });

        // Wait for all file contents to be extracted
        const fileContents = (await Promise.all(fileContentPromises)).filter(Boolean);
        return `${folderContent}\n${fileContents.join("\n\n")}`.trim();
      }

      throw new FileAccessError(`Unsupported file system entry: ${mentionPath}`);
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new FileAccessError(`Failed to access path "${mentionPath}": ${errorMessage}`);
    }
  }

  /**
   * Gets formatted workspace diagnostic problems
   */
  private getWorkspaceProblems(): string {
    const diagnostics = vscode.languages.getDiagnostics();
    const result = diagnosticsMonitor.formatDiagnostics(
      diagnostics,
      [vscode.DiagnosticSeverity.Error, vscode.DiagnosticSeverity.Warning],
      this.cwd
    );
    return result || "No errors or warnings detected.";
  }

  /**
   * Normalizes file paths to use forward slashes
   */
  private normalizePath(filePath: string): string {
    return filePath.split(path.sep).join("/");
  }

  /**
   * Attempts to get content from a file, returns undefined if not possible
   */
  private async tryGetFileContent(absolutePath: string, relativePath: string): Promise<string | undefined> {
    try {
      const isBinary = await isBinaryFile(absolutePath).catch(() => false);
      if (isBinary) {
        return undefined;
      }
      const content = await extractTextFromFile(absolutePath);
      return `<file_content path="${this.normalizePath(relativePath)}">\n${content}\n</file_content>`;
    }
    catch {
      return undefined;
    }
  }

  /**
   * Fetches content for a list of mentions
   */
  public async fetchContent(mentions: Mention[]): Promise<MentionContent[]> {
    const contents: MentionContent[] = [];

    // Fetch content for each mention
    for (const mention of mentions) {
      try {
        const content = await this.fetchSingleMention(mention);
        contents.push(content);
      }
      catch (rawError) {
        const error = rawError instanceof Error ? rawError : new Error(String(rawError));
        contents.push({
          mention,
          content: `Error fetching content: ${error.message}`,
          error
        });
      }
    }

    return contents;
  }
}
