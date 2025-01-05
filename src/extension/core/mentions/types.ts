/**
 * Types of mentions supported by the system
 */
export enum MentionType {
  File = "file",
  Folder = "folder",
  Problems = "problems",
  Url = "url"
}

/**
 * Represents a parsed mention
 */
export interface Mention {
  type: MentionType;
  value: string;
  raw: string;
}

/**
 * Content fetched for a mention
 */
export interface MentionContent {
  mention: Mention;
  content: string;
  error?: Error;
}

/**
 * Result of parsing and fetching mention content
 */
export interface ParsedMentionsResult {
  text: string;
  mentions: MentionContent[];
}

/**
 * Custom error types for mention handling
 */
export class MentionError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "MentionError";
  }
}

export class FileAccessError extends MentionError {
  constructor(message: string) {
    super(message, "FILE_ACCESS_ERROR");
  }
}

export class UrlFetchError extends MentionError {
  constructor(message: string) {
    super(message, "URL_FETCH_ERROR");
  }
}

export class InvalidMentionError extends MentionError {
  constructor(message: string) {
    super(message, "INVALID_MENTION");
  }
}
