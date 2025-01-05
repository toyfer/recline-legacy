/**
 * Utility functions for sanitizing user input
 */

/**
 * Removes control characters and non-printable characters from text
 * while preserving newlines
 */
export function sanitizeUserInput(text: string): string {
  return text
    .replace(/\r\n/g, "\n") // Normalize line endings
    .replace(/[\x00-\x09\x0B-\x1F\x7F-\uFFFF]/g, "") // Remove control chars except newline
    .replace(/[^\x20-\x7E\n]/g, "") // Remove non-ASCII chars except newline
    .trim();
}

/**
 * Removes any shell prompt artifacts from terminal output
 */
export function sanitizeTerminalOutput(text: string): string {
  return text
    .replace(/\r/g, "") // Remove standalone CR
    .replace(/[%$#>]\s*$/, "") // Remove shell prompts
    .replace(/[\x00-\x09\x0B-\x1F\x7F-\uFFFF]/g, "") // Remove control chars
    .trim();
}
