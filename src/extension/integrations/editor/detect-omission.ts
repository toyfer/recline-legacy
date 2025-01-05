import * as vscode from "vscode";


// Pre-compile patterns for better performance
const COMMENT_PATTERNS = [
  /^\s*\/\//, // Single-line comment for most languages
  /^\s*#/, // Single-line comment for Python, Ruby, etc.
  /^\s*\/\*/, // Multi-line comment opening
  /^\s*\*\//, // Multi-line comment closing
  /^\s*\*/, // Multi-line comment continuation
  /^\s*\{\s*\/\*/, // JSX comment opening
  /^\s*<!--/, // HTML comment opening
  /^\s*-->/ // HTML comment closing
];

// Extended set of keywords that might indicate code omissions
const OMISSION_KEYWORDS = new Set([
  "remain",
  "remains",
  "unchanged",
  "rest",
  "previous",
  "existing",
  "continue",
  "continues",
  "same",
  "before",
  "original",
  "skip",
  "omit",
  "etc",
  "...",
  "…" // Unicode ellipsis
]);

/**
 * Detects potential AI-generated code omissions in the given file content.
 * @param originalFileContent The original content of the file.
 * @param newFileContent The new content of the file to check.
 * @returns True if a potential omission is detected, false otherwise.
 */
function detectCodeOmission(originalFileContent: string, newFileContent: string): boolean {
  const originalLines = new Set(originalFileContent.split("\n"));
  let inMultilineComment = false;

  for (const line of newFileContent.split("\n")) {
    const trimmedLine = line.trim();
    const lineLC = line.toLowerCase();

    // Handle multi-line comment state
    if (trimmedLine.includes("/*")) {
      inMultilineComment = true;
    }
    if (trimmedLine.includes("*/")) {
      inMultilineComment = false;
    }

    // Skip empty lines or lines that exactly match the original
    if (!trimmedLine || originalLines.has(line)) {
      continue;
    }

    // Check if this line is a comment
    const isComment
			= inMultilineComment || COMMENT_PATTERNS.some(pattern => pattern.test(line));

    if (isComment) {
      // Split into words and check for omission keywords
      const words = lineLC.split(/[\s,.;:\-_]+/);
      if (words.some(word => OMISSION_KEYWORDS.has(word))) {
        return true;
      }

      // Check for phrases like "code continues" or "rest of implementation"
      if (/(?:code|implementation|function|method|class)\s+(?:continue|remain)s?/.test(lineLC)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Shows a warning in VSCode if a potential code omission is detected.
 * @param originalFileContent The original content of the file.
 * @param newFileContent The new content of the file to check.
 */
export function showOmissionWarning(originalFileContent: string, newFileContent: string): void {
  if (!originalFileContent || !newFileContent) {
    return;
  }

  if (detectCodeOmission(originalFileContent, newFileContent)) {
    vscode.window
      .showWarningMessage(
        "Potential code truncation detected. This happens when the AI reaches its max output limit.",
        "Follow this guide to fix the issue"
      )
      .then((selection) => {
        if (selection === "Follow this guide to fix the issue") {
          vscode.env.openExternal(
            vscode.Uri.parse(
              "https://github.com/recline/recline/wiki/Troubleshooting-%E2%80%90-Recline-Deleting-Code-with-%22Rest-of-Code-Here%22-Comments"
            )
          );
        }
      });
  }
}
