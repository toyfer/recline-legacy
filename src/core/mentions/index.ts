import * as vscode from "vscode";
import { UrlContentFetcher } from "../../services/browser/UrlContentFetcher";
import { MentionParser } from "./MentionParser";
import { MentionContentFetcher } from "./MentionContentFetcher";
import { Mention, MentionType } from "./types";

/**
 * Opens a mention in the appropriate context (file, folder, URL, etc.)
 */
export function openMention(mention?: string): void {
  if (!mention) {
    return;
  }

  // Parse the raw mention to get its structured form
  try {
    const mentions = MentionParser.parseMentions(`@${mention}`);
    if (mentions.length === 0) {
      return;
    }

    const parsedMention = mentions[0];
    switch (parsedMention.type) {
      case MentionType.File:
      case MentionType.Folder:
        openFileSystemMention(parsedMention);
        break;

      case MentionType.Problems:
        vscode.commands.executeCommand("workbench.actions.view.problems");
        break;

      case MentionType.Url:
        vscode.env.openExternal(vscode.Uri.parse(parsedMention.value));
        break;
    }
  } catch (error) {
    console.error(`Failed to open mention: ${error.message}`);
  }
}

/**
 * Opens a file system mention (file or folder)
 */
function openFileSystemMention(mention: Mention): void {
  const cwd = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath)[0];
  if (!cwd) {
    return;
  }

  const absPath = vscode.Uri.file(vscode.Uri.joinPath(vscode.Uri.file(cwd), mention.value).fsPath);

  if (mention.type === MentionType.Folder) {
    vscode.commands.executeCommand("revealInExplorer", absPath);
  } else {
    vscode.commands.executeCommand("vscode.open", absPath);
  }
}

/**
 * Parses mentions in text and fetches their content
 */
export async function parseMentions(text: string, cwd: string, urlContentFetcher: UrlContentFetcher): Promise<string> {
  // Parse all mentions from text
  const mentions = MentionParser.parseMentions(text);
  if (mentions.length === 0) {
    return text;
  }

  // Replace mentions with readable labels
  let parsedText = MentionParser.replaceMentionsWithLabels(text);

  // Fetch content for all mentions
  const contentFetcher = new MentionContentFetcher(cwd, urlContentFetcher);
  const contents = await contentFetcher.fetchContent(mentions);

  // Append each mention's content
  for (const { mention, content } of contents) {
    switch (mention.type) {
      case MentionType.Url:
        parsedText += `\n\n<url_content url="${mention.value}">\n${content}\n</url_content>`;
        break;

      case MentionType.File:
        parsedText += `\n\n<file_content path="${mention.value}">\n${content}\n</file_content>`;
        break;

      case MentionType.Folder:
        parsedText += `\n\n<folder_content path="${mention.value}">\n${content}\n</folder_content>`;
        break;

      case MentionType.Problems:
        parsedText += `\n\n<workspace_diagnostics>\n${content}\n</workspace_diagnostics>`;
        break;
    }
  }

  return parsedText;
}
