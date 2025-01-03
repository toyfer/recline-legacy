import * as vscode from "vscode";
import * as path from "path";
import { isBinaryFile } from "isbinaryfile";
import { extractTextFromFile } from "../../integrations/misc/extract-text";
import fs from "fs/promises";
import { UrlContentFetcher } from "../../services/browser/UrlContentFetcher";
import { Mention, MentionContent, MentionType, FileAccessError, UrlFetchError } from "./types";
import diagnosticsMonitor from "../../integrations/diagnostics";

export class MentionContentFetcher {
  constructor(
    private readonly cwd: string,
    private readonly urlContentFetcher: UrlContentFetcher
  ) {}

  /**
   * Fetches content for a list of mentions
   */
  public async fetchContent(mentions: Mention[]): Promise<MentionContent[]> {
    const contents: MentionContent[] = [];
    let browserLaunched = false;

    try {
      // Pre-launch browser if we have any URL mentions
      if (mentions.some(m => m.type === MentionType.Url)) {
        await this.urlContentFetcher.launchBrowser();
        browserLaunched = true;
      }

      // Fetch content for each mention
      for (const mention of mentions) {
        try {
          const content = await this.fetchSingleMention(mention);
          contents.push(content);
        } catch (error) {
          contents.push({
            mention,
            content: `Error fetching content: ${error.message}`,
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    } finally {
      // Ensure browser is closed if it was launched
      if (browserLaunched) {
        try {
          await this.urlContentFetcher.closeBrowser();
        } catch (error) {
          console.error(`Error closing browser: ${error.message}`);
        }
      }
    }

    return contents;
  }

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
          const markdown = await this.urlContentFetcher.urlToMarkdown(mention.value);
          return { mention, content: markdown };
        } catch (error) {
          throw new UrlFetchError(`Failed to fetch URL content: ${error.message}`);
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
          } else if (entry.isDirectory()) {
            folderContent += `${linePrefix}${entry.name}/\n`;
          } else {
            folderContent += `${linePrefix}${entry.name}\n`;
          }
        });

        // Wait for all file contents to be extracted
        const fileContents = (await Promise.all(fileContentPromises)).filter(Boolean);
        return `${folderContent}\n${fileContents.join("\n\n")}`.trim();
      }

      throw new FileAccessError(`Unsupported file system entry: ${mentionPath}`);
    } catch (error) {
      throw new FileAccessError(`Failed to access path "${mentionPath}": ${error.message}`);
    }
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
    } catch {
      return undefined;
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
    return filePath.split(path.sep).join('/');
  }
}
